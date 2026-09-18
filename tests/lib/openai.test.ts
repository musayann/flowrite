import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROVIDERS } from "@/lib/models";

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

/** The module caches clients, so each test needs a fresh module registry. */
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

describe("getClient", () => {
  it("throws a setup-shaped error naming the provider's key variable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { getClient } = await importFresh();
    expect(() => getClient(PROVIDERS.google)).toThrow(
      /GEMINI_API_KEY is not set/,
    );
  });

  it("constructs the OpenAI client with the key and no baseURL", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getClient } = await importFresh();
    getClient(PROVIDERS.openai);
    expect(openAiConstructor).toHaveBeenCalledWith({
      apiKey: "sk-test-123",
      baseURL: undefined,
    });
  });

  it.each([
    ["google", "GEMINI_API_KEY"],
    ["anthropic", "ANTHROPIC_API_KEY"],
  ] as const)("points %s at its compatible endpoint", async (id, keyEnv) => {
    vi.stubEnv(keyEnv, "key-123");
    const { getClient } = await importFresh();
    getClient(PROVIDERS[id]);
    expect(openAiConstructor).toHaveBeenCalledWith({
      apiKey: "key-123",
      baseURL: PROVIDERS[id].baseURL,
    });
    expect(PROVIDERS[id].baseURL).toMatch(/^https:\/\//);
  });

  it("wraps the client in Langfuse observation metadata", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getClient } = await importFresh();
    getClient(PROVIDERS.openai);
    expect(observeOpenAI).toHaveBeenCalledWith(expect.anything(), {
      generationName: "analyze-writing",
      generationMetadata: { feature: "writing-analysis" },
    });
  });

  it("caches per provider", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getClient } = await importFresh();
    expect(getClient(PROVIDERS.openai)).toBe(getClient(PROVIDERS.openai));
    expect(openAiConstructor).toHaveBeenCalledTimes(1);
  });

  it("keeps providers on separate cache entries", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    const { getClient } = await importFresh();
    expect(getClient(PROVIDERS.openai)).not.toBe(getClient(PROVIDERS.google));
    expect(openAiConstructor).toHaveBeenCalledTimes(2);
  });

  it("still throws if the key is removed after a client was built", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getClient } = await importFresh();
    getClient(PROVIDERS.openai);
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => getClient(PROVIDERS.openai)).toThrow(
      /OPENAI_API_KEY is not set/,
    );
  });

  it("rebuilds after __resetClients", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-123");
    const { getClient, __resetClients } = await importFresh();
    getClient(PROVIDERS.openai);
    __resetClients();
    getClient(PROVIDERS.openai);
    expect(openAiConstructor).toHaveBeenCalledTimes(2);
  });
});
