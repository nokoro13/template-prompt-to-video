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
import { getProjectForUser, insertProject, updateProject } from "./db/projects";
import { isDatabaseStorageEnabled } from "./storage/constants";
import {
  putProjectFile,
  putProjectJson,
  readProjectJson,
} from "./storage/project-storage";
import { resolveAspectRatioFromStyle } from "./project/video-aspect-ratio";
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
  /** Clerk user id — required for DB/R2 persistence in production. */
  userId?: string;
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

export async function loadDescriptorBySlug(
  slug: string,
  userId?: string,
): Promise<StoryMetadataWithDetails> {
  if (isDatabaseStorageEnabled() && userId) {
    const fromStore = await readProjectJson<StoryMetadataWithDetails>(
      userId,
      slug,
      "descriptor.json",
    );
    if (fromStore) return fromStore;
  }

  const filePath = path.join(getContentProjectDir(slug), "descriptor.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`No project found for slug "${slug}" (missing descriptor.json)`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as StoryMetadataWithDetails;
}

export async function saveDescriptorBySlug(
  slug: string,
  descriptor: StoryMetadataWithDetails,
  userId?: string,
): Promise<void> {
  const dir = getContentProjectDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "descriptor.json"),
    JSON.stringify(descriptor, null, 2),
  );

  if (isDatabaseStorageEnabled() && userId) {
    await putProjectJson(userId, slug, "descriptor.json", descriptor);
    await updateProject(userId, slug, { title: descriptor.shortTitle });
  }
}

export async function saveTimelineBySlug(
  slug: string,
  timeline: Timeline,
  userId?: string,
): Promise<void> {
  const dir = getContentProjectDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "timeline.json"),
    JSON.stringify(timeline, null, 2),
  );

  if (isDatabaseStorageEnabled() && userId) {
    await putProjectJson(userId, slug, "timeline.json", timeline);
    await updateProject(userId, slug, { status: "ready" });
  }
}

async function syncLocalProjectFile(
  userId: string | undefined,
  slug: string,
  relativePath: string,
  localPath: string,
): Promise<void> {
  if (!isDatabaseStorageEnabled() || !userId || !fs.existsSync(localPath)) return;
  await putProjectFile(userId, slug, relativePath, fs.readFileSync(localPath));
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
  userId?: string;

  constructor(title: string, userId?: string) {
    this.title = title;
    this.userId = userId;
    this.slug = this.getSlug();
  }

  async saveDescriptor(descriptor: StoryMetadataWithDetails) {
    await saveDescriptorBySlug(this.slug, descriptor, this.userId);
  }

  async saveTimeline(timeline: Timeline) {
    await saveTimelineBySlug(this.slug, timeline, this.userId);
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
  const { title, topic, openaiApiKey, styleId, useWebSearch, onProgress, userId } =
    options;

  setApiKey(openaiApiKey);

  const style = styleId ? await getStyle(styleId, userId) : null;
  if (styleId && !style) {
    throw new Error(`Unknown style: ${styleId}`);
  }

  let referenceTranscript = "";
  if (style?.references.transcripts.length) {
    const first = style.references.transcripts[0];
    referenceTranscript = await readTranscriptFile(first.path, userId, styleId);
  } else if (style) {
    throw new Error("Selected style has no reference transcripts");
  }

  const storyWithDetails: StoryMetadataWithDetails = {
    shortTitle: title,
    content: [],
    videoAspectRatio: resolveAspectRatioFromStyle(style),
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

  const contentFs = new ContentFS(title, userId);
  if (isDatabaseStorageEnabled() && userId) {
    const existing = await getProjectForUser(userId, contentFs.slug);
    if (!existing) {
      await insertProject({
        userId,
        slug: contentFs.slug,
        title,
        styleId,
        status: "generating",
      });
    } else {
      await updateProject(userId, contentFs.slug, {
        title,
        styleId: styleId ?? null,
        status: "generating",
      });
    }
  }
  await contentFs.saveDescriptor(storyWithDetails);

  return { slug: contentFs.slug, shortTitle: title };
}

export type GenerateVoicePhaseOptions = {
  slug: string;
  userId?: string;
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
  const { slug, userId, elevenlabsApiKey = "", skipVoice = false, voiceId } = options;
  const resolvedVoiceId =
    voiceId?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  if (!skipVoice && !elevenlabsApiKey.trim()) {
    throw new Error("ElevenLabs API key is required unless skipVoice is enabled");
  }

  const storyWithDetails = await loadDescriptorBySlug(slug, userId);
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
    await syncLocalProjectFile(
      userId,
      slug,
      `audio/${storyItem.uid}.mp3`,
      getAudioPathForSlug(slug, storyItem.uid),
    );
  }

  await saveDescriptorBySlug(slug, storyWithDetails, userId);
}

export type GenerateImagesPhaseOptions = {
  slug: string;
  userId?: string;
  geminiApiKey: string;
  /** 0-based scene index, or omit / null for all scenes. */
  sceneIndex?: number | null;
  imageSize?: GeminiImageSize;
  onProgress?: (current: number, total: number) => void;
};

function styleCharacterNamesForConsistency(
  style: Awaited<ReturnType<typeof getStyle>>,
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
  userId?: string,
): Promise<void> {
  const content = storyWithDetails.content;
  const styleId = storyWithDetails.channelStyleId;
  const style = styleId ? await getStyle(styleId, userId) : null;
  const videoAspectRatio =
    storyWithDetails.videoAspectRatio ?? resolveAspectRatioFromStyle(style);
  if (!storyWithDetails.videoAspectRatio) {
    storyWithDetails.videoAspectRatio = videoAspectRatio;
  }

  const analysis = analyzeSceneEntities(
    content,
    styleCharacterNamesForConsistency(style),
  );
  const resetConsistency =
    indices.length === content.length && content.length > 0;
  const state = createEmptyConsistencyState(
    resetConsistency ? null : storyWithDetails.consistencyData,
  );

  const refBundle = await resolveGeminiReferencePathsForStyle(styleId, userId);
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
      videoAspectRatio,
      imageSize,
      consistencyBlock,
    });
    recordFirstAppearances(i, storyItem, sceneInfo, state);
    storyWithDetails.consistencyData = state.data;
    await syncLocalProjectFile(
      userId,
      slug,
      `images/${storyItem.uid}.png`,
      getImagePathForSlug(slug, storyItem.uid),
    );
    await saveDescriptorBySlug(slug, storyWithDetails, userId);
  }
}

/**
 * Step 4: Gemini scene images. Updates files on disk; writes `consistencyData` on the descriptor.
 */
export async function generateImagesPhase(
  options: GenerateImagesPhaseOptions,
): Promise<void> {
  const { slug, userId, geminiApiKey, sceneIndex, imageSize, onProgress } = options;

  if (!geminiApiKey?.trim()) {
    throw new Error(
      "NANO_BANANA_API_KEY (Google Gemini) is required for image generation",
    );
  }

  setGeminiApiKey(geminiApiKey);

  const storyWithDetails = await loadDescriptorBySlug(slug, userId);
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
    userId,
  );
}

/**
 * Step 5: Build `timeline.json` from descriptor (requires voice data on each scene).
 */
export async function finalizeTimelinePhase(
  slug: string,
  userId?: string,
): Promise<void> {
  const storyWithDetails = await loadDescriptorBySlug(slug, userId);
  for (const item of storyWithDetails.content) {
    const ends = item.audioTimestamps.characterEndTimesSeconds;
    if (!ends?.length) {
      throw new Error(
        "Voice step not complete — characterEndTimesSeconds missing for a scene",
      );
    }
  }
  const timeline = createTimeLineFromStoryWithDetails(storyWithDetails);
  await saveTimelineBySlug(slug, timeline, userId);
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
    userId: options.userId,
    useWebSearch: options.useWebSearch,
    onProgress,
  });

  const storyWithDetails = await loadDescriptorBySlug(slug, options.userId);
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
    await syncLocalProjectFile(
      options.userId,
      slug,
      `audio/${storyItem.uid}.mp3`,
      getAudioPathForSlug(slug, storyItem.uid),
    );
  }
  await saveDescriptorBySlug(slug, storyWithDetails, options.userId);

  const refreshed = await loadDescriptorBySlug(slug, options.userId);
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
    options.userId,
  );

  await saveDescriptorBySlug(slug, refreshed, options.userId);
  await finalizeTimelinePhase(slug, options.userId);

  return { slug, shortTitle };
}
