"use client";

import { useActionState } from "react";
import { playerSignIn, type PlayState } from "@/app/play-actions";

export default function PhoneSignIn({ back, labels }: { back: string; labels: { phone: string; enter: string; help: string } }) {
  const [state, action, pending] = useActionState<PlayState, FormData>(playerSignIn, {});
  return (
    <form action={action} className="card stack" style={{ borderRadius: 18 }}>
      <input type="hidden" name="back" value={back} />
      <label className="field" style={{ fontSize: 15 }}>{labels.phone}
        <input type="tel" name="phone" inputMode="tel" autoComplete="tel" required style={{ height: 56, fontSize: 22, fontWeight: 600, borderColor: "var(--felt)" }} />
      </label>
      {state.error && <div className="notice bad" role="alert">{state.error}</div>}
      <button className="btn big block" disabled={pending}>{labels.enter}</button>
      <p className="help" style={{ textAlign: "center" }}>{labels.help}</p>
    </form>
  );
}
