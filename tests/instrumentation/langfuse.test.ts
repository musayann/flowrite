import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerOTel = vi.fn();
const forceFlush = vi.fn().mockResolvedValue(undefined);
const spanProcessorConstructor = vi.fn();

vi.mock("@vercel/otel", () => ({
  registerOTel: (opts: unknown) => registerOTel(opts),
}));

vi.mock("@langfuse/otel", () => ({
  LangfuseSpanProcessor: class {
    forceFlush = forceFlush;
    constructor() {
      spanProcessorConstructor();
    }
  },
}));

type LangfuseGlobal = typeof globalThis & {
  flowriteLangfuseRegistered?: boolean;
  flowriteLangfuseSpanProcessor?: unknown;
};

/** The module caches on globalThis, which survives resetModules. */
async function importFresh() {
  vi.resetModules();
  const g = globalThis as LangfuseGlobal;
  delete g.flowriteLangfuseRegistered;
  delete g.flowriteLangfuseSpanProcessor;
  return import("@/instrumentation.node");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LANGFUSE_PUBLIC_KEY", "pk-test");
  vi.stubEnv("LANGFUSE_SECRET_KEY", "sk-test");
  vi.stubEnv("LANGFUSE_TRACING_ENABLED", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  const g = globalThis as LangfuseGlobal;
  delete g.flowriteLangfuseRegistered;
  delete g.flowriteLangfuseSpanProcessor;
});

describe("registerLangfuse", () => {
  it("registers OTel with the Langfuse span processor when configured", async () => {
    const { registerLangfuse } = await importFresh();
    registerLangfuse();
    expect(registerOTel).toHaveBeenCalledWith({
      serviceName: "flowrite",
      spanProcessors: [expect.anything()],
    });
  });

  it("only registers once, however many times it is called", async () => {
    const { registerLangfuse } = await importFresh();
    registerLangfuse();
    registerLangfuse();
    registerLangfuse();
    expect(registerOTel).toHaveBeenCalledTimes(1);
    expect(spanProcessorConstructor).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the public key is missing", "LANGFUSE_PUBLIC_KEY"],
    ["the secret key is missing", "LANGFUSE_SECRET_KEY"],
  ])("does nothing when %s", async (_label, key) => {
    vi.stubEnv(key, "");
    const { registerLangfuse } = await importFresh();
    registerLangfuse();
    expect(registerOTel).not.toHaveBeenCalled();
    expect(spanProcessorConstructor).not.toHaveBeenCalled();
  });

  it.each(["false", "FALSE", "False"])(
    "does nothing when tracing is disabled with %s",
    async (value) => {
      vi.stubEnv("LANGFUSE_TRACING_ENABLED", value);
      const { registerLangfuse } = await importFresh();
      registerLangfuse();
      expect(registerOTel).not.toHaveBeenCalled();
    },
  );

  it.each(["true", "1", "yes"])(
    "stays enabled for any other value of the flag (%s)",
    async (value) => {
      vi.stubEnv("LANGFUSE_TRACING_ENABLED", value);
      const { registerLangfuse } = await importFresh();
      registerLangfuse();
      expect(registerOTel).toHaveBeenCalledTimes(1);
    },
  );
});

describe("flushLangfuse", () => {
  it("flushes the registered span processor", async () => {
    const { registerLangfuse, flushLangfuse } = await importFresh();
    registerLangfuse();
    await flushLangfuse();
    expect(forceFlush).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when tracing was never registered", async () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "");
    const { flushLangfuse } = await importFresh();
    await expect(flushLangfuse()).resolves.toBeUndefined();
    expect(forceFlush).not.toHaveBeenCalled();
  });
});
