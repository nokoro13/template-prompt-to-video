import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import {
  MAX_TRANSCRIPT_BYTES,
  transcriptTooLargeMessage,
} from "@/lib/channel-styles/transcript-limits";
import { parseYouTubeVideoId } from "./parse-video-id";

export type YouTubeTranscriptResult = {
  videoId: string;
  title: string;
  content: string;
};

async function fetchYouTubeVideoTitle(videoId: string): Promise<string> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return watchUrl;
    const data = (await res.json()) as { title?: string };
    const title = data.title?.trim();
    return title || watchUrl;
  } catch {
    return watchUrl;
  }
}

function segmentsToPlainText(
  segments: Awaited<ReturnType<typeof fetchTranscript>>,
): string {
  return segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapYouTubeTranscriptError(err: unknown, videoId: string): string {
  if (err instanceof YoutubeTranscriptDisabledError) {
    return "Captions are disabled for this video.";
  }
  if (err instanceof YoutubeTranscriptNotAvailableError) {
    return "No transcript is available for this video.";
  }
  if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return "No transcript is available in the requested language for this video.";
  }
  if (err instanceof YoutubeTranscriptVideoUnavailableError) {
    return "This YouTube video is unavailable or private.";
  }
  if (err instanceof YoutubeTranscriptTooManyRequestError) {
    return "YouTube rate-limited transcript requests. Try again in a moment.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return `Could not fetch transcript for video ${videoId}.`;
}

/** Fetch title + plain-text transcript for a YouTube URL or video id. */
export async function fetchYouTubeTranscript(
  urlOrId: string,
): Promise<YouTubeTranscriptResult> {
  const videoId = parseYouTubeVideoId(urlOrId);
  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Paste a link like https://www.youtube.com/watch?v=…",
    );
  }

  let segments: Awaited<ReturnType<typeof fetchTranscript>>;
  try {
    segments = await fetchTranscript(videoId);
  } catch (err) {
    throw new Error(mapYouTubeTranscriptError(err, videoId));
  }

  const content = segmentsToPlainText(segments);
  if (!content) {
    throw new Error("Transcript is empty for this video.");
  }

  if (Buffer.byteLength(content, "utf8") > MAX_TRANSCRIPT_BYTES) {
    throw new Error(transcriptTooLargeMessage());
  }

  const title = await fetchYouTubeVideoTitle(videoId);
  return { videoId, title, content };
}
