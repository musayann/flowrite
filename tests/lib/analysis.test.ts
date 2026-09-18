import type OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYSIS_JSON_SCHEMA, runAnalysis } from "@/lib/analysis";
import { resolveModel, type ModelEntry } from "@/lib/models";
import { makeResult } from "../fixtures";

const parse = vi.fn();
const create = vi.fn();

/** Only the two methods `runAnalysis` touches are real here. */
const client = { chat: { completions: { parse, create } } } as unknown as OpenAI;

const jsonSchemaModel = resolveModel("openai:gpt-4o") as ModelEntry;
const toolCallModel = resolveModel("anthropic:claude-sonnet-5") as ModelEntry;

beforeEach(() => {
  vi.clearAllMocks();
});

function toolCallResponse(args: string, name = "analysis") {
  return {
    choices: [
      {
        message: {
          tool_calls: [{ type: "function", function: { name, arguments: args } }],
        },
      },
    ],
  };
}

describe("the shared JSON Schema", () => {
  it("describes the analysis object both modes ask for", () => {
    expect(ANALYSIS_JSON_SCHEMA).toMatchObject({
      type: "object",
      properties: expect.objectContaining({
        issues: expect.anything(),
        correctedVersion: expect.anything(),
        naturalVersion: expect.anything(),
        naturalNote: expect.anything(),
      }),
    });
  });
});

describe("json_schema mode", () => {
  it("returns the parsed result", async () => {
    const result = makeResult();
    parse.mockResolvedValue({ choices: [{ message: { parsed: result } }] });

    await expect(runAnalysis(client, jsonSchemaModel, "hi")).resolves.toEqual({
      ok: true,
      result,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("sends the system prompt, the text, and a strict json_schema", async () => {
    parse.mockResolvedValue({ choices: [{ message: { parsed: makeResult() } }] });
    await runAnalysis(client, jsonSchemaModel, "hi");

    const call = parse.mock.calls[0][0];
    expect(call.model).toBe("gpt-4o");
    expect(call.messages[0].role).toBe("system");
    expect(call.messages[0].content).toMatch(/writing coach/i);
    expect(call.messages[1]).toEqual({ role: "user", content: "hi" });
    expect(call.response_format.type).toBe("json_schema");
    expect(call.response_format.json_schema.strict).toBe(true);
  });

  it("reports a refusal", async () => {
    parse.mockResolvedValue({ choices: [{ message: { refusal: "no" } }] });
    await expect(runAnalysis(client, jsonSchemaModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "refusal",
    });
  });

  it.each([
    ["a null payload", { choices: [{ message: { parsed: null } }] }],
    ["no choices", { choices: [] }],
  ])("reports %s as unparsable", async (_label, response) => {
    parse.mockResolvedValue(response);
    await expect(runAnalysis(client, jsonSchemaModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "unparsable",
    });
  });
});

describe("tool_call mode", () => {
  it("forces the analysis function and validates its arguments", async () => {
    const result = makeResult({ correctedVersion: "Fixed." });
    create.mockResolvedValue(toolCallResponse(JSON.stringify(result)));

    await expect(runAnalysis(client, toolCallModel, "hi")).resolves.toEqual({
      ok: true,
      result,
    });
    expect(parse).not.toHaveBeenCalled();

    const call = create.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-5");
    // The compat layer ignores response_format, hence this whole path.
    expect(call.response_format).toBeUndefined();
    expect(call.tool_choice).toEqual({
      type: "function",
      function: { name: "analysis" },
    });
    expect(call.tools[0].function.parameters).toEqual(ANALYSIS_JSON_SCHEMA);
  });

  it("drops unknown keys the schema does not declare", async () => {
    const result = makeResult();
    create.mockResolvedValue(
      toolCallResponse(JSON.stringify({ ...result, sneaky: "value" })),
    );

    const outcome = await runAnalysis(client, toolCallModel, "hi");
    expect(outcome).toEqual({ ok: true, result });
  });

  it("reports a refusal", async () => {
    create.mockResolvedValue({ choices: [{ message: { refusal: "no" } }] });
    await expect(runAnalysis(client, toolCallModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "refusal",
    });
  });

  it.each([
    ["no choices", { choices: [] }],
    ["no tool call", { choices: [{ message: { content: "Sure! Here goes…" } }] }],
    [
      "an empty tool_calls array",
      { choices: [{ message: { tool_calls: [] } }] },
    ],
  ])("reports %s as unparsable", async (_label, response) => {
    create.mockResolvedValue(response);
    await expect(runAnalysis(client, toolCallModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "unparsable",
    });
  });

  it("reports malformed JSON arguments as unparsable", async () => {
    create.mockResolvedValue(toolCallResponse("{not json"));
    await expect(runAnalysis(client, toolCallModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "unparsable",
    });
  });

  // Nothing constrains the decoder here, so this is the check that matters.
  it.each([
    ["a wrong-typed field", { ...makeResult(), issues: "nope" }],
    ["a missing field", { issues: [], correctedVersion: "x" }],
    ["an invalid category", { ...makeResult(), issues: [{ excerpt: "a", start: 0, end: 1, category: "vibes", explanation: "e", rule: "r" }] }],
  ])("reports %s as unparsable", async (_label, args) => {
    create.mockResolvedValue(toolCallResponse(JSON.stringify(args)));
    await expect(runAnalysis(client, toolCallModel, "hi")).resolves.toEqual({
      ok: false,
      kind: "unparsable",
    });
  });

  it("propagates provider errors to the caller", async () => {
    create.mockRejectedValue(Object.assign(new Error("boom"), { status: 429 }));
    await expect(runAnalysis(client, toolCallModel, "hi")).rejects.toThrow(
      "boom",
    );
  });
});
