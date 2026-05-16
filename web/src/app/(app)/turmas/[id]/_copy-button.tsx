"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" className="text-xs px-2 py-1 h-auto" onClick={handleCopy}>
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  );
}
