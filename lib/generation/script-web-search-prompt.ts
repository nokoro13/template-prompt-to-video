/** Appended when script generation uses OpenAI hosted web search. */
export function scriptWebSearchPromptSuffix(title: string, topic: string): string {
  const t = title.trim() || "(untitled)";
  const k = topic.trim() || "(no topic)";
  return `

---
WEB SEARCH (required for this request):
You have access to the web_search tool. Use it to verify facts, names, dates, ordered rankings, and terminology for this video (title: "${t}"; topic/angle: "${k}").
Ground the narration in what you find; do not invent quotations, statistics, study titles, or URLs in the spoken script.
If reputable sources disagree, prefer the mainstream consensus or acknowledge uncertainty in plain language.
Your final output must still be only the JSON object required by the schema (single string field "text" with the full voiceover).`;
}
