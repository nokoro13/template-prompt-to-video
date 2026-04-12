import z from "zod";
import * as fs from "fs";
import * as path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api";
import type { VideoAspectRatio } from "../lib/channel-styles/types";
import { generateImageWithGemini } from "../lib/generation/generate-with-gemini";

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
  transcriptContext,
  videoAspectRatio,
}: {
  prompt: string;
  path: string;
  onRetry: (attempt: number) => void;
  /** When non-empty paths exist on disk, Gemini uses them as style references (up to 14). */
  referenceImagePaths?: string[];
  /** Narration for this scene — paired with `prompt` when using style references. */
  transcriptContext?: string;
  /** From channel style: portrait 9:16 vs landscape 16:9 for Gemini image output. */
  videoAspectRatio?: VideoAspectRatio;
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
      "Style reference images were configured but no image files were found on disk. Check paths under public/channel-styles/.",
    );
  }

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
  /** Extra instructions when channel style reference images exist. */
  styleVisualNotes?: string;
  /**
   * When true, imageDescription must describe only subject/action/framing — not art style.
   * Use when reference images define the look (avoids generic “illustration” language fighting the style model).
   */
  omitArtStyleInDescriptions?: boolean;
};

export const getGenerateImageDescriptionPrompt = (
  storyText: string,
  options?: ImageDescriptionPromptOptions,
) => {
  const styleBlock = options?.styleVisualNotes
    ? `
Channel context:
${options.styleVisualNotes}
`
    : "";

  const noStyleBlock = options?.omitArtStyleInDescriptions
    ? `
CRITICAL — reference images (not you) define the art style:
- In each "imageDescription", describe ONLY what to show: subjects, setting, action, props, and camera/framing (e.g. wide shot, close-up).
- Do NOT name or imply any art style, medium, or rendering (no words like: photorealistic, cinematic, illustration, digital painting, 3D render, vector, comic book, anime, sketch, watercolor, oil painting, glossy, film grain, etc.).
- Do NOT prescribe lighting/mood/color grading as a style — the pipeline copies look from reference images.
`
    : "";

  const prompt = `You are given story text.
  Generate (in English) 5-8 very detailed image descriptions  for this story. 
  Return their description as json array with story sentences matched to images. 
  Story sentences must be in the same order as in the story and their content must be preserved.
  Each image must match 1-2 sentence from the story.
  Images must show story content in a way that is visually appealing and engaging, not just characters.
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
): Promise<CharacterAlignmentResponseModel> => {
  const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
    apiKey,
  });

  const voiceId = "hpp4J3VqNfWAUOO0d1Us";

  const data = await client.textToSpeech.convertWithTimestamps(voiceId, {
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
