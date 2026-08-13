import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addHistory,
  clearHistory,
  loadHistory,
  removeHistory,
} from "@/lib/history";
import { makeResult } from "../fixtures";

const KEY = "flowrite:history";

beforeEach(() => {
  window.localStorage.clear();
  let n = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(
    () => `uuid-${n++}` as `${string}-${string}-${string}-${string}-${string}`,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loadHistory", () => {
  it("returns an empty list when nothing has been stored", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("returns an empty list when the stored value is not valid JSON", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(loadHistory()).toEqual([]);
  });

  it("returns an empty list when the stored JSON is not an array", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ nope: true }));
    expect(loadHistory()).toEqual([]);
  });

  it("round-trips what addHistory wrote", () => {
    const result = makeResult();
    addHistory("some text", result);
    expect(loadHistory()).toEqual([
      { id: "uuid-0", input: "some text", result, createdAt: expect.any(Number) },
    ]);
  });
});

describe("addHistory", () => {
  it("prepends new entries so the newest is first", () => {
    addHistory("first", makeResult());
    const entries = addHistory("second", makeResult());
    expect(entries.map((e) => e.input)).toEqual(["second", "first"]);
  });

  it("stamps createdAt from the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    const [entry] = addHistory("text", makeResult());
    expect(entry.createdAt).toBe(Date.parse("2026-08-13T12:00:00Z"));
    vi.useRealTimers();
  });

  it("moves a re-analysed input to the top instead of duplicating it", () => {
    addHistory("repeated", makeResult());
    addHistory("other", makeResult());
    const entries = addHistory("repeated", makeResult());
    expect(entries.map((e) => e.input)).toEqual(["repeated", "other"]);
    expect(entries).toHaveLength(2);
  });

  it("dedupes on exact input, so differently-trimmed text coexists", () => {
    addHistory("text", makeResult());
    const entries = addHistory("text ", makeResult());
    expect(entries.map((e) => e.input)).toEqual(["text ", "text"]);
  });

  it("caps the list at 20 entries, evicting the oldest", () => {
    for (let i = 0; i < 21; i++) addHistory(`entry-${i}`, makeResult());
    const entries = loadHistory();
    expect(entries).toHaveLength(20);
    expect(entries[0].input).toBe("entry-20");
    expect(entries.at(-1)?.input).toBe("entry-1");
    expect(entries.some((e) => e.input === "entry-0")).toBe(false);
  });

  it("falls back to a timestamp id when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    const [entry] = addHistory("text", makeResult());
    expect(entry.id).toMatch(/^\d+$/);
  });

  it("still returns the updated list when storage is full, without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const entries = addHistory("text", makeResult());
    expect(entries).toHaveLength(1);
    // Nothing was actually persisted.
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});

describe("removeHistory", () => {
  it("removes the matching entry and persists the rest", () => {
    addHistory("keep", makeResult());
    const [target] = addHistory("drop", makeResult());
    const entries = removeHistory(target.id);
    expect(entries.map((e) => e.input)).toEqual(["keep"]);
    expect(loadHistory().map((e) => e.input)).toEqual(["keep"]);
  });

  it("is a no-op for an unknown id", () => {
    addHistory("keep", makeResult());
    expect(removeHistory("nope")).toHaveLength(1);
  });
});

describe("clearHistory", () => {
  it("empties the list and the store", () => {
    addHistory("a", makeResult());
    addHistory("b", makeResult());
    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });
});
