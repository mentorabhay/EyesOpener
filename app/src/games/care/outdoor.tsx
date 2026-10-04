/**
 * Sky Spotter: a visit outdoors, logged for the active profile. The minutes go to the Light ring.
 */
import { Card, Chip } from "@/components/ui";
import { care as t, help } from "@/copy/games-care";
import { outdoorEntries, outdoorOn } from "@/lib/care";
import { todayKey, type Member } from "@/lib/session";
import { outdoorLog } from "./actions";
import { Sky } from "./art";
import styles from "./care.module.css";
import { CareForm } from "./form";
import { Help, LookOnly, MinutesField } from "./parts";
import { skyFound, skyThings } from "./picks";

/** A safety line shown wherever time outdoors is logged. */
export const SunLine = () => <p className="muted small">{t.outdoor.sun}</p>;

export async function SkyPanel({ m }: { m: Member }) {
  const today = todayKey(), things = skyThings(today);
  const [entries, minutes] = await Promise.all([outdoorEntries(m, "sky-spotter", today, today), outdoorOn(m, today)]);
  const before = skyFound(entries), found = things.filter((x) => before.has(x.id)).length;
  return (
    <div className="bento">
      <div className="span12"><Help text={help["sky-spotter"]} /></div>
      <Card title={t.sky.title} span={5} right={<Chip tone={found ? "ok" : "plain"}>{t.sky.found(found)}</Chip>}>
        <Sky found={found} label={t.sky.alt(found)} />
        <p>{t.sky.intro}</p>
        <p className="muted">{t.outdoor.todayTotal(minutes)}</p>
        <SunLine />
      </Card>
      <Card span={7}>
        {m.can("train") ? (
          <CareForm action={outdoorLog} submit={t.sky.save} fields={{ slug: "sky-spotter" }}>
            <fieldset className={styles.group}>
              <legend>{t.sky.legend}</legend>
              <div className={styles.ticks}>
                {things.map((x) => before.has(x.id)
                  ? <span key={x.id} className={styles.tick} data-found="">{x.label}<b>{t.sky.foundMark}</b></span>
                  : <label key={x.id} className={styles.tick}><input type="checkbox" name="found" value={x.id} />{x.label}</label>)}
              </div>
            </fieldset>
            <MinutesField id="sky-minutes" />
          </CareForm>
        ) : <LookOnly />}
      </Card>
    </div>
  );
}
