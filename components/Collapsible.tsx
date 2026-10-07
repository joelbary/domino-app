"use client";

import { useState } from "react";

// A <details> section that remembers being opened, even when the page refreshes its data.
export default function Collapsible({ summary, initialOpen = false, className = "card disclose", children }: {
  summary: React.ReactNode; initialOpen?: boolean; className?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details className={className} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
