/**
 * What the search in the top bar can find (src/components/shell/search.tsx): the pages of the menu and a few more, every
 * game, every exercise and every check-up a member may open. Words are in the reader's language; game and exercise
 * names are names and stay as they are. Items staff have hidden from members are left out, as in the library.
 */
import { exercises, games, tests } from "@/data";
import { exerciseWords, gameWords, testWords } from "@/data/words";
import { notify } from "@/copy/notify";
import { readStatuses } from "@/lib/catalogue";
import type { Member } from "@/lib/session";
import { isListed, statusOf } from "@/lib/status";

export type SearchKind = "page" | "game" | "exercise" | "checkup";
export interface SearchItem { kind: SearchKind; label: string; href: string; hint?: string }

export async function searchIndex(m: Member, pages: readonly { href: string; label: string }[]): Promise<SearchItem[]> {
  const statuses = await readStatuses();
  const listed = (kind: "game" | "exercise", slug: string) => isListed(statusOf(statuses, kind, slug), m.tester);
  const more = m.childMode ? [] : [
    { href: "/settings/reminders", label: notify.page.title },
    { href: "/today/notifications", label: notify.list.title },
  ];
  const seen = new Set<string>();
  const page = [...pages, ...more].filter((p) => !seen.has(p.href) && seen.add(p.href)).map((p): SearchItem => ({ kind: "page", label: p.label, href: p.href }));
  return [
    ...page,
    ...games.filter((g) => listed("game", g.slug)).map((g): SearchItem => ({ kind: "game", label: g.name, href: `/train/games/${g.slug}`, hint: gameWords(g)?.purpose })),
    ...exercises.filter((e) => listed("exercise", e.slug)).map((e): SearchItem => ({ kind: "exercise", label: e.name, href: `/train/exercises/${e.slug}`, hint: exerciseWords(e)?.purpose })),
    ...tests.filter((t) => t.built).map((t): SearchItem => ({ kind: "checkup", label: testWords(t).name, href: `/test/${t.key}`, hint: testWords(t).what })),
  ];
}
