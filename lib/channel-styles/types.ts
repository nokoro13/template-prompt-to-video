import { z } from "zod";

/** AI-extracted format from a reference transcript. */
export const ExtractedFormatSchema = z.object({
  structure: z.string(),
  tone: z.string(),
  pacing: z.string(),
  hooks: z.array(z.string()),
  sentencePatterns: z.array(z.string()),
  vocabularyStyle: z.string(),
});

export type ExtractedFormat = z.infer<typeof ExtractedFormatSchema>;

export const StyleCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  /** Public URL under /channel-styles/.../characters/ — reference for consistent character look. */
  imageUrl: z.string().optional(),
});

export type StyleCharacter = z.infer<typeof StyleCharacterSchema>;

export const TranscriptEntrySchema = z.object({
  id: z.string(),
  filename: z.string(),
  /** Path under public/, e.g. /channel-styles/foo/transcripts/a.txt */
  path: z.string(),
  title: z.string(),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

/** Output shape for AI scene images (matches GPT Image + DALL·E 3 presets). */
export const VideoAspectRatioSchema = z.enum(["9:16", "16:9"]);
export type VideoAspectRatio = z.infer<typeof VideoAspectRatioSchema>;

export const ChannelStyleRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  creatorName: z.string().optional(),
  description: z.string().optional(),
  /** Portrait short-form vs landscape; drives scene image aspect for Gemini. */
  videoAspectRatio: VideoAspectRatioSchema.default("9:16"),
  /**
   * When set, generated narration scripts (format-clone path) aim for this many words (1–4000).
   * When omitted, length is inferred from the reference transcript.
   */
  targetTranscriptWordCount: z.number().int().min(1).max(4000).optional(),
  thumbnailUrl: z.string(),
  referenceCount: z.number(),
  characterCount: z.number(),
  createdAt: z.string(),
  references: z.object({
    /** Art-style reference frames only — not for character likeness (use characters on the style). */
    images: z.array(z.string()),
    transcripts: z.array(TranscriptEntrySchema),
  }),
  extractedFormat: ExtractedFormatSchema.optional(),
  characters: z.array(StyleCharacterSchema).optional(),
});

export type ChannelStyleRecord = z.infer<typeof ChannelStyleRecordSchema>;

export const StylesIndexSchema = z.object({
  styles: z.record(z.string(), ChannelStyleRecordSchema),
});

export type StylesIndex = z.infer<typeof StylesIndexSchema>;
