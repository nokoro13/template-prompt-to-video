const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** Extract a YouTube video id from common URL shapes, or return the id if already valid. */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const prefix = parts[0];
    const id = parts[1];
    if (
      id &&
      VIDEO_ID_PATTERN.test(id) &&
      (prefix === "embed" || prefix === "shorts" || prefix === "live" || prefix === "v")
    ) {
      return id;
    }
  }

  return null;
}
