"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

export function BookAddForm({ action, labels }: { action: (s: FormState, f: FormData) => Promise<FormState>; labels: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="stack">
      <Notice state={state} />
      <div className="grid2 collapse">
        <label className="field">{labels.firstName}<input type="text" name="firstName" required defaultValue={state.fields?.firstName} autoComplete="off" /></label>
        <label className="field">{labels.lastName}<input type="text" name="lastName" defaultValue={state.fields?.lastName} autoComplete="off" /></label>
      </div>
      <label className="field">{labels.phone}
        <input type="tel" name="phone" inputMode="tel" defaultValue={state.fields?.phone} autoComplete="off" />
        <span className="help" style={{ fontWeight: 400 }}>{labels.phoneHelp}</span>
      </label>
      <button className="btn block" disabled={pending}>{labels.addToBook}</button>
    </form>
  );
}

export function BookUploadForm({ action, labels }: { action: (s: FormState, f: FormData) => Promise<FormState>; labels: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      <Notice state={state} />
      <p className="help">{labels.uploadHelp}</p>
      <a href="/admin/template.csv" className="help" style={{ color: "var(--felt)", fontWeight: 600 }}>{labels.downloadTemplate}</a>
      <input type="file" name="file" accept=".xlsx,.csv" required aria-label={labels.chooseFile} />
      <button className="btn ghost block" disabled={pending}>{pending ? "…" : labels.upload}</button>
    </form>
  );
}
