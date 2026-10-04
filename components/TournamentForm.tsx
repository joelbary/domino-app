"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

export type TournamentValues = {
  id?: number; name: string; slug: string; eventDate: string; gamesCount: number;
  rotationMode: "RANDOM" | "SWISS"; randomRoundsFirst: number; teamsEnabled: boolean;
  teamMinSize: number; teamMaxSize: number; timerEnabled: boolean; roundMinutes: number;
  hasLogo: boolean; logoUrl: string;
};

export type TournamentLabels = Record<
  | "basics" | "name" | "webAddress" | "slugHelp" | "date" | "eventLogo" | "uploadLogo" | "removeLogo" | "logoHelp"
  | "gamesRotation" | "numberOfGames" | "rotation" | "randomOnly" | "randomSwiss" | "swissAfter" | "rotationHelp"
  | "teams" | "alsoTeams" | "minPerTeam" | "maxPerTeam" | "timer" | "useTimer" | "minutesPerRound" | "submit" | "footer",
  string
>;

export default function TournamentForm({
  action, initial, labels, initialState = {},
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initial: TournamentValues; labels: TournamentLabels; initialState?: FormState;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, initialState);
  const [mode, setMode] = useState(initial.rotationMode);
  const [teamsOn, setTeamsOn] = useState(initial.teamsEnabled);
  const [timerOn, setTimerOn] = useState(initial.timerEnabled);
  const [preview, setPreview] = useState<string | null>(null);
  const L = labels;
  const f = state.fields;
  const v = (k: keyof TournamentValues) => (f && k in f ? f[k as string] : String(initial[k] ?? ""));
  useEffect(() => {
    if (state.error) setPreview(null);
  }, [state]);

  return (
    <form action={formAction} className="stack">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.id && <input type="hidden" name="originalSlug" value={initial.slug} />}
      <Notice state={state} />

      <fieldset>
        <legend>{L.basics}</legend>
        <label className="field">{L.name}
          <input type="text" name="name" defaultValue={v("name")} required maxLength={80} />
        </label>
        <label className="field">{L.webAddress}
          <span className="prefix">
            <span>domino.joelbary.com/</span>
            <input type="text" name="slug" defaultValue={v("slug")} required pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,29}" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </span>
          <span className="help" style={{ fontWeight: 400 }}>{L.slugHelp}</span>
        </label>
        <label className="field">{L.date}
          <input type="date" name="eventDate" defaultValue={v("eventDate")} />
        </label>
        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{L.eventLogo}</span>
          <div className="row">
            <div className="logo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview ?? initial.logoUrl} alt="" />
            </div>
            <label className="btn ghost" style={{ flex: 1, minWidth: 180 }}>
              {L.uploadLogo}
              <input
                type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
          </div>
          <span className="help">{L.logoHelp}</span>
          {initial.hasLogo && (
            <label className="inline" style={{ fontWeight: 500, fontSize: 14 }}>{L.removeLogo}
              <input type="checkbox" name="removeLogo" />
            </label>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>{L.gamesRotation}</legend>
        <label className="inline">{L.numberOfGames}
          <input type="number" name="gamesCount" className="short" min={1} max={20} defaultValue={v("gamesCount")} />
        </label>
        <div className="seg" role="radiogroup" aria-label={L.rotation}>
          <label><input type="radio" name="rotationMode" value="RANDOM" checked={mode === "RANDOM"} onChange={() => setMode("RANDOM")} />{L.randomOnly}</label>
          <label><input type="radio" name="rotationMode" value="SWISS" checked={mode === "SWISS"} onChange={() => setMode("SWISS")} />{L.randomSwiss}</label>
        </div>
        {mode === "SWISS" && (
          <label className="inline">{L.swissAfter}
            <input type="number" name="randomRoundsFirst" className="short" min={1} max={19} defaultValue={v("randomRoundsFirst")} />
          </label>
        )}
        <p className="help">{L.rotationHelp}</p>
      </fieldset>

      <fieldset>
        <legend>{L.teams}</legend>
        <label className="inline">{L.alsoTeams}
          <input type="checkbox" name="teamsEnabled" checked={teamsOn} onChange={(e) => setTeamsOn(e.target.checked)} />
        </label>
        {teamsOn && (
          <div className="grid2">
            <label className="field">{L.minPerTeam}
              <input type="number" name="teamMinSize" min={2} max={50} defaultValue={v("teamMinSize")} style={{ textAlign: "center", fontWeight: 700 }} />
            </label>
            <label className="field">{L.maxPerTeam}
              <input type="number" name="teamMaxSize" min={2} max={50} defaultValue={v("teamMaxSize")} style={{ textAlign: "center", fontWeight: 700 }} />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>{L.timer}</legend>
        <label className="inline">{L.useTimer}
          <input type="checkbox" name="timerEnabled" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} />
        </label>
        {timerOn && (
          <label className="inline">{L.minutesPerRound}
            <input type="number" name="roundMinutes" className="short" min={5} max={180} defaultValue={v("roundMinutes")} />
          </label>
        )}
      </fieldset>

      <button className="btn big block" disabled={pending}>{L.submit}</button>
      {L.footer && <p className="help" style={{ textAlign: "center" }}>{L.footer}</p>}
    </form>
  );
}
