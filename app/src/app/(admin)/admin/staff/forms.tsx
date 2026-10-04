"use client";
import { useActionState } from "react";
import { admin } from "@/copy/admin";
import type { StaffRole } from "@/lib/roles";
import css from "../admin.module.css";
import { AnswerForm } from "../answer-form";
import { changeRole, giveRole } from "./actions";

const t = admin.staff;
const ROLES: StaffRole[] = ["ops", "content", "super_admin"];
const options = ROLES.map((r) => <option key={r} value={r}>{admin.roles[r]}</option>);

export function GiveRoleForm() {
  return (
    <AnswerForm action={giveRole} submit={t.give.submit} dark>
      <div className="field">
        <label htmlFor="staff-email">{t.give.email}</label>
        <input id="staff-email" className="input" type="email" name="email" required maxLength={200} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="staff-role">{t.give.role}</label>
        <select id="staff-role" name="role" defaultValue="ops">{options}</select>
      </div>
    </AnswerForm>
  );
}

/** Change or remove one person's role. A refusal is shown under the controls; a change that works redraws the row. */
export function RoleControls({ id, name, role, removable }: { id: string; name: string; role: StaffRole; removable: boolean }) {
  const [state, run, pending] = useActionState(changeRole, null);
  return (
    <div className="stack">
      <form action={run} className={`field ${css.inline}`}>
        <input type="hidden" name="id" value={id} />
        <select name="role" defaultValue={role} aria-label={t.roleLabel(name)}>{options}</select>
        <button className="btn btn-sm" disabled={pending}>{t.save}</button>
      </form>
      {removable && (
        <details className={css.confirm}>
          <summary className="btn btn-sm" aria-label={`${t.remove}: ${name}`}>{t.remove}</summary>
          <form action={run} className="stack">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="role" value="none" />
            <p className="small">{t.removeWarn(name)}</p>
            <div><button className="btn btn-sm btn-d" disabled={pending}>{t.removeYes}</button></div>
          </form>
        </details>
      )}
      <div role="status">{state && !state.ok && <p className="notice" data-b="warn">{state.message}</p>}</div>
    </div>
  );
}
