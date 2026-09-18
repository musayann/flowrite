import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ModelEntry } from "@/lib/models";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { AnalysisResult } from "@/lib/schema";

/**
 * The one place a model is actually asked to analyse text.
 *
 * Both output modes are driven by the same `AnalysisResult` schema — the
 * tool-call path reuses the JSON Schema the Structured Outputs helper already
 * derives, so the two can't drift apart.
 */

const RESPONSE_FORMAT = zodResponseFormat(AnalysisResult, "analysis");

/** The JSON Schema for `AnalysisResult`, shared by both output modes. */
export const ANALYSIS_JSON_SCHEMA = RESPONSE_FORMAT.json_schema.schema ?? {};

const TOOL_NAME = "analysis";

export type AnalysisOutcome =
  | { ok: true; result: AnalysisResult }
  /** `refusal` is a deliberate decline; `unparsable` is a broken response. */
  | { ok: false; kind: "refusal" | "unparsable" };

function messagesFor(text: string): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: text },
  ];
}

/**
 * Structured Outputs. The decoder is constrained to the schema, so a response
 * that arrives at all is schema-valid.
 */
async function viaJsonSchema(
  client: OpenAI,
  entry: ModelEntry,
  text: string,
): Promise<AnalysisOutcome> {
  const completion = await client.chat.completions.parse({
    model: entry.model,
    messages: messagesFor(text),
    response_format: RESPONSE_FORMAT,
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) return { ok: false, kind: "refusal" };
  if (!message?.parsed) return { ok: false, kind: "unparsable" };
  return { ok: true, result: message.parsed };
}

/**
 * A forced function call used as a JSON carrier, for providers that ignore
 * `response_format`. Nothing constrains the decoder here, so the arguments are
 * validated against the schema on our side before they are trusted.
 */
async function viaToolCall(
  client: OpenAI,
  entry: ModelEntry,
  text: string,
): Promise<AnalysisOutcome> {
  const completion = await client.chat.completions.create({
    model: entry.model,
    messages: messagesFor(text),
    tools: [
      {
        type: "function",
        function: {
          name: TOOL_NAME,
          description:
            "Return the writing analysis for the user's text. Always call this.",
          parameters: ANALYSIS_JSON_SCHEMA,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: TOOL_NAME } },
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) return { ok: false, kind: "refusal" };

  const call = message?.tool_calls?.find(
    (candidate) => candidate.type === "function",
  );
  if (!call) return { ok: false, kind: "unparsable" };

  let raw: unknown;
  try {
    raw = JSON.parse(call.function.arguments);
  } catch {
    return { ok: false, kind: "unparsable" };
  }

  const parsed = AnalysisResult.safeParse(raw);
  if (!parsed.success) return { ok: false, kind: "unparsable" };
  return { ok: true, result: parsed.data };
}

/** Run the analysis using whichever output mode the model's provider needs. */
export function runAnalysis(
  client: OpenAI,
  entry: ModelEntry,
  text: string,
): Promise<AnalysisOutcome> {
  return entry.provider.outputMode === "tool_call"
    ? viaToolCall(client, entry, text)
    : viaJsonSchema(client, entry, text);
}
