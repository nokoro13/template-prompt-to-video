import * as path from "path";

import {
  buildStyleStoragePrefix,
  getAsset,
  parseStorageApiKey,
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

/** Map a stored style asset URL to R2/disk paths (`/api/storage/...` or legacy `/channel-styles/...`). */
export function resolveStyleAssetPaths(
  userId: string,
  styleId: string,
  storedUrl: string,
): {
  relativePath: string;
  publicRelativePath: string;
  storageKey?: string;
} {
  const normalized = storedUrl.replace(/^\//, "");

  const storageKey = parseStorageApiKey(storedUrl);
  if (storageKey) {
    const expectedPrefix = `${buildStyleStoragePrefix(userId, styleId)}/`;
    if (storageKey.startsWith(expectedPrefix)) {
      const relativePath = storageKey.slice(expectedPrefix.length);
      return {
        relativePath,
        publicRelativePath: stylePublicRelative(styleId, relativePath),
        storageKey,
      };
    }
  }

  const legacyPrefix = `channel-styles/${styleId}/`;
  const legacyIdx = normalized.indexOf(legacyPrefix);
  if (legacyIdx >= 0) {
    const relativePath = normalized.slice(legacyIdx + legacyPrefix.length);
    return {
      relativePath,
      publicRelativePath: normalized,
      storageKey: isR2StorageEnabled()
        ? styleStorageKey(userId, styleId, relativePath)
        : undefined,
    };
  }

  const relativePath = path.basename(normalized);
  return {
    relativePath,
    publicRelativePath: stylePublicRelative(styleId, relativePath),
    storageKey: isR2StorageEnabled()
      ? styleStorageKey(userId, styleId, relativePath)
      : undefined,
  };
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
  storageKey?: string,
): Promise<string> {
  const publicRel =
    legacyPublicPath?.replace(/^\//, "") ??
    stylePublicRelative(styleId, relativePath);
  const key =
    storageKey ??
    (isR2StorageEnabled()
      ? styleStorageKey(userId, styleId, relativePath)
      : undefined);
  const buf = await getAsset({
    storageKey: key,
    publicRelativePath: publicRel,
  });
  if (!buf) {
    throw new Error(`Transcript not found: ${relativePath}`);
  }
  return buf.toString("utf8");
}

export async function readStyleTextFromUrl(
  userId: string,
  styleId: string,
  storedUrl: string,
): Promise<string> {
  const resolved = resolveStyleAssetPaths(userId, styleId, storedUrl);
  return readStyleText(
    userId,
    styleId,
    resolved.relativePath,
    resolved.publicRelativePath,
    resolved.storageKey,
  );
}

export async function resolveStyleImageToLocal(
  userId: string,
  styleId: string,
  url: string,
): Promise<string> {
  const resolved = resolveStyleAssetPaths(userId, styleId, url);
  return resolveToLocalPath({
    url,
    storageKey: resolved.storageKey,
    publicRelativePath: resolved.publicRelativePath,
  });
}
