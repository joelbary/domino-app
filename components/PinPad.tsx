"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/admin/actions";

// Numeric keypad that submits once 4 digits are entered.
export default function PinPad({ action, slug, label }: { action: (s: FormState, f: FormData) => Promise<FormState>; slug: string; label: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pin.length === 4) formRef.current?.requestSubmit();
  }, [pin]);
  useEffect(() => {
    if (state.error) setPin("");
  }, [state]);

  const press = (d: string) => setPin((p) => (p.length < 4 ? p + d : p));
  return (
    <form ref={formRef} action={formAction} className="pin-wrap">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="pin" value={pin} />
      <div style={{ fontWeight: 600, color: "#cfd3cb" }}>{label}</div>
      <div className="pin-dots" aria-label={`${pin.length} / 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "on" : ""} />)}
      </div>
      <div className="pin-err" role="alert">{state.error ?? ""}</div>
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button type="button" key={d} onClick={() => press(d)} disabled={pending}>{d}</button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} disabled={pending}>0</button>
        <button type="button" className="plain" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">⌫</button>
      </div>
    </form>
  );
}
