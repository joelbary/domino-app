"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

export default function AddTeamForm({ action, tournamentId, labels }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; labels: { teamName: string; addTeam: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      {state.error && <Notice state={state} />}
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input type="text" name="name" placeholder={labels.teamName} aria-label={labels.teamName} required />
        <button className="btn" disabled={pending} style={{ flex: "none" }}>{labels.addTeam}</button>
      </div>
    </form>
  );
}
