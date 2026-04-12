import {
  ExtractedFormat,
  ExtractedFormatSchema,
} from "../channel-styles/types";
import { openaiStructuredCompletion, setApiKey } from "../../cli/service";

export async function analyzeReferenceTranscript(
  transcriptText: string,
  apiKey: string,
): Promise<ExtractedFormat> {
  setApiKey(apiKey);
  const prompt = `Analyze this YouTube-style video script/transcript and extract structured metadata.

<transcript>
${transcriptText.slice(0, 120_000)}
</transcript>

Return JSON matching the schema:
- structure: how sections are organized and how the narrative progresses (1-3 sentences)
- tone: voice and register (1-2 sentences)
- pacing: rhythm, sentence density, speed (1-2 sentences)
- hooks: array of short bullet strings describing attention devices used
- sentencePatterns: array of short strings describing typical sentence shapes
- vocabularyStyle: level of jargon, formality, repetition patterns (1-2 sentences)`;

  return openaiStructuredCompletion(prompt, ExtractedFormatSchema);
}

export function buildScriptClonePrompt(
  title: string,
  topic: string,
  referenceTranscript: string,
  format: ExtractedFormat,
  options?: { targetWordCount?: number },
): string {
  const wordCount = referenceTranscript.trim().split(/\s+/).filter(Boolean).length;
  const autoTarget = Math.max(80, Math.min(1200, Math.round(wordCount * 0.9)));
  const targetWords =
    options?.targetWordCount !== undefined
      ? Math.max(1, Math.min(4000, Math.round(options.targetWordCount)))
      : autoTarget;

  return `You are writing a NEW video script that clones the FORMAT of a successful reference video, but with ORIGINAL content for a new topic.

NEW VIDEO TITLE: ${title}
NEW TOPIC / ANGLE: ${topic}

REFERENCE TRANSCRIPT (structure, rhythm, and style to mirror — do NOT copy sentences verbatim):
${referenceTranscript.slice(0, 80_000)}

EXTRACTED FORMAT (follow closely):
- Structure: ${format.structure}
- Tone: ${format.tone}
- Pacing: ${format.pacing}
- Hooks: ${format.hooks.join(" | ")}
- Sentence patterns: ${format.sentencePatterns.join(" | ")}
- Vocabulary: ${format.vocabularyStyle}

RULES:
1. Preserve the same narrative architecture (beats, section flow, how ideas build) as the reference, adapted to "${topic}".
2. Match tone, pacing, and hook style; use fresh wording throughout (no plagiarism).
3. Aim for roughly ${targetWords} words total, as one continuous script (similar scope to the reference).
4. Output plain English script text only: no title line, no markdown, no scene labels, no numbering — one continuous block of narration suitable for voiceover.
5. Skip line breaks inside the script (single paragraph is OK if needed, or minimal breaks only if the reference clearly used them).`;

}
