"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  maxChars: number;
};

export default function AnalyzeForm({
  value,
  onChange,
  onSubmit,
  loading,
  maxChars,
}: Props) {
  const tooLong = value.length > maxChars;
  const canSubmit = value.trim().length > 0 && !tooLong && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Paste a sentence or short paragraph…"
        rows={5}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white p-4 text-base leading-relaxed shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
      <div className="flex items-center justify-between gap-4">
        <span
          className={`text-xs ${tooLong ? "text-red-600" : "text-slate-500"}`}
        >
          {value.length}/{maxChars} characters
          <span className="ml-2 text-slate-400">· ⌘/Ctrl + Enter to analyze</span>
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </form>
  );
}
