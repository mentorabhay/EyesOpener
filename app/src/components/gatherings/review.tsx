/**
 * How the moderation room shows the three kinds of item this package puts in its queue: a Cinema Club listing, a
 * Wish Jam wish and the name of a Wish Jam game. Server-safe. The room's own page draws the card, the hazard
 * screen and the Approve and Remove buttons around these.
 */
import { cinemaClub, CLUB_WEEKDAYS } from "@/copy/cinema-club";
import { wishJam } from "@/copy/wish-jam";
import { timeText } from "@/lib/cinema-club";
import type { GatheringSubject } from "@/lib/gatherings-review";
import { isGameKind, isLove, isPlay } from "@/lib/wish-jam";

const c = cinemaClub.staff.review, w = wishJam.staff.review, list = wishJam.site.list;

/** The rows of the card's list of facts. To be placed inside the room's `<dl className="kv">`. */
export function GatheringRows({ subject: s }: { subject: GatheringSubject }) {
  if (s.of === "club") {
    return (
      <>
        <div><dt>{c.place}</dt><dd>{s.placeName}</dd></div>
        <div><dt>{c.placeKind}</dt><dd>{s.placeKind ? cinemaClub.list.kind[s.placeKind] : ""}</dd></div>
        <div><dt>{c.when}</dt><dd className="tnum">{CLUB_WEEKDAYS[s.weekday]}, {timeText(s.startMinute)}</dd></div>
        <div><dt>{c.by}</dt><dd>{s.sponsor ?? cinemaClub.staff.team}</dd></div>
      </>
    );
  }
  if (s.of === "wish") {
    return (
      <>
        <div><dt>{w.by}</dt><dd>{s.household}</dd></div>
        <div><dt>{w.child}</dt><dd>{s.firstName ?? w.notShown}</dd></div>
        <div><dt>{w.band}</dt><dd>{s.band ? wishJam.band(s.band) : w.unknownBand}</dd></div>
        <div><dt>{list.loves}</dt><dd>{isLove(s.loves) ? wishJam.loves[s.loves] : s.loves}</dd></div>
        <div><dt>{list.play}</dt><dd>{isPlay(s.play) ? wishJam.plays[s.play] : s.play}</dd></div>
        <div><dt>{list.game}</dt><dd>{isGameKind(s.game) ? wishJam.games[s.game] : s.game}</dd></div>
        <div><dt>{w.line}</dt><dd>{s.line || w.noLine}</dd></div>
      </>
    );
  }
  return (
    <>
      <div><dt>{w.by}</dt><dd>{s.household}</dd></div>
      <div><dt>{w.forWish}</dt><dd>{list.code(s.code)}: {isLove(s.loves) ? wishJam.loves[s.loves] : s.loves}</dd></div>
      <div><dt>{w.gameName}</dt><dd>{s.gameName}</dd></div>
    </>
  );
}

/** What the reviewer must look for, and what each button does. */
export function GatheringNote({ subject: s }: { subject: GatheringSubject }) {
  const words = s.of === "club" ? c : w;
  return <><p className="notice" data-b="warn">{words.check}</p><p className="muted small">{words.note}</p></>;
}

/** The card's heading: what the item is, in words. Never a child's name. */
export const gatheringHeading = (s: GatheringSubject) => (s.of === "club" ? c.kind : s.of === "wish" ? `${w.wish} ${s.code}` : `${w.name}, wish ${s.code}`);
