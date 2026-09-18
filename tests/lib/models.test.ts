import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  PROVIDERS,
  getConfiguredModel,
  resolveModel,
} from "@/lib/models";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the registry", () => {
  it("exposes the default model", () => {
    expect(MODELS.has(DEFAULT_MODEL_ID)).toBe(true);
  });

  it("keys every entry as provider:model", () => {
    for (const [id, entry] of MODELS) {
      expect(id).toBe(`${entry.provider.id}:${entry.model}`);
    }
  });

  it("gives every provider a key variable and an output mode", () => {
    for (const provider of Object.values(PROVIDERS)) {
      expect(provider.apiKeyEnv).toMatch(/^[A-Z_]+$/);
      expect(["json_schema", "tool_call"]).toContain(provider.outputMode);
    }
  });

  // Anthropic's OpenAI-compatibility layer documents `response_format` as
  // ignored, so it must not be on the Structured Outputs path.
  it("puts Anthropic on the tool-call path and the rest on json_schema", () => {
    expect(PROVIDERS.anthropic.outputMode).toBe("tool_call");
    expect(PROVIDERS.openai.outputMode).toBe("json_schema");
    expect(PROVIDERS.google.outputMode).toBe("json_schema");
  });
});

describe("resolveModel", () => {
  it("resolves every allowlisted id", () => {
    for (const id of MODELS.keys()) {
      expect(resolveModel(id)?.id).toBe(id);
    }
  });

  it("reads a bare id as an OpenAI model", () => {
    expect(resolveModel("gpt-4o")?.id).toBe("openai:gpt-4o");
  });

  it("tolerates surrounding whitespace", () => {
    expect(resolveModel("  openai:gpt-5-mini  ")?.id).toBe("openai:gpt-5-mini");
  });

  it.each([
    ["an unlisted model", "openai:gpt-imaginary"],
    ["an unknown provider", "acme:whatever"],
    ["a bare unlisted model", "gemini-3.7-flash"],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
    ["an object", { id: "openai:gpt-4o" }],
    // A Map has no prototype chain for these to walk into.
    ["a prototype key", "constructor"],
    ["__proto__", "__proto__"],
  ])("returns null for %s", (_label, input) => {
    expect(resolveModel(input)).toBeNull();
  });
});

describe("getConfiguredModel", () => {
  it("defaults when nothing is set", () => {
    vi.stubEnv("MODEL", "");
    vi.stubEnv("OPENAI_MODEL", "");
    expect(getConfiguredModel()?.id).toBe(DEFAULT_MODEL_ID);
  });

  it("honours MODEL", () => {
    vi.stubEnv("MODEL", "google:gemini-3.7-flash");
    expect(getConfiguredModel()?.id).toBe("google:gemini-3.7-flash");
  });

  it("falls back to a legacy OPENAI_MODEL", () => {
    vi.stubEnv("MODEL", "");
    vi.stubEnv("OPENAI_MODEL", "gpt-5-mini");
    expect(getConfiguredModel()?.id).toBe("openai:gpt-5-mini");
  });

  it("prefers MODEL over OPENAI_MODEL", () => {
    vi.stubEnv("MODEL", "anthropic:claude-sonnet-5");
    vi.stubEnv("OPENAI_MODEL", "gpt-4o");
    expect(getConfiguredModel()?.id).toBe("anthropic:claude-sonnet-5");
  });

  it("returns null rather than silently defaulting on an unsupported value", () => {
    vi.stubEnv("MODEL", "openai:gpt-imaginary");
    expect(getConfiguredModel()).toBeNull();
  });

  // The point of the whole exercise: no module reset, no rebuild.
  it("re-reads the environment on every call", () => {
    vi.stubEnv("MODEL", "openai:gpt-4o");
    expect(getConfiguredModel()?.model).toBe("gpt-4o");
    vi.stubEnv("MODEL", "google:gemini-3.5-flash-lite");
    expect(getConfiguredModel()?.model).toBe("gemini-3.5-flash-lite");
  });
});
