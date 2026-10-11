// Eyes Opener: A two-step action with no client code: the first button opens the warning and the real button. .
import type { ReactNode } from "react";
import css from "./admin.module.css";

/** A two-step action with no client code: the first button opens the warning and the real button. */
export function Confirm({ ask, label, warn, children }: { ask: string; label?: string; warn: string; children: ReactNode }) {
  return (
    <details className={css.confirm}>
      <summary className="btn btn-sm" aria-label={label}>{ask}</summary>
      <div className="stack"><p className="small">{warn}</p>{children}</div>
    </details>
  );
}

/** A pattern or an id, set in a fixed-width face so every letter can be told apart. */
export const Code = ({ children }: { children: ReactNode }) => <code className={css.code}>{children}</code>;
