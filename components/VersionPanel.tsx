"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — ignore */
        }
      }}
      className="text-xs font-medium text-slate-500 hover:text-slate-800"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

type Props = {
  correctedVersion: string;
  naturalVersion: string;
  naturalNote: string;
};

export default function VersionPanel({
  correctedVersion,
  naturalVersion,
  naturalNote,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Corrected</h3>
          <CopyButton text={correctedVersion} />
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-900">
          {correctedVersion}
        </p>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-800">
            More natural
          </h3>
          <CopyButton text={naturalVersion} />
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-900">
          {naturalVersion}
        </p>
        {naturalNote && (
          <p className="mt-3 border-t border-emerald-200 pt-2 text-xs text-emerald-900/80">
            {naturalNote}
          </p>
        )}
      </section>
    </div>
  );
}
