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

type Book = { id: number; first: string; last: string; phone: string; hasPhone: boolean; inTournament: boolean };

const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Add one player. Typing a name suggests matches from the address book; picking one fills the phone.
export function AddPlayerForm({ action, tournamentId, teams, teamsEnabled, labels, book = [] }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; teams: Team[]; teamsEnabled: boolean; labels: Labels; book?: Book[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [picked, setPicked] = useState<Book | null>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setFirst(""); setLast(""); setPicked(null);
    }
  }, [state]);
  const q = fold(`${first} ${last}`);
  const hits = !picked && q.length >= 2
    ? book.filter((b) => !b.inTournament && fold(`${b.first} ${b.last}`).includes(q)).slice(0, 6)
    : [];
  return (
    <form ref={ref} action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      {picked && <input type="hidden" name="playerId" value={picked.id} />}
      <Notice state={state} />
      {picked ? (
        <div className="notice ok" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>{labels.usingBook.replace("{name}", `${picked.first} ${picked.last}`)}</span>
          <span style={{ fontWeight: 500 }}>{picked.phone || labels.noPhone}</span>
          <button type="button" className="btn small dark" style={{ alignSelf: "flex-start" }} onClick={() => setPicked(null)}>{labels.clearPick}</button>
        </div>
      ) : (
        <>
          <div className="grid2 collapse">
            <label className="field">{labels.firstName}
              <input type="text" name="firstName" value={first} onChange={(e) => setFirst(e.target.value)} required autoComplete="off" />
            </label>
            <label className="field">{labels.lastName}
              <input type="text" name="lastName" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="off" />
            </label>
          </div>
          {hits.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              <span className="help" style={{ fontWeight: 600 }}>{labels.pickFromBook}</span>
              {hits.map((b) => (
                <button key={b.id} type="button" className="item" style={{ border: "2px solid var(--felt)", cursor: "pointer", textAlign: "left" }} onClick={() => setPicked(b)}>
                  <span className="main"><span className="name">{b.first} {b.last}</span><span className="meta">{b.phone || labels.noPhone}</span></span>
                  <span className="btn small" style={{ flex: "none" }}>{labels.useThis}</span>
                </button>
              ))}
            </div>
          )}
          <label className="field">{labels.phone}
            <input type="tel" name="phone" defaultValue={state.fields?.phone} inputMode="tel" autoComplete="off" />
            <span className="help" style={{ fontWeight: 400 }}>{labels.phoneHelp}</span>
          </label>
        </>
      )}
      {teamsEnabled && <TeamPicker teams={teams} labels={labels} fields={state.fields} />}
      <button className="btn block" disabled={pending}>{labels.add}</button>
    </form>
  );
}

// Add several players from the address book at once (checkboxes + search).
export function AddFromBook({ action, tournamentId, teams, teamsEnabled, labels, book }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; tournamentId: number; teams: Team[]; teamsEnabled: boolean; labels: Labels; book: Book[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (state.ok) setSel(new Set());
  }, [state]);
  const needle = fold(q);
  const list = book.filter((b) => !needle || fold(`${b.first} ${b.last}`).includes(needle));
  const toggle = (id: number) => setSel((s0) => {
    const s1 = new Set(s0);
    if (s1.has(id)) s1.delete(id); else s1.add(id);
    return s1;
  });
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      {[...sel].map((id) => <input key={id} type="hidden" name="playerIds" value={id} />)}
      <Notice state={state} />
      <p className="help">{labels.fromBookHelp}</p>
      <input type="search" placeholder={labels.searchBook} aria-label={labels.searchBook} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list" style={{ maxHeight: 340, overflowY: "auto", gap: 4 }} data-noswipe>
        {list.map((b) => (
          <label key={b.id} className="item" style={{ cursor: b.inTournament ? "default" : "pointer", opacity: b.inTournament ? 0.5 : 1, background: "var(--ground)" }}>
            <input type="checkbox" checked={b.inTournament || sel.has(b.id)} disabled={b.inTournament} onChange={() => toggle(b.id)} />
            <span className="main">
              <span className="name">{b.first} {b.last}</span>
              <span className="meta">{b.inTournament ? labels.alreadyIn : b.phone || labels.noPhone}</span>
            </span>
          </label>
        ))}
      </div>
      {teamsEnabled && <TeamPicker teams={teams} labels={labels} />}
      <button className="btn block" disabled={pending || sel.size === 0}>{labels.addSelected.replace("{n}", String(sel.size))}</button>
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
      {labels.uploadNoPhoneHelp && <p className="help">{labels.uploadNoPhoneHelp}</p>}
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
