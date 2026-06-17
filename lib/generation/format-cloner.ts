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

Describe **reusable patterns** another writer could follow for a totally different topic — not a summary of this video's plot, jokes, or specific facts.

Return JSON matching the schema:
- structure: abstract section flow (e.g. cold open → escalation → list beats → payoff) without naming this video's unique events (1-3 sentences)
- tone: voice and register only (1-2 sentences)
- pacing: rhythm, sentence density, speed (1-2 sentences)
- hooks: generic attention devices (e.g. "direct address", "rhetorical question") — not this script's exact hook lines
- sentencePatterns: typical sentence shapes (e.g. short punchy line + longer explanatory line), not quoted phrases from the transcript
- vocabularyStyle: formality, jargon level, repetition habits (1-2 sentences)`;

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
  const autoTarget = Math.max(80, Math.min(500, Math.round(wordCount * 0.9)));
  const targetWords =
    options?.targetWordCount !== undefined
      ? Math.max(1, Math.min(4000, Math.round(options.targetWordCount)))
      : autoTarget;

  const explicitLength = options?.targetWordCount !== undefined;
  /** Tight band for style-configured targets so the model stays near the goal. */
  const minBand = Math.max(1, Math.floor(targetWords * 0.9));
  const maxBand = Math.min(4000, Math.ceil(targetWords * 1.1));

  const lengthInstructions = explicitLength
    ? `LENGTH (strict — channel style target):
- The narrator script must be between ${minBand} and ${maxBand} words inclusive. The style target is ${targetWords} words — stay inside this band, not far below or above.
- Count words as whitespace-separated tokens (same as a typical word counter).
- If your first draft would be under ${minBand} words, you must expand: add concrete detail, examples, transitions, and full beats until you reach the band. Do not finish "early" with a short script.
- If over ${maxBand} words, tighten by merging sentences and cutting filler while keeping structure and tone.`
    : `LENGTH:
- Aim for about ${targetWords} words total (acceptable range roughly ${minBand}–${maxBand} words). This length is inferred from the reference transcript.
- This is a short-form video; keep the total script under 500 words so each scene can be covered by one image.`;

  return `You are writing a **100% original** voiceover script for a new video. Your job is to match the **channel's writing style** (pacing, density, how sentences feel) using the EXTRACTED FORMAT below — not to retell, paraphrase, or lightly rewrite the reference transcript.

NEW VIDEO TITLE: ${title}
NEW TOPIC / ANGLE: ${topic}

PRIMARY GUIDE — EXTRACTED FORMAT (follow this; it describes patterns, not this video's story):
- Structure: ${format.structure}
- Tone: ${format.tone}
- Pacing: ${format.pacing}
- Hooks: ${format.hooks.join(" | ")}
- Sentence patterns: ${format.sentencePatterns.join(" | ")}
- Vocabulary: ${format.vocabularyStyle}

${lengthInstructions}

ANTI-COPY / ORIGINALITY (non-negotiable):
- Do **not** reuse the reference's plot, jokes, examples, lists in the same order with swapped nouns, or extended runs of similar wording.
- Do **not** mirror the reference scene-for-scene or beat-for-beat; invent new situations, stakes, and specifics that fit ONLY "${topic}".
- Do **not** copy distinctive phrases, punchlines, or proper nouns from the reference (except generic words like "you", "the job", etc.).
- The reference transcript below is **background context** for rhythm and what "this channel sounds like" — treat its **events and lines as off-limits**. If you notice overlap with the reference while drafting, rewrite that part.

REFERENCE TRANSCRIPT (for channel voice / rhythm only — do not echo its content):
${referenceTranscript.slice(0, 80_000)}

RULES:
1. Let EXTRACTED FORMAT drive section flow and voice; let TITLE and TOPIC drive all substance. The new script must stand alone: someone who only read your output should not recognize it as the reference video with names changed.
2. Match overall pacing, hook *style* (not the same hook lines), and sentence rhythm from the format metadata — with entirely fresh wording.
3. The full narration must read as one continuous script with scope and density appropriate for the length requirements above (not a thin outline).
4. Output plain English script text only: no title line, no markdown, no scene labels, no numbering — one continuous block of narration suitable for voiceover.
5. Skip line breaks inside the script (single paragraph is OK if needed, or minimal breaks only if the format clearly implies them).`;

}
