/**
 * Client-side export download / save.
 *
 * Desktop: same-origin <a download> (no full-file fetch).
 * Mobile / WebView: fetch same-origin MP4 → File → navigator.share({ files })
 * with URL / blob / clipboard fallbacks. Never uses window.location to an MP4
 * or cross-origin fetch for the share flow.
 */

export type SaveExportedVideoMethod =
  | "share_file"
  | "share_url"
  | "anchor"
  | "clipboard"
  | "cancelled";

export type SaveExportedVideoResult =
  | { ok: true; method: SaveExportedVideoMethod; message?: string }
  | { ok: false; error: string };

function normalizeFilename(fileName: string): string {
  const trimmed = fileName.trim() || "video.mp4";
  return trimmed.toLowerCase().endsWith(".mp4")
    ? trimmed
    : `${trimmed.replace(/\.[^.]+$/, "") || "video"}.mp4`;
}

function isShareAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Same-origin absolute URL for fetch / share fallbacks. */
export function toSameOriginAbsoluteUrl(href: string): string {
  if (typeof window === "undefined") {
    return href;
  }
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("Download URL must be same-origin");
  }
  return url.href;
}

/** Preferred same-origin download href for an export job. */
export function getExportDownloadHref(jobId: string): string {
  return `/api/download/export?id=${encodeURIComponent(jobId)}`;
}

/**
 * True on iPhone, iPad, Android, and coarse-pointer touch devices
 * (includes in-app WebViews on mobile).
 */
export function shouldUseShareSheetForExport(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function triggerAnchorDownload(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function shareFileViaNativeSheet(
  blob: Blob,
  filename: string,
  text?: string,
): Promise<SaveExportedVideoResult | null> {
  if (typeof navigator.share !== "function") {
    return null;
  }

  const file = new File([blob], filename, { type: "video/mp4" });
  try {
    await navigator.share({
      files: [file],
      title: filename,
      text: text ?? filename,
    });
    return { ok: true, method: "share_file" };
  } catch (e) {
    if (isShareAbortError(e)) {
      return { ok: true, method: "cancelled" };
    }
    return null;
  }
}

async function shareUrlViaNativeSheet(
  absoluteUrl: string,
  filename: string,
  text?: string,
): Promise<SaveExportedVideoResult | null> {
  if (typeof navigator.share !== "function") {
    return null;
  }

  try {
    await navigator.share({
      url: absoluteUrl,
      title: filename,
      text: text ?? filename,
    });
    return { ok: true, method: "share_url" };
  } catch (e) {
    if (isShareAbortError(e)) {
      return { ok: true, method: "cancelled" };
    }
    return null;
  }
}

async function copyDownloadLink(absoluteUrl: string): Promise<SaveExportedVideoResult> {
  if (typeof navigator.clipboard?.writeText !== "function") {
    return {
      ok: false,
      error: "Could not save the video. Open this page in Safari or Chrome and try again.",
    };
  }

  try {
    await navigator.clipboard.writeText(absoluteUrl);
    return {
      ok: true,
      method: "clipboard",
      message:
        "Download link copied. Paste it in Safari to save the video, or share it from your clipboard.",
    };
  } catch {
    return {
      ok: false,
      error: "Could not save the video. Try again in Safari or Chrome.",
    };
  }
}

/**
 * Save or download an exported video.
 *
 * @param downloadHref Same-origin path or URL (e.g. `/api/download/export?id=…`)
 */
export async function saveExportedVideo(
  downloadHref: string,
  options?: { filename?: string; text?: string },
): Promise<SaveExportedVideoResult> {
  const filename = normalizeFilename(options?.filename ?? "video.mp4");
  const absoluteUrl = toSameOriginAbsoluteUrl(downloadHref);

  if (!shouldUseShareSheetForExport()) {
    triggerAnchorDownload(absoluteUrl, filename);
    return { ok: true, method: "anchor" };
  }

  let response: Response;
  try {
    response = await fetch(absoluteUrl);
  } catch {
    return { ok: false, error: "Could not reach the download server. Check your connection." };
  }

  if (!response.ok) {
    let detail = "Download failed";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error?.trim()) detail = data.error.trim();
    } catch {
      /* not JSON */
    }
    return { ok: false, error: detail };
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    return { ok: false, error: "Could not read the video file. Try again." };
  }

  const sharedFile = await shareFileViaNativeSheet(blob, filename, options?.text);
  if (sharedFile) return sharedFile;

  const sharedUrl = await shareUrlViaNativeSheet(absoluteUrl, filename, options?.text);
  if (sharedUrl) return sharedUrl;

  try {
    const blobUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(blobUrl, filename);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
    return { ok: true, method: "anchor" };
  } catch {
    /* try clipboard */
  }

  return copyDownloadLink(absoluteUrl);
}
