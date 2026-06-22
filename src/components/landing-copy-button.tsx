"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function LandingCopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="absolute right-3 top-3 flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-600 hover:text-white"
    >
      {copied && <Check className="h-3 w-3" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
