"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

export default function LoginForm({ labels }: { labels: { password: string; signIn: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="card stack">
      <Notice state={state} />
      <label className="field">
        {labels.password}
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      <button className="btn big block" disabled={pending}>{labels.signIn}</button>
    </form>
  );
}
