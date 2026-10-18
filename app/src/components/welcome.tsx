/** The new household's three first steps on Today (lib/welcome.ts). Server-safe. */
import { Btn, Card } from "@/components/ui";
import { today as t } from "@/copy/today";
import type { Welcome } from "@/lib/welcome";

export function WelcomeCard({ w }: { w: Welcome }) {
  const c = t.welcome;
  const steps = [
    { key: "people", done: w.people, ...c.people, href: "/settings/profiles/new" },
    { key: "setup", done: w.setup, ...c.setup, href: "/setup" },
    { key: "check", done: w.check, ...c.check, href: "/test" },
  ];
  const next = steps.find((s) => !s.done && s.key !== "people")?.key;
  return (
    <Card title={c.title}>
      <p className="small">{c.sub}</p>
      <ol className="welcome-steps">
        {steps.map((s) => (
          <li key={s.key} data-done={s.done || undefined}>
            <b>{s.title}</b>
            <span className="small muted">{s.text}</span>
            {s.done ? <span className="small">{c.done}</span> : <Btn href={s.href} kind={s.key === next ? "g" : ""} small>{s.go}</Btn>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
