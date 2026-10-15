"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/together/StateForm";
import { league as t } from "@/copy/league";
import { dayText } from "@/lib/community";
import { dayOf, nextChangeDay } from "@/lib/league";
import { requireMember, type Member } from "@/lib/session";
import { changeTeam, joinTeam, leaveTeam, type MoveResult } from "@/lib/teams";

/**
 * Runs one move for the active profile. Only a guardian seat outside child mode may move a profile: a child joins
 * because a guardian pressed the button, and the rules in teams.ts check that the guardian's consent stands.
 * Nothing is read from the form: the profile is the active one and the team is never chosen.
 */
async function move(run: (m: Member) => Promise<MoveResult>, did: "joined" | "left" | "changed"): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: t.cannot };
  let result: MoveResult;
  try { result = await run(m); } catch (e) { console.error("league move failed", e); return { ok: false, message: t.errors.failed }; }
  if (!result.ok) {
    const name = m.profile.displayName;
    const message = result.reason === "already" ? t.errors.already
      : result.reason === "not_on_team" ? t.errors.not_on_team
      : result.reason === "too_soon" ? t.errors.too_soon(dayText(nextChangeDay(dayOf(new Date()))))
      : t.blocked[result.reason](name);
    return { ok: false, message };
  }
  revalidatePath("/together/league");
  redirect(`/together/league?did=${did}`);
}

/** Gives the active profile a team in the league of its programme and age band. */
export async function joinLeague(): Promise<FormState> { return move(joinTeam, "joined"); }
/** Takes the active profile off its team. */
export async function leaveLeague(): Promise<FormState> { return move(leaveTeam, "left"); }
/** Moves the active profile to a different team, at most once a week. */
export async function changeLeagueTeam(): Promise<FormState> { return move(changeTeam, "changed"); }
