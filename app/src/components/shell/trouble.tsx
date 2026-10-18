"use client";
import Link from "next/link";
import { useEffect } from "react";
import { common } from "@/copy/common";

const t = common.trouble;

/**
 * A page that failed, drawn inside the app's own frame (audit U3): a plain sentence, Try again, the way back to the
 * start of this area, and the short code the server wrote in its log for this failure, so staff can find it.
 * The error's own message is never shown: from the server it is generic, and it may name things a family need not see.
 */
export function Trouble({ error, retry, home }: { error: Error & { digest?: string }; retry: () => void; home: string }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="trouble" role="alert">
      <h1>{t.title}</h1>
      <p className="muted">{t.sub}</p>
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="btn btn-g" onClick={() => retry()}>{t.again}</button>
        <Link className="btn" href={home}>{t.home}</Link>
      </div>
      {error.digest && <p className="muted small">{t.ref(error.digest)}</p>}
    </div>
  );
}
