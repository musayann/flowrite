"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — ignore */
        }
      }}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
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
      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Corrected</CardTitle>
          <CardAction>
            <CopyButton text={correctedVersion} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {correctedVersion}
          </p>
        </CardContent>
      </Card>

      <Card className="gap-3 border-emerald-300 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200/60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            More natural
          </CardTitle>
          <CardAction>
            <CopyButton text={naturalVersion} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {naturalVersion}
          </p>
          {naturalNote && (
            <p className="mt-3 border-t border-emerald-200 pt-2 text-xs text-emerald-800/80 dark:border-emerald-500/20 dark:text-emerald-300/80">
              {naturalNote}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
