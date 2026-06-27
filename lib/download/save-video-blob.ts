/**
 * Save a video blob with a native save/share flow when available.
 * - Desktop Chrome/Edge: File System Access API (Save As dialog)
 * - Mobile: Web Share API when supported
 * - Fallback: saves to the browser default download folder
 */

function normalizeFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith(".mp4")
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, "") || "video"}.mp4`;
}

async function writeBlobToSaveHandle(
  handle: FileSystemFileHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function saveBlobWithShareOrLink(
  blob: Blob,
  suggestedName: string,
): Promise<void> {
  const file = new File([blob], suggestedName, { type: "video/mp4" });

  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: suggestedName });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = suggestedName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Fetch export MP4 and save. Opens Save As immediately on Chrome/Edge (before
 * download) so the user can pick a folder while the click gesture is active.
 */
export async function fetchAndSaveExportVideo(
  jobId: string,
  fileName: string,
): Promise<void> {
  const suggestedName = normalizeFileName(fileName);
  const downloadUrl = `/api/export/${encodeURIComponent(jobId)}/download`;

  if (typeof window.showSaveFilePicker === "function") {
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

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error("Download failed");
  }
  await saveBlobWithShareOrLink(await res.blob(), suggestedName);
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
