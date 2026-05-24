import * as fs from "fs";
import * as path from "path";
import type { VideoAspectRatio } from "@/lib/channel-styles/types";
import {
  truncateImagePrompt,
  truncateStyleReferencePromptParts,
} from "./sanitize-image-prompt";

/** Gemini 3.1 Flash Image allows up to 14 reference images. */
export const MAX_GEMINI_REFERENCE_IMAGES = 14;
const MAX_REFERENCE_IMAGES = MAX_GEMINI_REFERENCE_IMAGES;

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

/** Output resolution for Gemini image generation (see Gemini API ImageConfig). */
export type GeminiImageSize = "512" | "1K" | "2K" | "4K";

export type GeminiResponseModality = "TEXT" | "IMAGE";

export function parseGeminiImageSize(
  raw: string | undefined | null,
): GeminiImageSize {
  const v = raw?.trim();
  if (!v) return "1K";
  if (v === "512") return "512";
  const u = v.toUpperCase();
  if (u === "1K") return "1K";
  if (u === "2K") return "2K";
  if (u === "4K") return "4K";
  return "1K";
}

/** Avoid re-reading and re-encoding the same style reference on every scene. */
const referenceImageInlineCache = new Map<
  string,
  { mime: string; base64: string }
>();

/** Clear cached reference encodings (e.g. long-running server or tests). */
export function clearReferenceImageInlineCache(): void {
  referenceImageInlineCache.clear();
}

function mimeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function getCachedReferenceInlineData(refPath: string): {
  mimeType: string;
  data: string;
} {
  const key = path.resolve(refPath);
  let entry = referenceImageInlineCache.get(key);
  if (!entry) {
    const buf = fs.readFileSync(key);
    const mime = mimeForPath(key);
    entry = { mime, base64: buf.toString("base64") };
    referenceImageInlineCache.set(key, entry);
  }
  return { mimeType: entry.mime, data: entry.base64 };
}

export type GeminiReferenceMeta = {
  /** How many leading reference images are style (art) refs, in order before character refs. */
  styleImageCount: number;
  /** Names for character-likeness refs, in the same order as those images after style refs. */
  characterNames: string[];
  /** Trailing images are previous frame(s) from this video (continuity), after style + character refs. */
  continuityImageCount?: number;
};

function clampReferenceMeta(
  pathsLen: number,
  meta: GeminiReferenceMeta | undefined,
): GeminiReferenceMeta | undefined {
  if (!meta || pathsLen === 0) return undefined;
  const contRaw = meta.continuityImageCount ?? 0;
  const cont = Math.min(Math.max(0, contRaw), pathsLen);
  const rest = pathsLen - cont;
  const sc = Math.min(Math.max(0, meta.styleImageCount), rest);
  const charSlots = Math.max(0, rest - sc);
  const names = meta.characterNames.slice(0, charSlots);
  return { styleImageCount: sc, characterNames: names, continuityImageCount: cont };
}

function buildOptionalConsistencyPrefix(consistencyBlock?: string): string {
  const raw = consistencyBlock?.trim();
  if (!raw) return "";
  return `

CONSISTENCY (match prior scenes in this video):
${raw}
Keep the same faces, clothing, hair, body type, and key props for each named character above. Keep the same layout, lighting, palette, and furniture for each named location above. **Use one unified illustration style for every person in the frame** — do not mix photorealistic rendering with flat stick-figure or meme-style art in the same image. Apply only where this scene still includes that character or that setting — the transcription and visual direction below define the actual action and framing.`;
}

function buildReferenceImagePrompt(
  transcriptContext: string,
  imageDescription: string,
  videoAspectRatio: VideoAspectRatio,
  refsMeta?: GeminiReferenceMeta,
  consistencyBlock?: string,
): string {
  const safety =
    `No text overlays, no captions, no watermarks, and no logos on the output. No graphic violence or gore. The output image is ${videoAspectRatio}: compose full-bleed artwork that reaches all four edges—no letterboxing, pillarboxing, black bars, matte strips, or empty margins inside the frame.`;

  const sc = refsMeta?.styleImageCount ?? 0;
  const cnames = refsMeta?.characterNames ?? [];
  const cont = refsMeta?.continuityImageCount ?? 0;

  const styleOnlyCore =
    "Those images are **style references only**: copy rendering technique (line work, brush or flat treatment, edges, texture, color palette, contrast, stylization). Do **not** copy or echo their specific people, faces, poses, props, backgrounds, layouts, compositions, camera angles, or any scene content—what happens in the frame comes only from the transcription and the visual direction paragraph below.";

  const continuityCore =
    cont > 0
      ? `The last ${cont} attached image(s) are **continuity frame(s)** — the immediately previous shot(s) from this same video. Match **every character's** face shape, body proportions, clothing, linework, and shading from that frame. Match the **same environment treatment** (walls, floor, props) when the scene is still in the same place. **Every figure must share one unified rendering style** (same line weight, same level of detail) — never mix photorealistic or painterly rendering with flat stick-figure or meme-style characters in one image. Advance pose and action only as the transcription and visual direction require.`
      : "";

  const who = cnames.map((n) => `"${n}"`).join(", ");
  const parts: string[] = [];

  if (sc > 0) {
    parts.push(
      `The first ${sc} image(s) are **style references** (art style only). ${styleOnlyCore}`,
    );
  }
  if (cnames.length > 0) {
    parts.push(
      `The next ${cnames.length} image(s) are **character references** for visual likeness, in this order: ${who}. Match those characters' appearance when they belong in the scene, consistent with the style references.`,
    );
  }
  if (cont > 0) {
    parts.push(continuityCore);
  }

  let instruction: string;
  if (parts.length > 0) {
    instruction = `${parts.join("\n\n")}\n\nIf any reference contains watermarks or logos, ignore them. Create exactly one new frame. The scene must match the transcription below.`;
  } else {
    instruction = `The attached image(s) are **style references** (art style only). ${styleOnlyCore} If a reference contains watermarks, stock marks, logos, corner text, or site branding, treat those as artifacts to ignore — do not copy, echo, or reproduce them in your output. Match the visual style as closely as possible — avoid generic stock illustration or an unrelated aesthetic. Create exactly one new frame. The new scene must match the transcription context below.`;
  }

  const fixedPrefix = `${safety}

${instruction}${buildOptionalConsistencyPrefix(consistencyBlock)}

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
  /** Default 1K — lower cost; use 2K/4K when more detail is needed. */
  imageSize?: GeminiImageSize;
  /** Default `["IMAGE"]` — omit TEXT if you do not use model text output. */
  responseModalities?: GeminiResponseModality[];
  /** When using style + character refs, tells the model which images are which. */
  referenceMeta?: GeminiReferenceMeta;
  /** Prior-scene character/location descriptions for visual continuity. */
  consistencyBlock?: string;
}): Promise<void> {
  const {
    apiKey,
    referenceImagePaths,
    transcriptContext,
    imageDescription,
    outputPath,
    videoAspectRatio,
    imageSize = "1K",
    responseModalities = ["IMAGE"],
    referenceMeta,
    consistencyBlock,
  } = options;

  const paths = referenceImagePaths.slice(0, MAX_REFERENCE_IMAGES);

  const refsMeta = clampReferenceMeta(
    paths.length,
    referenceMeta ??
      (paths.length > 0
        ? { styleImageCount: paths.length, characterNames: [] as string[] }
        : undefined),
  );

  const fullText =
    paths.length > 0
      ? buildReferenceImagePrompt(
          transcriptContext,
          imageDescription,
          videoAspectRatio,
          refsMeta,
          consistencyBlock,
        )
      : truncateImagePrompt(
          `${basicImagePromptPrefix(videoAspectRatio)}${buildOptionalConsistencyPrefix(consistencyBlock)}${imageDescription.trim()}`,
        );

  const parts: GeminiPart[] = [{ text: fullText }];

  for (const refPath of paths) {
    const inline = getCachedReferenceInlineData(refPath);
    parts.push({
      inlineData: {
        mimeType: inline.mimeType,
        data: inline.data,
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
      responseModalities,
      imageConfig: {
        aspectRatio: videoAspectRatio,
        imageSize,
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
