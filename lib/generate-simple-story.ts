/**
 * Shared story generation pipeline (used by CLI and Next.js API).
 * Supports full one-shot generation or phased: script → voice → images → timeline.
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
  type GeminiImageSize,
} from "../cli/service";
import {
  analyzeReferenceTranscript,
  buildScriptClonePrompt,
} from "./generation/format-cloner";
import { openaiStructuredCompletionWithWebSearch } from "./generation/openai-responses-web";
import { scriptWebSearchPromptSuffix } from "./generation/script-web-search-prompt";
import { resolveGeminiReferencePathsForStyle } from "./channel-styles/gemini-reference-paths";
import {
  analyzeSceneEntities,
  composeSceneConsistencyBlock,
  createEmptyConsistencyState,
  recordFirstAppearances,
} from "./generation/consistency-tracker";
import { mergeReferencePathsWithPreviousScene } from "./generation/merge-continuity-reference";
import { getStyle, readTranscriptFile } from "./storage/styles";
import {
  ContentItemWithDetails,
  StoryMetadataWithDetails,
  StoryScript,
  StoryWithImages,
  Timeline,
} from "../src/lib/types";
import { createTimeLineFromStoryWithDetails } from "../cli/timeline";
import { DEFAULT_ELEVENLABS_VOICE_ID } from "./elevenlabs/constants";

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
  /** ElevenLabs voice id for TTS (ignored when skipVoice). */
  elevenLabsVoiceId?: string;
  /** Optional saved channel style (reference transcript + images). */
  styleId?: string;
  /** Use OpenAI Responses API + web_search for the main script (slower, tool pricing). */
  useWebSearch?: boolean;
  /** Gemini output size (512, 1K, 2K, 4K). Falls back to `GEMINI_IMAGE_SIZE` env. */
  imageSize?: GeminiImageSize;
  onProgress?: (p: GenerateProgress) => void;
}

export function getContentProjectDir(slug: string): string {
  return path.join(process.cwd(), "public", "content", slug);
}

export function loadDescriptorBySlug(slug: string): StoryMetadataWithDetails {
  const filePath = path.join(getContentProjectDir(slug), "descriptor.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`No project found for slug "${slug}" (missing descriptor.json)`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as StoryMetadataWithDetails;
}

export function saveDescriptorBySlug(
  slug: string,
  descriptor: StoryMetadataWithDetails,
): void {
  const dir = getContentProjectDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "descriptor.json"),
    JSON.stringify(descriptor, null, 2),
  );
}

export function saveTimelineBySlug(slug: string, timeline: Timeline): void {
  const dir = getContentProjectDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "timeline.json"),
    JSON.stringify(timeline, null, 2),
  );
}

function getImagePathForSlug(slug: string, uid: string): string {
  const dir = path.join(getContentProjectDir(slug), "images");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${uid}.png`);
}

function getAudioPathForSlug(slug: string, uid: string): string {
  const dir = path.join(getContentProjectDir(slug), "audio");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${uid}.mp3`);
}

class ContentFS {
  title: string;
  slug: string;

  constructor(title: string) {
    this.title = title;
    this.slug = this.getSlug();
  }

  saveDescriptor(descriptor: StoryMetadataWithDetails) {
    saveDescriptorBySlug(this.slug, descriptor);
  }

  saveTimeline(timeline: Timeline) {
    saveTimelineBySlug(this.slug, timeline);
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
    return getImagePathForSlug(this.slug, uid);
  }

  getAudioPath(uid: string): string {
    return getAudioPathForSlug(this.slug, uid);
  }

  getSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

export type GenerateScriptPhaseOptions = Omit<
  RunSimpleGenerateOptions,
  "geminiApiKey" | "elevenlabsApiKey" | "skipVoice" | "onProgress"
> & {
  geminiApiKey?: string;
  onProgress?: RunSimpleGenerateOptions["onProgress"];
};

/**
 * Step 1–2: OpenAI script + per-scene text & image descriptions. Writes `descriptor.json` only.
 */
export async function generateScriptPhase(
  options: GenerateScriptPhaseOptions,
): Promise<{ slug: string; shortTitle: string }> {
  const { title, topic, openaiApiKey, styleId, useWebSearch, onProgress } =
    options;

  setApiKey(openaiApiKey);

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
    ...(styleId ? { channelStyleId: styleId } : {}),
  };

  onProgress?.({ stage: "story" });
  let extractedFormat = style?.extractedFormat;
  if (style && referenceTranscript && !extractedFormat) {
    extractedFormat = await analyzeReferenceTranscript(
      referenceTranscript,
      openaiApiKey,
    );
  }

  let storyPrompt =
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

  if (useWebSearch) {
    storyPrompt += scriptWebSearchPromptSuffix(title, topic);
  }

  const storyRes = useWebSearch
    ? await openaiStructuredCompletionWithWebSearch(
        openaiApiKey,
        storyPrompt,
        StoryScript,
      )
    : await openaiStructuredCompletion(storyPrompt, StoryScript);

  onProgress?.({ stage: "descriptions" });
  const hasStyleRefImages = Boolean(style && style.references.images.length > 0);
  const styleVisualNotes = hasStyleRefImages
    ? `Channel "${style!.name}". This style's **reference images** (uploaded under the style) define **art style only** (how it is drawn)—not who appears or what the frame looks like. Your imageDescription must only describe story content (see rules below).`
    : undefined;

  const storyWithImagesRes = await openaiStructuredCompletion(
    getGenerateImageDescriptionPrompt(storyRes.text, {
      styleVisualNotes,
      omitArtStyleInDescriptions: hasStyleRefImages,
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

  return { slug: contentFs.slug, shortTitle: title };
}

export type GenerateVoicePhaseOptions = {
  slug: string;
  elevenlabsApiKey?: string;
  skipVoice?: boolean;
  /** ElevenLabs voice id (defaults to ELEVENLABS_DEFAULT_VOICE_ID / built-in default). */
  voiceId?: string;
};

/**
 * Step 3: ElevenLabs (or silent) audio + alignment per scene. Updates `descriptor.json`.
 */
export async function generateVoicePhase(
  options: GenerateVoicePhaseOptions,
): Promise<void> {
  const { slug, elevenlabsApiKey = "", skipVoice = false, voiceId } = options;
  const resolvedVoiceId =
    voiceId?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  if (!skipVoice && !elevenlabsApiKey.trim()) {
    throw new Error("ElevenLabs API key is required unless skipVoice is enabled");
  }

  const storyWithDetails = loadDescriptorBySlug(slug);
  if (!storyWithDetails.content.length) {
    throw new Error("Descriptor has no scenes — run script generation first");
  }

  const total = storyWithDetails.content.length;
  for (let i = 0; i < total; i++) {
    const storyItem = storyWithDetails.content[i];
    if (skipVoice) {
      copySilencePlaceholderAudio(getAudioPathForSlug(slug, storyItem.uid));
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
        getAudioPathForSlug(slug, storyItem.uid),
        resolvedVoiceId,
      );
      storyItem.audioTimestamps = timings;
    }
  }

  saveDescriptorBySlug(slug, storyWithDetails);
}

export type GenerateImagesPhaseOptions = {
  slug: string;
  geminiApiKey: string;
  /** 0-based scene index, or omit / null for all scenes. */
  sceneIndex?: number | null;
  imageSize?: GeminiImageSize;
  onProgress?: (current: number, total: number) => void;
};

function styleCharacterNamesForConsistency(
  style: ReturnType<typeof getStyle>,
): string[] {
  return style?.characters?.map((c) => c.name.trim()).filter(Boolean) ?? [];
}

/**
 * Generates scene images in order, tracking character/location descriptions in
 * `storyWithDetails.consistencyData` and persisting the descriptor after each scene.
 */
async function generateSceneImagesForIndices(
  slug: string,
  storyWithDetails: StoryMetadataWithDetails,
  indices: number[],
  imageSize: GeminiImageSize | undefined,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const content = storyWithDetails.content;
  const styleId = storyWithDetails.channelStyleId;
  const style = styleId ? getStyle(styleId) : null;

  const analysis = analyzeSceneEntities(
    content,
    styleCharacterNamesForConsistency(style),
  );
  const resetConsistency =
    indices.length === content.length && content.length > 0;
  const state = createEmptyConsistencyState(
    resetConsistency ? null : storyWithDetails.consistencyData,
  );

  const refBundle = resolveGeminiReferencePathsForStyle(styleId);
  if (style && style.references.images.length > 0) {
    if (!refBundle || refBundle.styleImageCount === 0) {
      throw new Error(
        `Style lists reference images, but no files were found on disk under public/.`,
      );
    }
  }

  const referenceImagePaths = refBundle?.paths;
  const referenceMeta = refBundle
    ? {
        styleImageCount: refBundle.styleImageCount,
        characterNames: refBundle.characterNames,
      }
    : undefined;

  const sorted = [...indices].sort((a, b) => a - b);
  const total = sorted.length;
  let done = 0;
  for (const i of sorted) {
    const storyItem = content[i];
    if (!storyItem) {
      throw new Error(`Invalid scene index: ${i}`);
    }
    const sceneInfo = analysis.scenes[i];
    if (!sceneInfo) {
      throw new Error(`Missing scene analysis for index ${i}`);
    }
    done += 1;
    onProgress?.(done, total);

    let previousScenePath: string | undefined;
    if (i > 0) {
      const prevItem = content[i - 1];
      if (prevItem) {
        const p = getImagePathForSlug(slug, prevItem.uid);
        if (fs.existsSync(p)) {
          previousScenePath = p;
        }
      }
    }

    const merged = mergeReferencePathsWithPreviousScene(
      referenceImagePaths,
      referenceMeta,
      previousScenePath,
    );

    const consistencyBlock = composeSceneConsistencyBlock(
      i,
      sceneInfo,
      state,
      Boolean(previousScenePath),
    );

    await generateAiImage({
      prompt: storyItem.imageDescription,
      transcriptContext: storyItem.text,
      path: getImagePathForSlug(slug, storyItem.uid),
      onRetry: () => {},
      referenceImagePaths: merged.paths,
      referenceMeta: merged.referenceMeta,
      videoAspectRatio: style
        ? (style.videoAspectRatio ?? "9:16")
        : undefined,
      imageSize,
      consistencyBlock,
    });
    recordFirstAppearances(i, storyItem, sceneInfo, state);
    storyWithDetails.consistencyData = state.data;
    saveDescriptorBySlug(slug, storyWithDetails);
  }
}

/**
 * Step 4: Gemini scene images. Updates files on disk; writes `consistencyData` on the descriptor.
 */
export async function generateImagesPhase(
  options: GenerateImagesPhaseOptions,
): Promise<void> {
  const { slug, geminiApiKey, sceneIndex, imageSize, onProgress } = options;

  if (!geminiApiKey?.trim()) {
    throw new Error(
      "NANO_BANANA_API_KEY (Google Gemini) is required for image generation",
    );
  }

  setGeminiApiKey(geminiApiKey);

  const storyWithDetails = loadDescriptorBySlug(slug);
  if (!storyWithDetails.content.length) {
    throw new Error("Descriptor has no scenes — run script generation first");
  }

  const indices =
    sceneIndex != null && sceneIndex >= 0
      ? [sceneIndex]
      : storyWithDetails.content.map((_, i) => i);

  await generateSceneImagesForIndices(
    slug,
    storyWithDetails,
    indices,
    imageSize,
    onProgress,
  );
}

/**
 * Step 5: Build `timeline.json` from descriptor (requires voice data on each scene).
 */
export function finalizeTimelinePhase(slug: string): void {
  const storyWithDetails = loadDescriptorBySlug(slug);
  for (const item of storyWithDetails.content) {
    const ends = item.audioTimestamps.characterEndTimesSeconds;
    if (!ends?.length) {
      throw new Error(
        "Voice step not complete — characterEndTimesSeconds missing for a scene",
      );
    }
  }
  const timeline = createTimeLineFromStoryWithDetails(storyWithDetails);
  saveTimelineBySlug(slug, timeline);
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
    elevenLabsVoiceId,
    styleId,
    imageSize,
    onProgress,
  } = options;

  const resolvedVoiceId =
    elevenLabsVoiceId?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  if (!skipVoice && !elevenlabsApiKey) {
    throw new Error("ElevenLabs API key is required unless skipVoice is enabled");
  }

  if (!geminiApiKey?.trim()) {
    throw new Error(
      "NANO_BANANA_API_KEY (Google Gemini) is required for image generation",
    );
  }

  setGeminiApiKey(geminiApiKey);

  const { slug, shortTitle } = await generateScriptPhase({
    title,
    topic,
    openaiApiKey,
    styleId,
    useWebSearch: options.useWebSearch,
    onProgress,
  });

  const storyWithDetails = loadDescriptorBySlug(slug);
  const total = storyWithDetails.content.length;

  for (let i = 0; i < total; i++) {
    const storyItem = storyWithDetails.content[i];
    onProgress?.({
      stage: "assets",
      current: i + 1,
      total,
      phase: "voice",
    });
    if (skipVoice) {
      copySilencePlaceholderAudio(getAudioPathForSlug(slug, storyItem.uid));
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
        getAudioPathForSlug(slug, storyItem.uid),
        resolvedVoiceId,
      );
      storyItem.audioTimestamps = timings;
    }
  }
  saveDescriptorBySlug(slug, storyWithDetails);

  const refreshed = loadDescriptorBySlug(slug);
  const imageIndices = refreshed.content.map((_, i) => i);
  await generateSceneImagesForIndices(
    slug,
    refreshed,
    imageIndices,
    imageSize,
    (current, imgTotal) => {
      onProgress?.({
        stage: "assets",
        current,
        total: imgTotal,
        phase: "image",
      });
    },
  );

  saveDescriptorBySlug(slug, refreshed);
  finalizeTimelinePhase(slug);

  return { slug, shortTitle };
}
