/** Max UTF-8 bytes per reference transcript (create style + append). */
export const MAX_TRANSCRIPT_BYTES = 1024 * 1024;

export function transcriptTooLargeMessage(): string {
  const mb = MAX_TRANSCRIPT_BYTES / (1024 * 1024);
  if (Number.isInteger(mb) && mb >= 1) {
    return `Transcript too large (max ${mb}MB each)`;
  }
  return `Transcript too large (max ${Math.round(MAX_TRANSCRIPT_BYTES / 1024)}KB each)`;
}
