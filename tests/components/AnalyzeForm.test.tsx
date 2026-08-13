import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalyzeForm from "@/components/AnalyzeForm";

const MAX = 20;

function setup(props: Partial<React.ComponentProps<typeof AnalyzeForm>> = {}) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  render(
    <AnalyzeForm
      value=""
      onChange={onChange}
      onSubmit={onSubmit}
      loading={false}
      maxChars={MAX}
      {...props}
    />,
  );
  return {
    onChange,
    onSubmit,
    user: userEvent.setup(),
    textarea: screen.getByRole("textbox"),
    submit: screen.getByRole("button", { name: /analys/i }),
    clear: screen.getByRole("button", { name: "Clear" }),
  };
}

describe("submit button", () => {
  it("is disabled for empty input", () => {
    expect(setup().submit).toBeDisabled();
  });

  it("is disabled for whitespace-only input", () => {
    expect(setup({ value: "   \n " }).submit).toBeDisabled();
  });

  it("is enabled for real input", () => {
    expect(setup({ value: "hello" }).submit).toBeEnabled();
  });

  it("is enabled at exactly the character limit", () => {
    expect(setup({ value: "a".repeat(MAX) }).submit).toBeEnabled();
  });

  it("is disabled one character past the limit", () => {
    expect(setup({ value: "a".repeat(MAX + 1) }).submit).toBeDisabled();
  });

  it("is disabled while loading", () => {
    expect(setup({ value: "hello", loading: true }).submit).toBeDisabled();
  });

  it("submits the form when clicked", async () => {
    const { user, submit, onSubmit } = setup({ value: "hello" });
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("loading state", () => {
  it("reads Analyse when idle", () => {
    expect(setup({ value: "hello" }).submit).toHaveTextContent("Analyse");
  });

  it("reads Analysing while loading", () => {
    expect(setup({ value: "hello", loading: true }).submit).toHaveTextContent(
      "Analysing",
    );
  });
});

describe("typing", () => {
  it("reports each keystroke to onChange", async () => {
    const { user, textarea, onChange } = setup();
    await user.type(textarea, "hi");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("i");
  });

  it("submits on Cmd+Enter", async () => {
    const { user, textarea, onSubmit } = setup({ value: "hello" });
    await user.click(textarea);
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("submits on Ctrl+Enter", async () => {
    const { user, textarea, onSubmit } = setup({ value: "hello" });
    await user.click(textarea);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ignores Cmd+Enter while loading", async () => {
    const { user, textarea, onSubmit } = setup({ value: "hello", loading: true });
    await user.click(textarea);
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores Cmd+Enter when the input is over the limit", async () => {
    const { user, textarea, onSubmit } = setup({ value: "a".repeat(MAX + 1) });
    await user.click(textarea);
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores a bare Enter, so newlines still work", async () => {
    const { user, textarea, onSubmit } = setup({ value: "hello" });
    await user.click(textarea);
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("clear button", () => {
  it("is disabled when there is nothing to clear", () => {
    expect(setup().clear).toBeDisabled();
  });

  it("is enabled for whitespace-only input, which submit rejects", () => {
    const { clear, submit } = setup({ value: "   " });
    expect(clear).toBeEnabled();
    expect(submit).toBeDisabled();
  });

  it("is disabled while loading", () => {
    expect(setup({ value: "hello", loading: true }).clear).toBeDisabled();
  });

  it("empties the input", async () => {
    const { user, clear, onChange } = setup({ value: "hello" });
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("does not submit the form", async () => {
    const { user, clear, onSubmit } = setup({ value: "hello" });
    await user.click(clear);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("character counter", () => {
  it("shows the current count against the limit", () => {
    setup({ value: "abc" });
    expect(screen.getByText(/3\/20/)).toBeInTheDocument();
  });

  it("turns destructive past the limit", () => {
    setup({ value: "a".repeat(MAX + 1) });
    expect(screen.getByText(/21\/20/)).toHaveClass("text-destructive");
  });

  it("stays muted at the limit", () => {
    setup({ value: "a".repeat(MAX) });
    expect(screen.getByText(/20\/20/)).toHaveClass("text-muted-foreground");
  });
});
