/**
 * Save a video blob with a native save/share flow when available.
 * - Desktop Chrome/Edge: File System Access API (Save As dialog)
 * - Mobile: Web Share API (Save to Files, Photos, AirDrop, etc.)
 * - Fallback: opens the video in a new tab so the OS player share/save UI appears
 */

function normalizeFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith(".mp4")
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, "") || "video"}.mp4`;
}

function isMobileDownloadContext(): boolean {
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

async function writeBlobToSaveHandle(
  handle: FileSystemFileHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function openVideoBlobForNativeActions(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

async function shareVideoOnMobile(
  blob: Blob,
  suggestedName: string,
): Promise<void> {
  const file = new File([blob], suggestedName, { type: "video/mp4" });

  if (typeof navigator.share === "function") {
    const payload = { files: [file], title: suggestedName };
    const canShareFiles =
      typeof navigator.canShare !== "function" || navigator.canShare(payload);

    if (canShareFiles) {
      try {
        await navigator.share(payload);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
      }
    }
  }

  openVideoBlobForNativeActions(blob);
}

async function saveBlobOnDesktop(blob: Blob, suggestedName: string): Promise<void> {
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
 * On mobile, opens the native share/save sheet when the file is ready.
 */
export async function fetchAndSaveExportVideo(
  jobId: string,
  fileName: string,
): Promise<void> {
  const suggestedName = normalizeFileName(fileName);
  const downloadUrl = `/api/export/${encodeURIComponent(jobId)}/download`;
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

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error("Download failed");
  }
  const blob = await res.blob();

  if (mobile) {
    await shareVideoOnMobile(blob, suggestedName);
    return;
  }

  await saveBlobOnDesktop(blob, suggestedName);
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
