/** OpenAI image prompts are bounded; keep a margin under typical limits. */
export const MAX_IMAGE_PROMPT_CHARS = 3800;

export function truncateImagePrompt(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_IMAGE_PROMPT_CHARS) return t;
  return `${t.slice(0, MAX_IMAGE_PROMPT_CHARS - 1)}…`;
}

/** Prefer keeping `fixedPrefix` intact; trim `transcript` then `visual` until under budget. */
export function truncateStyleReferencePromptParts(
  fixedPrefix: string,
  transcript: string,
  visual: string,
  maxTotal = MAX_IMAGE_PROMPT_CHARS,
): string {
  const t = transcript.trim();
  const v = visual.trim();
  let tr = t;
  let vi = v;
  const build = () => `${fixedPrefix}\n\n${tr}\n\n${vi}`;

  while (build().length > maxTotal && (tr.length > 80 || vi.length > 80)) {
    if (vi.length >= tr.length && vi.length > 120) {
      vi = `${vi.slice(0, Math.max(80, vi.length - 200))}…`;
    } else if (tr.length > 80) {
      tr = `${tr.slice(0, Math.max(40, tr.length - 150))}…`;
    } else {
      vi = vi.slice(0, Math.max(40, vi.length - 1)) + "…";
    }
  }
  if (build().length > maxTotal) {
    return `${fixedPrefix}\n\n${truncateImagePrompt(`${tr}\n\n${vi}`)}`;
  }
  return build();
}
