"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

// Swipe left = next round, swipe right = previous round (round buttons still work too).
export default function SwipeRounds({ prevHref, nextHref, children }: { prevHref?: string | null; nextHref?: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; ok: boolean } | null>(null);

  return (
    <div
      onTouchStart={(e) => {
        const el = e.target as HTMLElement;
        const t = e.touches[0];
        // Don't hijack swipes that start in a text box or a horizontally scrollable area.
        const ok = !el.closest("input, select, textarea, [data-noswipe]");
        start.current = { x: t.clientX, y: t.clientY, ok };
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        start.current = null;
        if (!s || !s.ok) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
        const href = dx < 0 ? nextHref : prevHref;
        if (href) router.push(href, { scroll: false });
      }}
      style={{ touchAction: "pan-y", display: "flex", flexDirection: "column", gap: 14 }}
    >
      {children}
    </div>
  );
}
