/**
 * Remotion Studio dev server URL (embedded on /studio). Default matches --port=3001.
 */
export function getRemotionStudioBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_REMOTION_STUDIO_URL?.trim();
  const base = raw && raw.length > 0 ? raw : "http://localhost:3001";
  return base.replace(/\/$/, "");
}
