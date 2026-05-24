import z from "zod";

/** Same family as chat-based script; supports `web_search` in Responses API. */
const DEFAULT_SCRIPT_WEB_MODEL = "gpt-4.1";

function scriptWebModel(): string {
  return (
    process.env.OPENAI_SCRIPT_WEB_MODEL?.trim() || DEFAULT_SCRIPT_WEB_MODEL
  );
}

function storyJsonSchemaFromZod(schema: z.ZodType) {
  const jsonSchema = z.toJSONSchema(schema);
  return {
    type: (jsonSchema.type as string) || "object",
    properties: jsonSchema.properties,
    required: jsonSchema.required,
    additionalProperties: jsonSchema.additionalProperties ?? false,
  };
}

function extractMessageTextFromResponsesOutput(
  output: unknown[],
): string | null {
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i] as {
      type?: string;
      content?: unknown[];
    };
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      const p = part as { type?: string; text?: string; refusal?: string };
      if (
        p.type === "refusal" ||
        p.type === "output_refusal" ||
        (p as { refusal?: string }).refusal
      ) {
        const r = (p as { refusal?: string }).refusal;
        throw new Error(r || "The model refused this script request.");
      }
      if (p.type === "output_text" && typeof p.text === "string") {
        return p.text;
      }
    }
  }
  return null;
}

/**
 * Structured script completion with OpenAI hosted web search (Responses API).
 * Use for fact-grounded narration; incurs web search tool pricing and higher latency.
 */
export async function openaiStructuredCompletionWithWebSearch<T>(
  apiKey: string,
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const jsonSchema = storyJsonSchemaFromZod(schema);

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: scriptWebModel(),
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      text: {
        format: {
          type: "json_schema",
          name: "story_script",
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI (responses) error: ${rawText.slice(0, 2000)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("OpenAI (responses): invalid JSON body");
  }

  const d = data as {
    status?: string;
    error?: { message?: string };
    output?: unknown[];
  };

  if (d.error?.message) {
    throw new Error(d.error.message);
  }
  if (d.status === "failed" || d.status === "cancelled") {
    throw new Error(`OpenAI response status: ${d.status ?? "unknown"}`);
  }

  const output = d.output;
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("OpenAI (responses): empty output");
  }

  const text = extractMessageTextFromResponsesOutput(output);
  if (!text) {
    throw new Error("OpenAI (responses): no assistant text in output");
  }

  const parsed = JSON.parse(text) as unknown;
  return schema.parse(parsed);
}
