// The full text of a public page, folded at its bottom: open or closed at first as the Look and feel setting says.
import type { ReactNode } from "react";
import { More } from "@/components/guide/more";
import { readDesign } from "@/lib/design/read";

/** The page's one bottom fold. Inside it, one `Fold` per topic (components/guide/more.tsx). */
export async function SiteMore({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  const d = await readDesign();
  return <div className="s-more"><More title={title} hint={hint} open={d.content.foldsOpen}>{children}</More></div>;
}
