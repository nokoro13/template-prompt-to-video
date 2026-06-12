import * as path from "path";

import {
  buildStyleStoragePrefix,
  getAsset,
  putAsset,
  resolveToLocalPath,
} from "./assets";
import { isR2StorageEnabled } from "./constants";

function stylePublicRelative(styleId: string, rel: string): string {
  return `channel-styles/${styleId}/${rel.replace(/^\//, "")}`;
}

function styleStorageKey(
  userId: string,
  styleId: string,
  rel: string,
): string {
  return `${buildStyleStoragePrefix(userId, styleId)}/${rel.replace(/^\//, "")}`;
}

export async function putStyleFile(
  userId: string,
  styleId: string,
  relativePath: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<string> {
  const publicRel = stylePublicRelative(styleId, relativePath);
  const { url } = await putAsset({
    storageKey: isR2StorageEnabled()
      ? styleStorageKey(userId, styleId, relativePath)
      : undefined,
    publicRelativePath: publicRel,
    body,
    contentType,
  });
  return url;
}

export async function readStyleText(
  userId: string,
  styleId: string,
  relativePath: string,
  legacyPublicPath?: string,
): Promise<string> {
  const publicRel =
    legacyPublicPath?.replace(/^\//, "") ??
    stylePublicRelative(styleId, relativePath);
  const buf = await getAsset({
    storageKey: isR2StorageEnabled()
      ? styleStorageKey(userId, styleId, relativePath)
      : undefined,
    publicRelativePath: publicRel,
  });
  if (!buf) {
    throw new Error(`Transcript not found: ${relativePath}`);
  }
  return buf.toString("utf8");
}

export async function resolveStyleImageToLocal(
  userId: string,
  styleId: string,
  url: string,
): Promise<string> {
  const rel = url.startsWith("/") ? url.slice(1) : url;
  const stylePrefix = `channel-styles/${styleId}/`;
  const idx = rel.indexOf(stylePrefix);
  const relativePath =
    idx >= 0 ? rel.slice(idx + stylePrefix.length) : path.basename(rel);

  return resolveToLocalPath({
    url,
    storageKey: isR2StorageEnabled()
      ? styleStorageKey(userId, styleId, relativePath)
      : undefined,
    publicRelativePath: rel,
  });
}
