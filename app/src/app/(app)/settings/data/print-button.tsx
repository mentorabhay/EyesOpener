// Eyes Opener: Opens the browser's print window. The print styles of the summary do the rest. .
"use client";

/** Opens the browser's print window. The print styles of the summary do the rest. */
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn" onClick={() => window.print()}>{label}</button>;
}
