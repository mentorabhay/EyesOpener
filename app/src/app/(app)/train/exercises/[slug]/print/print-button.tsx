// Eyes Opener: Opens the browser's print window. The print styles beside this file leave only the card on the paper. .
"use client";

/** Opens the browser's print window. The print styles beside this file leave only the card on the paper. */
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn btn-g" onClick={() => window.print()}>{label}</button>;
}
