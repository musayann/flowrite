"use client";

import { useState, type ComponentProps } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  text: string;
  /** What the button says before copying. */
  label?: string;
} & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">;

/** Copies `text` to the clipboard and briefly confirms it. */
export default function CopyButton({
  text,
  label = "Copy",
  variant = "ghost",
  size = "sm",
  className,
}: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
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
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}
