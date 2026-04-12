import * as fs from "fs";
import * as path from "path";
import type { VideoAspectRatio } from "@/lib/channel-styles/types";
import {
  truncateImagePrompt,
  truncateStyleReferencePromptParts,
} from "./sanitize-image-prompt";

/** Gemini 3.1 Flash Image allows up to 14 reference images. */
const MAX_REFERENCE_IMAGES = 14;

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

function mimeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function buildReferenceImagePrompt(
  transcriptContext: string,
  imageDescription: string,
  videoAspectRatio: VideoAspectRatio,
): string {
  const safety =
    `No text overlays, captions, watermarks, or logos. No graphic violence or gore. The output image is ${videoAspectRatio}: compose full-bleed artwork that reaches all four edges—no letterboxing, pillarboxing, black bars, matte strips, or empty margins inside the frame.`;

  const instruction = `Study the reference image(s) carefully. Your output must match their art style as closely as possible: same line work, brush or flat treatment, color choices, contrast, and level of stylization — avoid any generic stock illustration or unrelated aesthetic. Create exactly one new frame in that same style (new subject matter, same visual language). The new scene must match the transcription context below.`;

  const fixedPrefix = `${safety}

${instruction}

Transcription (narration for this scene):`;

  const narration =
    transcriptContext.trim() || "(No narration line provided for this beat.)";

  const visual = `What the new scene should show (visual direction for this moment, aligned with that transcription):

${imageDescription.trim()}`;

  return truncateStyleReferencePromptParts(fixedPrefix, narration, visual);
}

function basicImagePromptPrefix(videoAspectRatio: VideoAspectRatio): string {
  return `Single illustration frame for a short video (${videoAspectRatio}). No text, captions, watermarks, or logos. No graphic violence or gore. Fill the entire ${videoAspectRatio} canvas edge-to-edge with the scene—no letterboxing, pillarboxing, black bars, matte strips, or unused borders.\n\n`;
}

function extractImageBase64FromResponse(data: unknown): string | null {
  const root = data as {
    candidates?: Array<{
      content?: { parts?: Array<Record<string, unknown>> };
    }>;
  };
  const parts = root.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  for (const part of parts) {
    const inline =
      (part.inlineData as { data?: string } | undefined) ??
      (part.inline_data as { data?: string } | undefined);
    if (inline?.data && typeof inline.data === "string" && inline.data.length > 0) {
      return inline.data;
    }
  }
  return null;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Nano Banana 2 (Gemini 3.1 Flash Image): reference-conditioned or text-only scene generation.
 */
export async function generateImageWithGemini(options: {
  apiKey: string;
  referenceImagePaths: string[];
  transcriptContext: string;
  imageDescription: string;
  outputPath: string;
  videoAspectRatio: VideoAspectRatio;
}): Promise<void> {
  const {
    apiKey,
    referenceImagePaths,
    transcriptContext,
    imageDescription,
    outputPath,
    videoAspectRatio,
  } = options;

  const paths = referenceImagePaths.slice(0, MAX_REFERENCE_IMAGES);

  const fullText =
    paths.length > 0
      ? buildReferenceImagePrompt(
          transcriptContext,
          imageDescription,
          videoAspectRatio,
        )
      : truncateImagePrompt(
          `${basicImagePromptPrefix(videoAspectRatio)}${imageDescription.trim()}`,
        );

  const parts: GeminiPart[] = [{ text: fullText }];

  for (const refPath of paths) {
    const buf = fs.readFileSync(refPath);
    const mime = mimeForPath(refPath);
    parts.push({
      inlineData: {
        mimeType: mime,
        data: buf.toString("base64"),
      },
    });
  }

  const body = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: videoAspectRatio,
        imageSize: "2K",
      },
    },
  };

  const res = await fetch(GEMINI_GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini image generation error: ${res.status} ${errText}`);
  }

  const json = (await res.json()) as unknown;
  const b64 = extractImageBase64FromResponse(json);
  if (!b64) {
    throw new Error(
      "Gemini image generation: no image data in response (check candidates/parts)",
    );
  }

  const out = Buffer.from(b64, "base64");
  fs.writeFileSync(outputPath, new Uint8Array(out));
}
