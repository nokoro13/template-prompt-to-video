/**
 * Export video download — one button, works on desktop and mobile.
 *
 * Desktop: "Save As" picker on Chrome/Edge, otherwise saves to Downloads.
 * Mobile:  iOS/Android share sheet when the file is ready (Save to Files, Photos, …),
 *          otherwise streams via the browser (no memory limit for large files).
 */

function normalizeFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith(".mp4")
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, "") || "video"}.mp4`;
}

export function isMobileDownloadContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (
    window.matchMedia("(hover: none)").matches &&
    window.innerWidth < 1024
  ) {
    return true;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getExportDownloadUrl(jobId: string): string {
  return new URL(
    `/api/export/${encodeURIComponent(jobId)}/download`,
    window.location.origin,
  ).href;
}

/** Prefetch MP4 so mobile can open the share sheet on tap (optional optimization). */
export async function prefetchExportVideoBlob(jobId: string): Promise<Blob> {
  const res = await fetch(getExportDownloadUrl(jobId));
  if (!res.ok) {
    throw new Error("Could not load video");
  }
  return res.blob();
}

async function writeBlobToSaveHandle(
  handle: FileSystemFileHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Browser-native download — streams the file, works for any size. */
export function triggerBrowserDownload(
  jobId: string,
  fileName: string,
): void {
  const url = getExportDownloadUrl(jobId);
  const suggestedName = normalizeFileName(fileName);

  if (isMobileDownloadContext()) {
    window.location.assign(url);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function tryNativeShareSheet(
  blob: Blob,
  fileName: string,
): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator.share !== "function") {
    return "unavailable";
  }

  const suggestedName = normalizeFileName(fileName);
  const file = new File([blob], suggestedName, { type: "video/mp4" });

  try {
    await navigator.share({ files: [file], title: suggestedName });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return "cancelled";
    }
    return "unavailable";
  }
}

/**
 * Download an exported video. Pass `cachedBlob` on mobile when prefetch finished
 * so the share sheet can open on the user's tap.
 */
export async function downloadExportVideo(
  jobId: string,
  fileName: string,
  options?: { cachedBlob?: Blob | null },
): Promise<void> {
  const suggestedName = normalizeFileName(fileName);
  const downloadUrl = getExportDownloadUrl(jobId);
  const mobile = isMobileDownloadContext();

  if (!mobile && typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "MP4 video",
            accept: { "video/mp4": [".mp4"] },
          },
        ],
      });
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error("Download failed");
      }
      await writeBlobToSaveHandle(handle, await res.blob());
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
    }
  }

  if (mobile && options?.cachedBlob) {
    const shareResult = await tryNativeShareSheet(
      options.cachedBlob,
      suggestedName,
    );
    if (shareResult === "shared" || shareResult === "cancelled") {
      return;
    }
  }

  triggerBrowserDownload(jobId, suggestedName);
}

/** @deprecated Use `downloadExportVideo` */
export async function fetchAndSaveExportVideo(
  jobId: string,
  fileName: string,
): Promise<void> {
  await downloadExportVideo(jobId, fileName);
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}
