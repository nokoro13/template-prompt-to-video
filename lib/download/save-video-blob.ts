/** @deprecated Import from `@/lib/export/export-video-download` instead. */
export {
  getExportDownloadHref,
  saveExportedVideo,
  shouldUseShareSheetForExport,
} from "@/lib/export/export-video-download";

import {
  getExportDownloadHref,
  saveExportedVideo,
} from "@/lib/export/export-video-download";

/** @deprecated Use `saveExportedVideo(getExportDownloadHref(jobId), { filename })` */
export async function downloadExportVideo(
  jobId: string,
  fileName: string,
): Promise<void> {
  const result = await saveExportedVideo(getExportDownloadHref(jobId), {
    filename: fileName,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/** @deprecated Use `saveExportedVideo` */
export const fetchAndSaveExportVideo = downloadExportVideo;

/** @deprecated Use `shouldUseShareSheetForExport` */
export { shouldUseShareSheetForExport as isMobileDownloadContext } from "@/lib/export/export-video-download";

/** @deprecated Use `getExportDownloadHref` */
export const getExportDownloadUrl = getExportDownloadHref;
