import z from "zod";
import * as fs from "fs";
import * as path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api";
import type { VideoAspectRatio } from "../lib/channel-styles/types";
import { DEFAULT_ELEVENLABS_VOICE_ID } from "../lib/elevenlabs/constants";
import {
  generateImageWithGemini,
  parseGeminiImageSize,
  type GeminiImageSize,
  type GeminiReferenceMeta,
  type GeminiResponseModality,
} from "../lib/generation/generate-with-gemini";

export type { GeminiImageSize };

let apiKey: string | null = null;
let geminiApiKey: string | null = null;

export const setApiKey = (key: string) => {
  apiKey = key;
};

export const setGeminiApiKey = (key: string) => {
  geminiApiKey = key;
};

export const openaiStructuredCompletion = async <T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> => {
  const jsonSchema = z.toJSONSchema(schema);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema: {
            type: jsonSchema.type || "object",
            properties: jsonSchema.properties,
            required: jsonSchema.required,
            additionalProperties: jsonSchema.additionalProperties ?? false,
          },
          strict: true,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);

  const data = await res.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content);
  return schema.parse(parsed);
};

export const generateAiImage = async ({
  prompt,
  path,
  onRetry,
  referenceImagePaths,
  referenceMeta,
  transcriptContext,
  videoAspectRatio,
  imageSize,
  responseModalities,
  consistencyBlock,
}: {
  prompt: string;
  path: string;
  onRetry: (attempt: number) => void;
  /** When non-empty paths exist on disk, Gemini uses them as style/character references (up to 14). */
  referenceImagePaths?: string[];
  /** Which images are style vs character refs (order matches `referenceImagePaths`). */
  referenceMeta?: GeminiReferenceMeta;
  /** Narration for this scene — paired with `prompt` when using style references. */
  transcriptContext?: string;
  /** From channel style: portrait 9:16 vs landscape 16:9 for Gemini image output. */
  videoAspectRatio?: VideoAspectRatio;
  /** Default from `GEMINI_IMAGE_SIZE` env (1K) when omitted. */
  imageSize?: GeminiImageSize;
  /** Default `["IMAGE"]` — omit TEXT if you do not use model text output. */
  responseModalities?: GeminiResponseModality[];
  /** Prior-scene character/location lines for visual continuity. */
  consistencyBlock?: string;
}) => {
  if (!geminiApiKey) {
    throw new Error(
      "Google Gemini API key is not set (NANO_BANANA_API_KEY / setGeminiApiKey)",
    );
  }

  const existingRefs =
    referenceImagePaths?.filter((p) => fs.existsSync(p)) ?? [];

  const stylePathsRequested = (referenceImagePaths?.length ?? 0) > 0;

  if (stylePathsRequested && existingRefs.length === 0) {
    throw new Error(
      "Reference images were configured but no image files were found on disk. Check paths under public/channel-styles/.",
    );
  }

  const resolvedImageSize =
    imageSize ?? parseGeminiImageSize(process.env.GEMINI_IMAGE_SIZE);
  const resolvedModalities = responseModalities ?? ["IMAGE"];

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await generateImageWithGemini({
        apiKey: geminiApiKey,
        referenceImagePaths: existingRefs,
        transcriptContext: transcriptContext ?? "",
        imageDescription: prompt,
        outputPath: path,
        videoAspectRatio: videoAspectRatio ?? "9:16",
        imageSize: resolvedImageSize,
        responseModalities: resolvedModalities,
        referenceMeta,
        consistencyBlock,
      });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(
        `[generateAiImage] Gemini image generation failed (attempt ${i + 1}/${maxAttempts}):`,
        lastError.message,
      );
      onRetry(i + 1);
      if (i < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
  }

  throw lastError ?? new Error("Gemini image generation failed after retries");
};

export const getGenerateStoryPrompt = (title: string, topic: string) => {
  const prompt = `Write a short story with title [${title}] (its topic is [${topic}]).
   You must follow best practices for great storytelling. 
   The script must be 8-10 sentences long. 
   Story events can be from anywhere in the world, but text must be translated into English language. 
   Result result without any formatting and title, as one continuous text. 
   Skip new lines.`;

  return prompt;
};

export type ImageDescriptionPromptOptions = {
  /** Extra instructions when channel **style** reference images (art look) exist. */
  styleVisualNotes?: string;
  /**
   * When true, imageDescription must describe only subject/action/framing — not art style.
   * Use when style reference images define rendering (avoids generic “illustration” language fighting the style model).
   */
  omitArtStyleInDescriptions?: boolean;
};

/** Hard cap so the JSON response stays bounded; splits should be story-driven, not padded to this number. */
const MAX_SCENE_PROMPT_ITEMS = 70;

function countStoryWords(storyText: string): number {
  return storyText.trim().split(/\s+/).filter(Boolean).length;
}

export const getGenerateImageDescriptionPrompt = (
  storyText: string,
  options?: ImageDescriptionPromptOptions,
) => {
  const wordCount = countStoryWords(storyText);

  const styleBlock = options?.styleVisualNotes
    ? `
Channel context:
${options.styleVisualNotes}
`
    : "";

  const noStyleBlock = options?.omitArtStyleInDescriptions
    ? `
CRITICAL — the channel's **style reference images** (not you) define **art style only** (how frames are rendered). They do not define scene content; never assume subjects or layout from them.
- In each "imageDescription", describe ONLY what to show for this beat: subjects, setting, action, props, and camera/framing (e.g. wide shot, close-up).
- Do NOT name or imply any art style, medium, or rendering (no words like: photorealistic, cinematic, illustration, digital painting, 3D render, vector, comic book, anime, sketch, watercolor, oil painting, glossy, film grain, etc.).
- Do NOT prescribe lighting/mood/color grading as a style — the image pipeline copies look from those style reference images.
`
    : "";

  const prompt = `You are given full story narration text (${wordCount} words).

Your job: split the ENTIRE story into scenes for a video. Return a JSON array where each item has "text" (the exact narration lines for that scene, copied verbatim from the story) and "imageDescription" (a detailed visual description for that beat).

HOW TO CHOOSE SCENE BOUNDARIES (narrative logic — not word counts):
- Split when the story moves: new beat, change of time or place, shift in action, a reveal or turn, or a clear emotional / tonal shift that would call for a different shot.
- Start a new scene when a reasonable viewer would expect the on-screen image to change (new framing, new focus, new characters or props in play).
- Keep beats together when they are one continuous moment or thought; do not split mid-sentence or mid-idea just to add cuts.
- Do not target a fixed number of words per scene. Short scripts may have few scenes; dense, eventful scripts may have many.
- Cover the full story through the final sentence — do not stop early, summarize, or drop the ending.

SCENE SIZE LIMITS:
- Each scene's "text" must be 40 words or fewer. Split aggressively at sentence boundaries.
- If the story is long, prefer more short scenes over fewer long scenes.

IMAGE DESCRIPTION RULES:
- Each "imageDescription" must describe ONE static frame — a single moment, single camera angle.
- Do NOT write descriptions that combine multiple events (no "first X, then Y", no "montage of", no "panels showing").
- Keep each imageDescription to 60 words or fewer. One action, one framing, one subject focus.

TECHNICAL LIMIT: at most ${MAX_SCENE_PROMPT_ITEMS} scenes total. If the story would need more, merge only adjacent fragments that are truly the same uninterrupted moment (keep wording intact when merging).

RULES:
1. Concatenating every "text" field in array order (with a single space between items) must reproduce the full story wording in order — no omitted paragraphs, no merged-summary replacement.
2. Each "text" is one or more consecutive sentences from the story; keep original order.
3. Each "imageDescription" must match what happens in that scene's "text" only — vivid, specific, visually engaging (not generic stock poses).
4. Write every "imageDescription" in English.
${styleBlock}
${noStyleBlock}
Give output in json format:

[
  {
    "text": "....",
    "imageDescription": "..."
  }
]

<story>
${storyText}
</story>`;

  return prompt;
};

const saveBase64ToMp3 = (data: string, path: string) => {
  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(path, buffer as Uint8Array);
};

export const generateVoice = async (
  text: string,
  apiKey: string,
  path: string,
  voiceId: string = DEFAULT_ELEVENLABS_VOICE_ID,
): Promise<CharacterAlignmentResponseModel> => {
  const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
    apiKey,
  });

  const id = voiceId.trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  const data = await client.textToSpeech.convertWithTimestamps(id, {
    text,
  });

  if (!data.alignment || !data.alignment.characterEndTimesSeconds.length) {
    throw new Error("ElevenLabs response missing timestamps");
  }

  saveBase64ToMp3(data.audioBase64, path);
  return data.alignment;
};

const SILENCE_PLACEHOLDER_MP3 = path.join(
  process.cwd(),
  "cli",
  "assets",
  "silence-placeholder.mp3",
);

/** Copy bundled silent MP3 for scenes when ElevenLabs is skipped. */
export function copySilencePlaceholderAudio(destPath: string): void {
  fs.copyFileSync(SILENCE_PLACEHOLDER_MP3, destPath);
}

/**
 * `createTimeLineFromStoryWithDetails` walks alignment with one extra step after
 * the last word (see cli/timeline.ts), so length is `text.length + 1`.
 */
export function buildSyntheticCharacterAlignment(
  text: string,
  durationSeconds: number,
): CharacterAlignmentResponseModel {
  const n = Math.max(1, text.length + 1);
  const characters: string[] = [];
  const characterStartTimesSeconds: number[] = [];
  const characterEndTimesSeconds: number[] = [];
  for (let i = 0; i < n; i++) {
    const ch = i < text.length ? text[i] : " ";
    characters.push(ch);
    characterStartTimesSeconds.push((i / n) * durationSeconds);
    characterEndTimesSeconds.push(((i + 1) / n) * durationSeconds);
  }
  return {
    characters,
    characterStartTimesSeconds,
    characterEndTimesSeconds,
  };
}

export function computeSyntheticSceneDurationSeconds(text: string): number {
  return Math.min(20, Math.max(2, text.length * 0.065));
}
