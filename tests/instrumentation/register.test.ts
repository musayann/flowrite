import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerLangfuse = vi.fn();

vi.mock("@/instrumentation.node", () => ({
  registerLangfuse: () => registerLangfuse(),
  flushLangfuse: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("register", () => {
  it("registers Langfuse on the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.resetModules();
    const { register } = await import("@/instrumentation");
    await register();
    expect(registerLangfuse).toHaveBeenCalledTimes(1);
  });

  it.each(["edge", ""])("does nothing on the %s runtime", async (runtime) => {
    vi.stubEnv("NEXT_RUNTIME", runtime);
    vi.resetModules();
    const { register } = await import("@/instrumentation");
    await register();
    expect(registerLangfuse).not.toHaveBeenCalled();
  });
});
