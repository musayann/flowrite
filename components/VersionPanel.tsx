"use client";

import CopyButton from "@/components/CopyButton";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  naturalVersion: string;
  naturalNote: string;
};

/** The idiomatic rewrite, with a note on what it changed and why. */
export default function VersionPanel({ naturalVersion, naturalNote }: Props) {
  return (
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
          <p className="mt-3 border-t border-emerald-200 pt-2 text-xs text-emerald-800 dark:border-emerald-500/20 dark:text-emerald-300">
            {naturalNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
