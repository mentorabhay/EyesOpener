"use client";
import { useEffect, useState } from "react";
import { sunsetNow } from "@/app/(app)/together/sunset/actions";
import type { SunsetView } from "@/lib/sunset-data";
import { SunsetPanel } from "./sunset-sky";

/**
 * The sunset at the end of a session. It asks the server whether the day's minutes are truly done and shows what
 * the server answers: the sunset, the stop rule's words on a day someone felt unwell, or nothing.
 */
export function SunsetNote() {
  const [view, setView] = useState<SunsetView | null>(null);
  useEffect(() => {
    let here = true;
    sunsetNow().then((v) => { if (here) setView(v); }, () => undefined);
    return () => { here = false; };
  }, []);
  return view ? <SunsetPanel view={view} /> : null;
}
