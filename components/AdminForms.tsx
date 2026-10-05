"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

type L = Record<string, string>;

// New co-admin: name, username, password. `hidden` adds extra hidden fields (e.g. tournamentId).
export function NewAdminForm({ action, labels, hidden = {}, submit }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; labels: L; hidden?: Record<string, string | number>; submit: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="stack">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Notice state={state} />
      <label className="field">{labels.fullName}
        <input type="text" name="name" required defaultValue={state.fields?.name} autoComplete="off" />
      </label>
      <label className="field">{labels.loginName}
        <input type="text" name="username" required defaultValue={state.fields?.username} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" />
      </label>
      <label className="field">{labels.tempPassword}
        <input type="text" name="password" required minLength={8} autoComplete="new-password" />
      </label>
      <button className="btn block" disabled={pending}>{submit}</button>
    </form>
  );
}

export function SimpleForm({ action, hidden = {}, children, submit, className = "stack" }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; hidden?: Record<string, string | number>;
  children: React.ReactNode; submit: string; className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Notice state={state} />
      {children}
      <button className="btn ghost" disabled={pending}>{submit}</button>
    </form>
  );
}
