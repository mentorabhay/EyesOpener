"use client";

/** Opens the browser's print window. The print styles of the summary do the rest. */
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn btn-g" onClick={() => window.print()}>{label}</button>;
}
