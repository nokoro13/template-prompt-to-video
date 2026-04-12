/**
 * Shared story generation pipeline (used by CLI and Next.js API).
 */
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  buildSyntheticCharacterAlignment,
  computeSyntheticSceneDurationSeconds,
  copySilencePlaceholderAudio,
  generateAiImage,
  generateVoice,
  getGenerateImageDescriptionPrompt,
  getGenerateStoryPrompt,
  openaiStructuredCompletion,
  setApiKey,
  setGeminiApiKey,
} from "../cli/service";
import {
  analyzeReferenceTranscript,
  buildScriptClonePrompt,
} from "./generation/format-cloner";
import {
  getStyle,
  readTranscriptFile,
  resolveStyleImagePaths,
} from "./storage/styles";
import {
  ContentItemWithDetails,
  StoryMetadataWithDetails,
  StoryScript,
  StoryWithImages,
  Timeline,
} from "../src/lib/types";
import { createTimeLineFromStoryWithDetails } from "../cli/timeline";

export type GenerateProgress =
  | { stage: "story" }
  | { stage: "descriptions" }
  | { stage: "assets"; current: number; total: number; phase: "image" | "voice" };

export interface RunSimpleGenerateOptions {
  title: string;
  topic: string;
  openaiApiKey: string;
  /** Google Gemini API key (Nano Banana) for scene image generation. */
  geminiApiKey: string;
  /** Required unless `skipVoice` is true. */
  elevenlabsApiKey?: string;
  /** When true, uses silent placeholder audio and synthetic timings (no ElevenLabs). */
  skipVoice?: boolean;
  /** Optional saved channel style (reference transcript + images). */
  styleId?: string;
  onProgress?: (p: GenerateProgress) => void;
}

class ContentFS {
  title: string;
  slug: string;

  constructor(title: string) {
    this.title = title;
    this.slug = this.getSlug();
  }

  saveDescriptor(descriptor: StoryMetadataWithDetails) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "descriptor.json");
    fs.writeFileSync(filePath, JSON.stringify(descriptor, null, 2));
  }

  saveTimeline(timeline: Timeline) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "timeline.json");
    fs.writeFileSync(filePath, JSON.stringify(timeline, null, 2));
  }

  getDir(dir?: string): string {
    const segments = ["public", "content", this.slug];
    if (dir) {
      segments.push(dir);
    }
    const p = path.join(process.cwd(), ...segments);
    fs.mkdirSync(p, { recursive: true });
    return p;
  }

  getImagePath(uid: string): string {
    const dirPath = this.getDir("images");
    return path.join(dirPath, `${uid}.png`);
  }

  getAudioPath(uid: string): string {
    const dirPath = this.getDir("audio");
    return path.join(dirPath, `${uid}.mp3`);
  }

  getSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

export async function runSimpleGenerate(
  options: RunSimpleGenerateOptions,
): Promise<{ slug: string; shortTitle: string }> {
  const {
    title,
    topic,
    openaiApiKey,
    geminiApiKey,
    elevenlabsApiKey = "",
    skipVoice = false,
    styleId,
    onProgress,
  } = options;

  if (!skipVoice && !elevenlabsApiKey) {
    throw new Error("ElevenLabs API key is required unless skipVoice is enabled");
  }

  if (!geminiApiKey?.trim()) {
    throw new Error(
      "NANO_BANANA_API_KEY (Google Gemini) is required for image generation",
    );
  }

  setApiKey(openaiApiKey);
  setGeminiApiKey(geminiApiKey);

  const style = styleId ? getStyle(styleId) : null;
  if (styleId && !style) {
    throw new Error(`Unknown style: ${styleId}`);
  }

  let referenceTranscript = "";
  if (style?.references.transcripts.length) {
    const first = style.references.transcripts[0];
    referenceTranscript = readTranscriptFile(first.path);
  } else if (style) {
    throw new Error("Selected style has no reference transcripts");
  }

  const storyWithDetails: StoryMetadataWithDetails = {
    shortTitle: title,
    content: [],
  };

  onProgress?.({ stage: "story" });
  let extractedFormat = style?.extractedFormat;
  if (style && referenceTranscript && !extractedFormat) {
    extractedFormat = await analyzeReferenceTranscript(
      referenceTranscript,
      openaiApiKey,
    );
  }

  const storyPrompt =
    style && extractedFormat && referenceTranscript
      ? buildScriptClonePrompt(
          title,
          topic,
          referenceTranscript,
          extractedFormat,
          style.targetTranscriptWordCount !== undefined
            ? { targetWordCount: style.targetTranscriptWordCount }
            : undefined,
        )
      : getGenerateStoryPrompt(title, topic);

  const storyRes = await openaiStructuredCompletion(storyPrompt, StoryScript);

  onProgress?.({ stage: "descriptions" });
  const hasRefImages = Boolean(style && style.references.images.length > 0);
  const styleVisualNotes = hasRefImages
    ? `Channel "${style!.name}". Separate reference images define the look — your imageDescription must only describe story content (see rules below).`
    : undefined;

  const storyWithImagesRes = await openaiStructuredCompletion(
    getGenerateImageDescriptionPrompt(storyRes.text, {
      styleVisualNotes,
      omitArtStyleInDescriptions: hasRefImages,
    }),
    StoryWithImages,
  );

  for (const item of storyWithImagesRes.result) {
    const contentWithDetails: ContentItemWithDetails = {
      text: item.text,
      imageDescription: item.imageDescription,
      uid: uuidv4(),
      audioTimestamps: {
        characters: [],
        characterStartTimesSeconds: [],
        characterEndTimesSeconds: [],
      },
    };
    storyWithDetails.content.push(contentWithDetails);
  }

  const contentFs = new ContentFS(title);
  contentFs.saveDescriptor(storyWithDetails);

  const referenceImagePaths: string[] | undefined = (() => {
    if (!style || style.references.images.length === 0) return undefined;
    const resolved = resolveStyleImagePaths(style);
    const existing = resolved.filter((p) => fs.existsSync(p));
    if (existing.length === 0) {
      throw new Error(
        `Style "${style.name}" lists reference images, but no files were found on disk under public/. Re-upload references or fix paths in the style.`,
      );
    }
    return existing;
  })();

  const total = storyWithDetails.content.length;
  for (let i = 0; i < total; i++) {
    const storyItem = storyWithDetails.content[i];
    onProgress?.({
      stage: "assets",
      current: i + 1,
      total,
      phase: "image",
    });
    await generateAiImage({
      prompt: storyItem.imageDescription,
      transcriptContext: storyItem.text,
      path: contentFs.getImagePath(storyItem.uid),
      onRetry: () => {},
      referenceImagePaths,
      videoAspectRatio: style
        ? (style.videoAspectRatio ?? "9:16")
        : undefined,
    });
    onProgress?.({
      stage: "assets",
      current: i + 1,
      total,
      phase: "voice",
    });
    if (skipVoice) {
      copySilencePlaceholderAudio(contentFs.getAudioPath(storyItem.uid));
      const durationSeconds = computeSyntheticSceneDurationSeconds(
        storyItem.text,
      );
      storyItem.audioTimestamps = buildSyntheticCharacterAlignment(
        storyItem.text,
        durationSeconds,
      );
    } else {
      const timings = await generateVoice(
        storyItem.text,
        elevenlabsApiKey,
        contentFs.getAudioPath(storyItem.uid),
      );
      storyItem.audioTimestamps = timings;
    }
  }

  contentFs.saveDescriptor(storyWithDetails);

  const timeline = createTimeLineFromStoryWithDetails(storyWithDetails);
  contentFs.saveTimeline(timeline);

  return { slug: contentFs.slug, shortTitle: title };
}
