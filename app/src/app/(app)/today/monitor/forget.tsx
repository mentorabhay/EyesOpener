// Eyes Opener: Deleting the monitor's numbers: one press to open, one to confirm. .
"use client";
/** Deleting the monitor's numbers: one press to open, one to confirm. */
import { useActionState } from "react";
import { monitor as t } from "@/copy/monitor";
import { monitorForget, type Forgot } from "./actions";

export function Forget({ name }: { name: string }) {
  const [state, action, busy] = useActionState<Forgot, FormData>(monitorForget, null);
  return (
    <div className="stack">
      <details>
        <summary className="btn btn-sm" style={{ display: "inline-flex" }}>{t.data.forget}</summary>
        <form action={action} className="stack" style={{ marginTop: 10 }}>
          <p className="small">{t.data.forgetNote(name)}</p>
          <input type="hidden" name="sure" value="yes" />
          <div className="row"><button type="submit" className="btn btn-sm btn-d" disabled={busy}>{t.data.confirm}</button></div>
        </form>
      </details>
      <p role="status" className="small">{state ? (state.ok ? t.data.forgotten(state.samples) : t.data.failed) : ""}</p>
    </div>
  );
}
