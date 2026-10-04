"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

type Team = { id: number; name: string };
type Labels = Record<string, string>;

export function TeamPicker({ teams, current, labels, fields }: { teams: Team[]; current?: number | null; labels: Labels; fields?: Record<string, string> }) {
  return (
    <div className="grid2 collapse">
      <label className="field">{labels.team}
        <select name="teamId" defaultValue={fields?.teamId ?? current ?? ""}>
          <option value="">{labels.noTeam}</option>
          {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
      </label>
      <label className="field">&nbsp;
        <input type="text" name="newTeam" defaultValue={fields?.newTeam} placeholder={labels.newTeamName} aria-label={labels.newTeamName} />
      </label>
    </div>
  );
}

export function PlayerFields({ labels, values, fields, optionalPhone, phoneNote }: {
  labels: Labels; values?: { firstName: string; lastName: string; phone: string }; fields?: Record<string, string>;
  optionalPhone?: boolean; phoneNote?: string | null;
}) {
  const val = (k: "firstName" | "lastName" | "phone") => fields?.[k] ?? values?.[k];
  return (
    <>
      <div className="grid2 collapse">
        <label className="field">{labels.firstName}
          <input type="text" name="firstName" defaultValue={val("firstName")} required autoComplete="off" />
        </label>
        <label className="field">{labels.lastName}
          <input type="text" name="lastName" defaultValue={val("lastName")} autoComplete="off" />
        </label>
      </div>
      <label className="field">{labels.phone}
        <input type="tel" name="phone" defaultValue={val("phone")} required={!optionalPhone} inputMode="tel" autoComplete="off" style={optionalPhone && !val("phone") ? { borderColor: "var(--red)" } : undefined} />
        {phoneNote && <span className="help" style={{ fontWeight: 600, color: "var(--red)" }}>{labels.fileHad.replace("{v}", phoneNote)}</span>}
        <span className="help" style={{ fontWeight: 400 }}>{labels.phoneHelp}{optionalPhone ? ` ${labels.phoneHelpEdit}` : ""}</span>
      </label>
    </>
  );
}

export function AddPlayerForm({ action, tournamentId, teams, teamsEnabled, labels }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; teams: Team[]; teamsEnabled: boolean; labels: Labels;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <Notice state={state} />
      <PlayerFields labels={labels} fields={state.fields} />
      {teamsEnabled && <TeamPicker teams={teams} labels={labels} fields={state.fields} />}
      <button className="btn block" disabled={pending}>{labels.add}</button>
    </form>
  );
}

export function UploadForm({ action, tournamentId, labels }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; labels: Labels;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <Notice state={state} />
      <p className="help">{labels.uploadHelp}</p>
      <a href="/admin/template.csv" className="help" style={{ color: "var(--felt)", fontWeight: 600 }}>{labels.downloadTemplate}</a>
      <input type="file" name="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" required aria-label={labels.chooseFile} />
      <button className="btn ghost block" disabled={pending}>{pending ? "…" : labels.upload}</button>
    </form>
  );
}

export function EditPlayerForm({ action, tournamentId, entryId, teams, teamsEnabled, labels, values, teamId, phoneNote }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; entryId: number; teams: Team[];
  teamsEnabled: boolean; labels: Labels; values: { firstName: string; lastName: string; phone: string }; teamId: number | null;
  phoneNote?: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="entryId" value={entryId} />
      <Notice state={state} />
      <PlayerFields labels={labels} values={values} fields={state.fields} optionalPhone phoneNote={values.phone ? null : phoneNote} />
      {teamsEnabled && <TeamPicker teams={teams} current={teamId} labels={labels} fields={state.fields} />}
      <button className="btn block" disabled={pending}>{labels.save}</button>
    </form>
  );
}

export function ReplaceForm({ action, tournamentId, entryId, labels }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; entryId: number; labels: Labels;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="entryId" value={entryId} />
      <p className="help">{labels.replaceHelp}</p>
      <Notice state={state} />
      <PlayerFields labels={labels} fields={state.fields} />
      <button className="btn amber block" disabled={pending}>{labels.replace}</button>
    </form>
  );
}

type Row = { entryId: number; name: string; phone: string; team: string | null };

export function PlayerList({ rows, base, labels, initialNoPhone = false }: { rows: Row[]; base: string; labels: Labels; initialNoPhone?: boolean }) {
  const [q, setQ] = useState("");
  const [onlyNoPhone, setOnlyNoPhone] = useState(initialNoPhone);
  const needle = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const base1 = onlyNoPhone ? rows.filter((r) => !r.phone) : rows;
  const shown = needle
    ? base1.filter((r) => r.name.toLowerCase().includes(needle) || (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits)))
    : base1;
  const missing = rows.filter((r) => !r.phone).length;
  return (
    <div className="stack">
      <input type="search" placeholder={labels.searchPlayers} aria-label={labels.searchPlayers} value={q} onChange={(e) => setQ(e.target.value)} />
      {missing > 0 && (
        <label className="inline" style={{ minHeight: 36, fontSize: 14, color: "var(--red)" }}>
          {labels.noPhone}: {missing}
          <input type="checkbox" checked={onlyNoPhone} onChange={(e) => setOnlyNoPhone(e.target.checked)} />
        </label>
      )}
      {rows.length === 0 && <p className="help">{labels.noPlayers}</p>}
      <div className="list">
        {shown.map((r) => (
          <Link key={r.entryId} href={`${base}/players/${r.entryId}`} className="item">
            <span className="main">
              <span className="name">{r.name}</span>
              <span className="meta">
                {r.phone || <span className="pill bad" style={{ fontSize: 11, padding: "2px 8px" }}>{labels.noPhone}</span>}
                {r.team ? ` · ${labels.team} ${r.team}` : ""}
              </span>
            </span>
            <span className="icon-btn" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
