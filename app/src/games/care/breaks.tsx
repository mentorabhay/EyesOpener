// Eyes Opener: Blink Garden and Far Window: short breaks, self-reported. A finished break is one entry in the care log.
/**
 * Blink Garden and Far Window: short breaks, self-reported. A finished break is one entry in the care log
 * and one step on the Rest ring, up to twelve a day. The camera parts are not built.
 */
import { Card, Chip } from "@/components/ui";
import { care as t, help } from "@/copy/games-care";
import { BLINK_PARTS, BLINKS_IN_SET, breaksOf, FAR_FINDS, FAR_SECONDS, weekStart } from "@/lib/care";
import { todayKey, type Member } from "@/lib/session";
import { FarView, Plant } from "./art";
import { BlinkGuide } from "./blink-guide";
import styles from "./care.module.css";
import { FarBreak } from "./far-break";
import { CameraNote, Help, LookOnly } from "./parts";

export async function BlinkPanel({ m }: { m: Member }) {
  const today = todayKey(), b = await breaksOf(m, today, weekStart(today));
  return (
    <div className="bento">
      <div className="span12"><Help text={help["blink-garden"]} /></div>
      <Card title={t.blink.routineTitle} span={7}>
        <p>{t.blink.intro}</p>
        {m.can("train") ? <BlinkGuide blinks={BLINKS_IN_SET} parts={[...BLINK_PARTS]} /> : <LookOnly />}
      </Card>
      <Card title={t.blink.gardenTitle} span={5} right={<Chip>{t.breaks.today(b.today)}</Chip>}>
        <div className={styles.figure}><Plant leaves={b.blinkSets} label={t.blink.gardenAlt(b.blinkSets)} /></div>
        <p>{t.blink.leaves(b.blinkSets)}</p>
      </Card>
      <CameraNote text={t.camera["blink-garden"]} />
    </div>
  );
}

export async function FarPanel({ m }: { m: Member }) {
  const today = todayKey(), b = await breaksOf(m, today, today);
  return (
    <div className="bento">
      <div className="span12"><Help text={help["far-window"]} /></div>
      <Card title={t.far.routineTitle} span={7}>
        <p>{t.far.intro}</p>
        {m.can("train") ? <FarBreak seconds={FAR_SECONDS} finds={FAR_FINDS} /> : <LookOnly />}
      </Card>
      <Card title={t.far.windowTitle} span={5} right={<Chip>{t.breaks.today(b.today)}</Chip>}>
        <FarView label={t.far.windowAlt} />
        <p>{t.far.farToday(b.farToday)}</p>
      </Card>
      <CameraNote text={t.camera["far-window"]} />
    </div>
  );
}
