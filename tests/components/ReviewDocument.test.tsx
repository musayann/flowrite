import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewDocument from "@/components/ReviewDocument";
import { makeIssue, makeResult } from "../fixtures";

const ORIGINAL = "She is engineer.";
const RESULT = makeResult({
  issues: [makeIssue({ excerpt: "engineer", start: -1, end: -1, category: "article" })],
  correctedVersion: "She is an engineer.",
  naturalVersion: "She works as an engineer.",
  naturalNote: "Names the job, not just the title.",
});

function setup(props: Partial<Parameters<typeof ReviewDocument>[0]> = {}) {
  const onPick = vi.fn();
  const onEdit = vi.fn();
  const user = userEvent.setup();
  render(
    <ReviewDocument
      original={ORIGINAL}
      result={RESULT}
      issues={RESULT.issues}
      openIndex={null}
      onPick={onPick}
      shown={() => true}
      onEdit={onEdit}
      {...props}
    />,
  );
  const panel = () => screen.getByRole("tabpanel");
  return { onPick, onEdit, user, panel };
}

describe("ReviewDocument readings", () => {
  it("opens on the original, with its issues numbered", () => {
    const { panel } = setup();
    expect(screen.getByRole("tab", { name: "Original" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(panel()).toHaveTextContent("She is engineer1.");
    expect(panel().querySelector("mark")).toHaveTextContent("engineer");
  });

  it("shows the correction's changes inline, with a key", async () => {
    const { user, panel } = setup();
    await user.click(screen.getByRole("tab", { name: "Corrected" }));
    expect(panel().querySelector("p ins")).toHaveTextContent("an");
    expect(panel()).toHaveTextContent("words the correction took out");
    expect(screen.getByRole("switch", { name: "Show changes" })).toBeChecked();
  });

  it("shows the clean correction with Show changes off", async () => {
    const { user, panel } = setup();
    await user.click(screen.getByRole("tab", { name: "Corrected" }));
    await user.click(screen.getByRole("switch", { name: "Show changes" }));
    expect(panel()).toHaveTextContent(/^She is an engineer\.$/);
    expect(panel().querySelector("ins")).toBeNull();
  });

  it("only offers Show changes on the corrected reading", async () => {
    const { user } = setup();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "More natural" }));
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows the natural rewrite with what it changed", async () => {
    const { user, panel } = setup();
    await user.click(screen.getByRole("tab", { name: "More natural" }));
    expect(panel()).toHaveTextContent("She works as an engineer.");
    expect(within(panel()).getByText("What changed")).toBeInTheDocument();
    expect(panel()).toHaveTextContent("Names the job, not just the title.");
  });

  it("leaves out What changed when there is no note", async () => {
    const { user } = setup({ result: { ...RESULT, naturalNote: "" } });
    await user.click(screen.getByRole("tab", { name: "More natural" }));
    expect(screen.queryByText("What changed")).not.toBeInTheDocument();
  });

  it("changes its footer hint and count with the reading", async () => {
    const { user } = setup();
    expect(screen.getByText(/Select a number to open its note/)).toBeInTheDocument();
    expect(screen.getByText(`${ORIGINAL.length} characters`)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "More natural" }));
    expect(screen.getByText(/A freer rewrite/)).toBeInTheDocument();
    expect(
      screen.getByText(`${RESULT.naturalVersion.length} characters`),
    ).toBeInTheDocument();
  });
});

describe("ReviewDocument actions", () => {
  it("opens an issue from its number", async () => {
    const { onPick, user } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 1, article" }));
    expect(onPick).toHaveBeenCalledWith(0);
  });

  it("goes back to editing", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("copies the reading on screen, never the marked-up changes", async () => {
    const { user } = setup();
    const copy = async () => {
      await user.click(screen.getByRole("button", { name: /^Cop(y|ied)$/ }));
      return navigator.clipboard.readText();
    };
    expect(await copy()).toBe(ORIGINAL);
    await user.click(screen.getByRole("tab", { name: "Corrected" }));
    expect(await copy()).toBe(RESULT.correctedVersion);
    await user.click(screen.getByRole("tab", { name: "More natural" }));
    expect(await copy()).toBe(RESULT.naturalVersion);
  });
});
