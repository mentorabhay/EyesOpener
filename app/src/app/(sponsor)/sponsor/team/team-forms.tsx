"use client";
import { useActionState } from "react";
import { sponsor as t } from "@/copy/sponsor";
import { add, change } from "./actions";

const m = t.team;

/** The buttons for one person on the team. The server refuses to remove or demote the last owner. */
export function MemberActions({ userId, name, role, lastOwner }: { userId: string; name: string; role: "owner" | "editor"; lastOwner: boolean }) {
  const [state, action, pending] = useActionState(change, null);
  if (lastOwner) return <p className="muted small">{m.lastOwner}</p>;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="userId" value={userId} />
      <div className="row">
        {role === "owner"
          ? <button className="btn btn-sm" name="to" value="editor" disabled={pending} aria-label={m.makeEditorOf(name)}>{m.makeEditor}</button>
          : <button className="btn btn-sm" name="to" value="owner" disabled={pending} aria-label={m.makeOwnerOf(name)}>{m.makeOwner}</button>}
        <button className="btn btn-sm" name="to" value="remove" disabled={pending} aria-label={m.removeOf(name)}>{m.remove}</button>
      </div>
      {state && !state.ok && <p className="notice" data-b="warn" role="status">{state.message}</p>}
    </form>
  );
}

export function AddForm() {
  const [state, action, pending] = useActionState(add, null);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="team-email">{m.add.email}</label>
        <input id="team-email" className="input" type="email" name="email" required maxLength={200} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="team-role">{m.add.role}</label>
        <select id="team-role" name="role" defaultValue="editor">
          <option value="editor">{t.role.editor}</option>
          <option value="owner">{t.role.owner}</option>
        </select>
      </div>
      <div className="row"><button className="btn btn-g" disabled={pending}>{m.add.go}</button></div>
      {state && <p className="notice" data-b={state.ok ? "ok" : "warn"} role="status">{state.message}</p>}
    </form>
  );
}
