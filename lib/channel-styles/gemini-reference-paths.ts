import * as fs from "fs";
import * as path from "path";
import { MAX_GEMINI_REFERENCE_IMAGES } from "@/lib/generation/generate-with-gemini";
import { getStyle, resolveStyleImagePaths } from "@/lib/storage/styles";
import { resolveStyleImageToLocal } from "@/lib/storage/style-storage";

function publicUrlToFs(publicUrl: string): string {
  const rel = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return path.join(process.cwd(), "public", rel);
}

/**
 * **Style** reference images (`references.images` — art style only) first, then optional
 * **character** reference portraits, capped at Gemini limit. Returns filesystem paths that exist.
 */
export async function resolveGeminiReferencePathsForStyle(
  styleId: string | undefined,
  userId?: string,
): Promise<{
  paths: string[];
  styleImageCount: number;
  characterNames: string[];
} | undefined> {
  if (!styleId) return undefined;
  const style = await getStyle(styleId, userId);
  if (!style) return undefined;

  const stylePaths: string[] = [];
  if (style.references.images.length) {
    if (userId) {
      for (const url of style.references.images) {
        const p = await resolveStyleImageToLocal(userId, styleId, url);
        if (fs.existsSync(p)) stylePaths.push(p);
      }
    } else {
      const resolved = await resolveStyleImagePaths(style);
      stylePaths.push(...resolved.filter((p) => fs.existsSync(p)));
    }
  }

  const characterPaths: string[] = [];
  const characterNames: string[] = [];
  for (const c of style.characters ?? []) {
    const url = c.imageUrl?.trim();
    if (!url) continue;
    let fsPath: string;
    if (userId) {
      fsPath = await resolveStyleImageToLocal(userId, styleId, url);
    } else {
      fsPath = publicUrlToFs(url);
    }
    if (fs.existsSync(fsPath)) {
      characterPaths.push(fsPath);
      characterNames.push(c.name.trim() || "Character");
    }
  }

  const merged: string[] = [];
  for (const p of stylePaths) {
    if (merged.length >= MAX_GEMINI_REFERENCE_IMAGES) break;
    merged.push(p);
  }
  const styleCount = merged.length;
  for (let i = 0; i < characterPaths.length; i++) {
    if (merged.length >= MAX_GEMINI_REFERENCE_IMAGES) break;
    merged.push(characterPaths[i]!);
  }
  const namesUsed = characterNames.slice(0, merged.length - styleCount);

  if (merged.length === 0) return undefined;
  return { paths: merged, styleImageCount: styleCount, characterNames: namesUsed };
}
