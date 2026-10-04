"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Swipe left = next round, swipe right = previous round, with a sliding effect:
// the round's content follows the finger, slides out, and the new round slides in.
// (The round buttons still work as before.)

let pendingEnter: "left" | "right" | null = null; // survives the navigation to the next round

const DURATION = 220;

export default function SwipeRounds({ prevHref, nextHref, pageKey, children }: {
  prevHref?: string | null; nextHref?: string | null; pageKey: string | number; children: React.ReactNode;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; ok: boolean; horizontal: boolean | null } | null>(null);
  const [x, setX] = useState(0);
  const [animate, setAnimate] = useState(false);
  const busy = useRef(false);

  // When a new round arrives after a swipe, slide it in from the side.
  useLayoutEffect(() => {
    if (!pendingEnter) return;
    const width = box.current?.offsetWidth ?? window.innerWidth;
    const from = pendingEnter === "right" ? width : -width;
    pendingEnter = null;
    setAnimate(false);
    setX(from);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true);
        setX(0);
        busy.current = false;
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [pageKey]);

  useEffect(() => {
    busy.current = false;
  }, [pageKey]);

  const onStart = (e: React.TouchEvent) => {
    if (busy.current) return;
    const el = e.target as HTMLElement;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, ok: !el.closest("input, select, textarea, [data-noswipe]"), horizontal: null };
  };

  const onMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s || !s.ok) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
    }
    if (!s.horizontal) return;
    const blocked = (dx < 0 && !nextHref) || (dx > 0 && !prevHref);
    setAnimate(false);
    setX(blocked ? dx * 0.25 : dx); // rubber-band when there's no round that way
  };

  const onEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.ok || !s.horizontal) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const width = box.current?.offsetWidth ?? window.innerWidth;
    const href = dx < 0 ? nextHref : prevHref;
    setAnimate(true);
    if (href && Math.abs(dx) > Math.min(90, width * 0.22)) {
      busy.current = true;
      setX(dx < 0 ? -width : width); // slide out
      pendingEnter = dx < 0 ? "right" : "left";
      setTimeout(() => router.push(href, { scroll: false }), DURATION);
    } else {
      setX(0); // snap back
    }
  };

  return (
    <div style={{ overflowX: "clip" }}>
      <div
        ref={box}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={() => { start.current = null; setAnimate(true); setX(0); }}
        style={{
          touchAction: "pan-y",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          transform: `translateX(${x}px)`,
          transition: animate ? `transform ${DURATION}ms ease-out` : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
