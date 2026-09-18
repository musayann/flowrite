/**
 * The registry of providers and models the server is willing to call.
 *
 * Every provider here speaks the OpenAI wire format, so a single `openai`
 * client swapped by `baseURL` covers all of them (see `lib/openai.ts`). What
 * genuinely differs is how each one is made to return schema-valid JSON, which
 * is what `outputMode` selects in `lib/analysis.ts`.
 *
 * `MODELS` doubles as an allowlist: `/api/analyze` accepts a `model` in the
 * request body, and without a closed list a caller could bill any model the
 * server's key can reach.
 */

export type ProviderId = "openai" | "google" | "anthropic";

/**
 * How a provider is asked for structured output.
 *
 * - `json_schema` — OpenAI Structured Outputs. The decoder is constrained, so
 *   the response cannot violate the schema.
 * - `tool_call` — a forced function call carrying the same JSON Schema, with
 *   the arguments validated by Zod on our side. Needed for Anthropic, whose
 *   OpenAI-compatibility layer documents `response_format` (and `strict` on
 *   tool definitions) as ignored.
 */
export type OutputMode = "json_schema" | "tool_call";

export type Provider = {
  id: ProviderId;
  /** Human name, used in error copy shown to the user. */
  label: string;
  /** Undefined means the SDK default, i.e. OpenAI itself. */
  baseURL?: string;
  apiKeyEnv: string;
  outputMode: OutputMode;
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    outputMode: "json_schema",
  },
  google: {
    id: "google",
    label: "Google",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GEMINI_API_KEY",
    outputMode: "json_schema",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    baseURL: "https://api.anthropic.com/v1/",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    outputMode: "tool_call",
  },
};

export type ModelEntry = {
  /** Qualified id, `provider:model` — the string used in config and requests. */
  id: string;
  provider: Provider;
  /** The bare model id sent on the wire. */
  model: string;
  label: string;
};

/** `[provider, wire model id, label]`. */
const CATALOGUE: [ProviderId, string, string][] = [
  ["openai", "gpt-4o", "GPT-4o"],
  ["openai", "gpt-5-mini", "GPT-5 mini"],
  ["google", "gemini-3.8-flash", "Gemini 3.8 Flash"],
  ["google", "gemini-3.7-flash", "Gemini 3.7 Flash"],
  ["google", "gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"],
  ["anthropic", "claude-sonnet-5", "Claude Sonnet 5"],
  ["anthropic", "claude-haiku-4-5-20251001", "Claude Haiku 4.5"],
];

/**
 * A `Map` rather than an object literal: lookups take untrusted strings, and a
 * Map has no prototype chain for `"constructor"` and friends to walk into.
 */
export const MODELS: ReadonlyMap<string, ModelEntry> = new Map(
  CATALOGUE.map(([providerId, model, label]) => {
    const id = `${providerId}:${model}`;
    return [id, { id, provider: PROVIDERS[providerId], model, label }];
  }),
);

/** Unchanged from the pre-registry behaviour, so an existing deploy is unaffected. */
export const DEFAULT_MODEL_ID = "openai:gpt-4o";

/**
 * Look up an allowlisted model. Returns `null` for anything unrecognised —
 * including non-strings, since this is fed straight from a JSON request body.
 *
 * A bare id with no `provider:` prefix is read as OpenAI, which keeps a legacy
 * `OPENAI_MODEL=gpt-4o` working.
 */
export function resolveModel(id: unknown): ModelEntry | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  const qualified = trimmed.includes(":") ? trimmed : `openai:${trimmed}`;
  return MODELS.get(qualified) ?? null;
}

/**
 * The model the environment currently selects.
 *
 * Deliberately reads `process.env` on every call rather than caching at module
 * load: that is what lets the deployed server change model without a rebuild.
 * Returns `null` when the environment names a model that isn't allowlisted, so
 * the caller can say so instead of silently analysing with the wrong model.
 */
export function getConfiguredModel(): ModelEntry | null {
  const configured = process.env.MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
  if (!configured) return MODELS.get(DEFAULT_MODEL_ID) ?? null;
  return resolveModel(configured);
}
