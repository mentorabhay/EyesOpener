import type { Metadata } from "next";
import { Card, PageHead } from "@/components/ui";
import s from "@/components/together/together.module.css";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { percent } from "@/engine";
import { wallFor } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.wall;
const idea = ideaBySlug("focus-wall")!;
export const metadata: Metadata = { title: idea.name };
const COLS = 8;
/** Where a tile's slice of the shared gradient sits, as a background position in percent. */
const slice = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);

export default async function WallPage() {
  const m = await requireMember();
  const found = await wallFor();
  if (!found) {
    return (
      <>
        <PageHead title={idea.name} sub={idea.what} crumb={[together.crumb]} />
        <p className="notice">{t.noWall}</p>
      </>
    );
  }
  const { wall, sharp } = found;
  const family = new Set(m.profiles.map((p) => p.id));
  const owner = new Map(sharp.filter((x) => x.idx < wall.tiles).map((x) => [x.idx, x.profileId]));
  const ours = [...owner.values()].filter((id) => id && family.has(id)).length;
  const rows = Math.ceil(wall.tiles / COLS);

  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[{ value: percent(owner.size / wall.tiles), label: t.stats.focus }, { value: ours, label: t.stats.ours }]}
      />
      <div className="bento">
        <Card title={wall.title} right={<span className="small muted">{t.by(wall.artist)}</span>} span={8}>
          <div className={s.wall} role="img" aria-label={t.grid(owner.size, wall.tiles)}>
            {Array.from({ length: wall.tiles }, (_, i) => {
              const by = owner.get(i);
              return owner.has(i)
                ? <i key={i} data-sharp="" data-ours={by && family.has(by) ? "" : undefined}
                    style={{ backgroundSize: `${COLS * 100}% ${rows * 100}%`, backgroundPosition: `${slice(i % COLS, COLS)}% ${slice(Math.floor(i / COLS), rows)}%` }} />
                : <i key={i} />;
            })}
          </div>
          <p className="tnum">{t.grid(owner.size, wall.tiles)}</p>
          <p className="muted small">{t.key}</p>
          <p className="notice">{t.picture}</p>
        </Card>
      </div>
    </>
  );
}
