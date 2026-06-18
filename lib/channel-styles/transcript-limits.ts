/** Max UTF-8 bytes per reference transcript (create style + append). */
export const MAX_TRANSCRIPT_BYTES = 1024 * 1024;

/** Each channel style may store one reference transcript for format cloning. */
export const MAX_REFERENCE_TRANSCRIPTS_PER_STYLE = 1;

export function transcriptTooLargeMessage(): string {
  const mb = MAX_TRANSCRIPT_BYTES / (1024 * 1024);
  if (Number.isInteger(mb) && mb >= 1) {
    return `Transcript too large (max ${mb}MB each)`;
  }
  return `Transcript too large (max ${Math.round(MAX_TRANSCRIPT_BYTES / 1024)}KB each)`;
}

export function tooManyReferenceTranscriptsMessage(): string {
  return "Each style supports one reference transcript. Remove the existing transcript before adding another.";
}
