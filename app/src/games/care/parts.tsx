/** Pieces the care companions share: the minutes field, the "not built yet" note, the help line. Server-safe. */
import { Card, Empty } from "@/components/ui";
import { care as t } from "@/copy/games-care";
import { OUTDOOR_MAX, OUTDOOR_MIN } from "@/lib/care";
import styles from "./care.module.css";

/** Minutes outside for one visit. */
export function MinutesField({ id }: { id: string }) {
  return (
    <div className={`field ${styles.short}`}>
      <label htmlFor={id}>{t.outdoor.minutes}</label>
      <input id={id} name="minutes" type="number" inputMode="numeric" min={OUTDOOR_MIN} max={OUTDOOR_MAX} step={1} required aria-describedby={`${id}-hint`} />
      <span id={`${id}-hint`} className="muted small">{t.outdoor.minutesHint}</span>
    </div>
  );
}

/** The camera part of a companion, marked as not built. */
export const CameraNote = ({ text }: { text: string }) => (
  <Card span={12}><Empty title={t.camera.title}><span>{text}</span></Empty></Card>
);

/** Shown to a person who may look but not log (a cheer seat). */
export const LookOnly = () => <p className="muted">{t.lookOnly}</p>;

/** One line that says how to use the companion. Shown once the companion is open. */
export const Help = ({ text }: { text: string }) => <p className="notice">{text}</p>;
