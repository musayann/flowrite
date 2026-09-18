import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CHARS } from "@/lib/constants";
import { makeResult } from "../fixtures";

const auth = vi.fn();
const getClient = vi.fn();
const parse = vi.fn();
const create = vi.fn();
const after = vi.fn();
const flushLangfuse = vi.fn();
const observationUpdate = vi.fn();

vi.mock("@/auth", () => ({ auth: () => auth() }));

// Only the client is faked. The real `lib/models.ts` and `lib/analysis.ts`
// run, so these tests also cover model resolution and the output-mode split.
vi.mock("@/lib/openai", () => ({
  getClient: (provider: unknown) => getClient(provider),
}));

vi.mock("@/instrumentation.node", () => ({
  flushLangfuse: () => flushLangfuse(),
}));

// Pass-through tracing: run the callback, hand it a recording observation stub.
vi.mock("@langfuse/tracing", () => ({
  startActiveObservation: (_name: string, fn: (o: unknown) => unknown) =>
    fn({ update: observationUpdate }),
  propagateAttributes: (_attrs: unknown, fn: () => unknown) => fn(),
}));

// Keep the real NextResponse; only `after` needs stubbing outside a request scope.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => void) => after(fn),
}));

const { POST } = await import("@/app/api/analyze/route");

function request(body: unknown, { raw = false } = {}) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

/** Make the mocked OpenAI client return a chat completion shape. */
function respondWith(message: unknown) {
  parse.mockResolvedValue({ choices: [{ message }] });
}

beforeEach(() => {
  auth.mockResolvedValue({ user: { name: "yannick" } });
  getClient.mockReturnValue({ chat: { completions: { parse, create } } });
  respondWith({ parsed: makeResult() });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("auth gate", () => {
  it("rejects an unauthenticated request with 401", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects a session without a user", async () => {
    auth.mockResolvedValue({ user: null });
    expect((await POST(request({ text: "hello" }))).status).toBe(401);
  });
});

describe("request validation", () => {
  it("rejects a malformed JSON body with 400", async () => {
    const res = await POST(request("{not json", { raw: true }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body." });
  });

  it.each([
    ["a missing text field", {}],
    ["a non-string text field", { text: 42 }],
    ["an empty string", { text: "" }],
    ["whitespace only", { text: "   \n\t " }],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await POST(request(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Please provide some text to analyse.",
    });
  });

  it(`accepts text of exactly ${MAX_CHARS} characters`, async () => {
    const res = await POST(request({ text: "a".repeat(MAX_CHARS) }));
    expect(res.status).toBe(200);
  });

  it(`rejects text longer than ${MAX_CHARS} characters`, async () => {
    const res = await POST(request({ text: "a".repeat(MAX_CHARS + 1) }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: `Text is too long (max ${MAX_CHARS} characters).`,
    });
  });
});

describe("client setup", () => {
  it("returns 500 when the API key is not configured", async () => {
    getClient.mockImplementation(() => {
      throw new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
    });
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error:
        "Server is missing its OpenAI API key. Set OPENAI_API_KEY in .env.local.",
    });
  });
});

describe("model responses", () => {
  it("returns the parsed analysis on success", async () => {
    const result = makeResult({ correctedVersion: "Fixed." });
    respondWith({ parsed: result });

    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ result });
    expect(observationUpdate).toHaveBeenCalledWith({ output: result });
  });

  it("sends the system prompt and the user text to the model", async () => {
    await POST(request({ text: "hello" }));
    const call = parse.mock.calls[0][0];
    expect(call.model).toBe("gpt-4o");
    expect(call.messages[0].role).toBe("system");
    expect(call.messages[1]).toEqual({ role: "user", content: "hello" });
    expect(call.response_format.type).toBe("json_schema");
  });

  it("returns 422 and warns when the model refuses", async () => {
    respondWith({ refusal: "I can't help with that." });
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: "The model declined to analyse this text.",
    });
    expect(observationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ level: "WARNING" }),
    );
  });

  it("returns 502 and errors when the response has no parsed payload", async () => {
    respondWith({ parsed: null });
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "The model returned an unexpected response. Please try again.",
    });
    expect(observationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ level: "ERROR" }),
    );
  });

  it("returns 502 when the response has no choices at all", async () => {
    parse.mockResolvedValue({ choices: [] });
    expect((await POST(request({ text: "hello" }))).status).toBe(502);
  });
});

describe("provider errors", () => {
  it.each([
    [401, "OpenAI rejected the API key. Check OPENAI_API_KEY.", 401],
    [429, "Rate limited by OpenAI. Please wait a moment and try again.", 429],
    [500, "Failed to analyse the text. Please try again.", 500],
    [418, "Failed to analyse the text. Please try again.", 418],
  ])("echoes provider status %i", async (status, error, expected) => {
    parse.mockRejectedValue(Object.assign(new Error("boom"), { status }));
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(expected);
    await expect(res.json()).resolves.toEqual({ error });
  });

  it.each([
    ["no status", new Error("boom")],
    ["a non-numeric status", Object.assign(new Error("boom"), { status: "nope" })],
    ["a sub-400 status", Object.assign(new Error("boom"), { status: 200 })],
    ["a non-object rejection", "just a string"],
  ])("falls back to 502 for an error with %s", async (_label, err) => {
    parse.mockRejectedValue(err);
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to analyse the text. Please try again.",
    });
  });
});

describe("tracing", () => {
  it("records the input on the observation", async () => {
    await POST(request({ text: "hello" }));
    expect(observationUpdate).toHaveBeenCalledWith({
      input: { text: "hello" },
      metadata: {
        endpoint: "/api/analyze",
        provider: "openai",
        model: "gpt-4o",
      },
    });
  });

  it("schedules a Langfuse flush after the response", async () => {
    await POST(request({ text: "hello" }));
    expect(after).toHaveBeenCalledOnce();

    // Serverless runtimes only export the trace if this callback flushes.
    const scheduled = after.mock.calls[0][0] as () => unknown;
    await scheduled();
    expect(flushLangfuse).toHaveBeenCalledOnce();
  });

  it("flushes even when the model call failed", async () => {
    parse.mockRejectedValue(new Error("boom"));
    await POST(request({ text: "hello" }));
    expect(after).toHaveBeenCalledTimes(1);
  });
});

describe("model selection", () => {
  it("defaults to gpt-4o when nothing is configured", async () => {
    vi.stubEnv("MODEL", "");
    vi.stubEnv("OPENAI_MODEL", "");
    await POST(request({ text: "hello" }));
    expect(parse.mock.calls[0][0].model).toBe("gpt-4o");
  });

  it("uses the model named by MODEL", async () => {
    vi.stubEnv("MODEL", "google:gemini-3.7-flash");
    await POST(request({ text: "hello" }));
    expect(parse.mock.calls[0][0].model).toBe("gemini-3.7-flash");
    expect(getClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: "google" }),
    );
  });

  it("falls back to a bare legacy OPENAI_MODEL", async () => {
    vi.stubEnv("MODEL", "");
    vi.stubEnv("OPENAI_MODEL", "gpt-5-mini");
    await POST(request({ text: "hello" }));
    expect(parse.mock.calls[0][0].model).toBe("gpt-5-mini");
  });

  it("re-reads the environment on every request, with no restart", async () => {
    vi.stubEnv("MODEL", "openai:gpt-4o");
    await POST(request({ text: "hello" }));
    vi.stubEnv("MODEL", "openai:gpt-5-mini");
    await POST(request({ text: "hello" }));
    expect(parse.mock.calls.map((c) => c[0].model)).toEqual([
      "gpt-4o",
      "gpt-5-mini",
    ]);
  });

  it("returns 500 when MODEL names something unsupported", async () => {
    vi.stubEnv("MODEL", "openai:gpt-imaginary");
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Server is configured with an unsupported model. Check MODEL.",
    });
    expect(parse).not.toHaveBeenCalled();
  });

  it("lets the request body override the configured model", async () => {
    vi.stubEnv("MODEL", "openai:gpt-4o");
    await POST(request({ text: "hello", model: "openai:gpt-5-mini" }));
    expect(parse.mock.calls[0][0].model).toBe("gpt-5-mini");
  });

  it.each([
    ["an unlisted model", "openai:gpt-imaginary"],
    ["an unknown provider", "acme:whatever"],
    ["a non-string", 42],
    ["an empty string", ""],
    ["a prototype key", "constructor"],
  ])("rejects %s in the body with 400", async (_label, model) => {
    const res = await POST(request({ text: "hello", model }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Unknown model." });
    // The allowlist must reject before any provider is billed.
    expect(parse).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("tool-call providers", () => {
  const toolCall = (args: unknown) => ({
    choices: [
      {
        message: {
          tool_calls: [
            {
              type: "function",
              function: { name: "analysis", arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  });

  beforeEach(() => {
    vi.stubEnv("MODEL", "anthropic:claude-sonnet-5");
  });

  it("forces a tool call instead of using response_format", async () => {
    const result = makeResult();
    create.mockResolvedValue(toolCall(result));

    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ result });

    const call = create.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-5");
    expect(call.response_format).toBeUndefined();
    expect(call.tool_choice).toEqual({
      type: "function",
      function: { name: "analysis" },
    });
    expect(parse).not.toHaveBeenCalled();
  });

  it("returns 502 when the tool arguments do not match the schema", async () => {
    create.mockResolvedValue(toolCall({ issues: "not an array" }));
    const res = await POST(request({ text: "hello" }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "The model returned an unexpected response. Please try again.",
    });
  });

  it("reports the provider by name on a 401", async () => {
    create.mockRejectedValue(Object.assign(new Error("nope"), { status: 401 }));
    const res = await POST(request({ text: "hello" }));
    await expect(res.json()).resolves.toEqual({
      error: "Anthropic rejected the API key. Check ANTHROPIC_API_KEY.",
    });
  });
});
