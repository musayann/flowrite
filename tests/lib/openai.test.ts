import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openAiConstructor = vi.fn();
const observeOpenAI = vi.fn((...args: unknown[]) => args[0]);

vi.mock("openai", () => ({
  default: class MockOpenAI {
    constructor(opts: unknown) {
      openAiConstructor(opts);
    }
  },
}));

vi.mock("@langfuse/openai", () => ({
  observeOpenAI: (client: unknown, opts: unknown) => observeOpenAI(client, opts),
}));

/** The module caches its client, so each test needs a fresh module registry. */
async function importFresh() {
  vi.resetModules();
  return import("@/lib/openai");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getOpenAI", () => {
  it("throws a setup-shaped error when the API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { getOpenAI } = await importFresh();
    expect(() => getOpenAI()).toThrow(/OPENAI_API_KEY is not set/);
  });

  it("constructs the client with the configured key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getOpenAI } = await importFresh();
    getOpenAI();
    expect(openAiConstructor).toHaveBeenCalledWith({ apiKey: "sk-test-123" });
  });

  it("wraps the client in Langfuse observation metadata", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getOpenAI } = await importFresh();
    getOpenAI();
    expect(observeOpenAI).toHaveBeenCalledWith(expect.anything(), {
      generationName: "analyze-writing",
      generationMetadata: { feature: "writing-analysis" },
    });
  });

  it("caches the client across calls", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getOpenAI } = await importFresh();
    expect(getOpenAI()).toBe(getOpenAI());
    expect(openAiConstructor).toHaveBeenCalledTimes(1);
  });

  it("still throws if the key is removed after a client was built", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getOpenAI } = await importFresh();
    getOpenAI();
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => getOpenAI()).toThrow(/OPENAI_API_KEY is not set/);
  });
});

describe("OPENAI_MODEL", () => {
  it("defaults to gpt-4o", async () => {
    vi.stubEnv("OPENAI_MODEL", "");
    const { OPENAI_MODEL } = await importFresh();
    expect(OPENAI_MODEL).toBe("gpt-4o");
  });

  it("honours the OPENAI_MODEL environment override", async () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-5-mini");
    const { OPENAI_MODEL } = await importFresh();
    expect(OPENAI_MODEL).toBe("gpt-5-mini");
  });
});
