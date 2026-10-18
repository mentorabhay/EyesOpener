"use client";
import { Trouble } from "@/components/shell/trouble";

/** A page of this area that failed, shown inside the area's frame (audit U3). */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <Trouble error={error} retry={retry} home="/today" />;
}
