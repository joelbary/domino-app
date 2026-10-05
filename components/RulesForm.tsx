"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";
import Notice from "@/components/Notice";

export default function RulesForm({ action, hidden = {}, text, file, labels }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; hidden?: Record<string, string | number>;
  text: string; file: { url: string; name: string } | null; labels: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Notice state={state} />
      <fieldset>
        <legend>{labels.rulesText}</legend>
        <textarea name="text" defaultValue={text} rows={14} className="rules-area" placeholder={labels.rulesPlaceholder} />
        <p className="help">{labels.rulesTextHelp}</p>
      </fieldset>
      <fieldset>
        <legend>{labels.rulesFile}</legend>
        {file && (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn ghost small" style={{ alignSelf: "flex-start" }}>{labels.currentFile}: {file.name}</a>
        )}
        <input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label={labels.rulesFile} />
        <p className="help">{labels.rulesFileHelp}</p>
        {file && (
          <label className="inline" style={{ fontWeight: 500, fontSize: 14 }}>{labels.removeFile}
            <input type="checkbox" name="removeFile" />
          </label>
        )}
      </fieldset>
      <button className="btn big block" disabled={pending}>{pending ? "…" : labels.save}</button>
    </form>
  );
}
