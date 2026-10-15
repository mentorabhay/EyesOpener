import type { ReactNode } from "react";
import css from "./form.module.css";

/** A two-step action with no client code: the first button opens the warning and the real button. */
export function Confirm({ ask, warn, children }: { ask: string; warn: string; children: ReactNode }) {
  return (
    <details className={css.confirm}>
      <summary className="btn btn-sm">{ask}</summary>
      <div className="stack"><p className="small">{warn}</p>{children}</div>
    </details>
  );
}
