import { z } from "zod";

import { openaiStructuredCompletion, setApiKey } from "@/cli/service";
import type { ExtractedFormat } from "@/lib/channel-styles/types";

const SuggestTopicResponseSchema = z.object({
  topic: z.string().min(1).max(4000),
});

function formatExtractedForPrompt(f: ExtractedFormat): string {
  return [
    `Structure: ${f.structure}`,
    `Tone: ${f.tone}`,
    `Pacing: ${f.pacing}`,
    `Hooks (patterns): ${f.hooks.join(" | ")}`,
    `Sentence patterns: ${f.sentencePatterns.join(" | ")}`,
    `Vocabulary: ${f.vocabularyStyle}`,
  ].join("\n");
}

/**
 * Produces a topic/angle paragraph for script generation from a title + style format analysis.
 */
export async function suggestTopicFromStyle(
  openaiApiKey: string,
  options: {
    title: string;
    styleName: string;
    styleDescription?: string;
    extractedFormat: ExtractedFormat;
  },
): Promise<string> {
  setApiKey(openaiApiKey);
  const desc = options.styleDescription?.trim();
  const formatBlock = formatExtractedForPrompt(options.extractedFormat);

  const prompt = `You help a creator fill in the "topic / angle" field for a scripted voiceover video. This text will be passed to another model that writes the full narration in the style of a reference channel.

VIDEO TITLE: ${options.title.trim()}

CHANNEL STYLE NAME: ${options.styleName}
${desc ? `STYLE NOTES (from creator): ${desc}\n` : ""}
EXTRACTED FORMAT ANALYSIS (from a reference transcript — match this shape of content, not its subject):
${formatBlock}

TASK:
Write ONE concise topic paragraph (2–6 sentences, plain English, no markdown, no title line). It must:
1. Describe the specific subject, angle, and hook for THIS video given the title.
2. Align with structure, tone, pacing, hooks, and vocabulary implied by the format analysis above.
3. Be concrete and specific — not generic filler.

Return JSON only with a single key "topic" whose value is that paragraph.`;

  const out = await openaiStructuredCompletion(
    prompt,
    SuggestTopicResponseSchema,
  );
  return out.topic.trim();
}
