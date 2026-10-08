/** The dark panel beside the Log in, Register and "Can't sign in?" forms: what IOpener is, in a few words. */
import Link from "next/link";
import { marketing } from "@/copy/marketing";
import { site } from "@/copy/site";
import css from "./login/login.module.css";

export function Brand() {
  const t = marketing.brand;
  return (
    <aside className={css.brand} aria-label={site.name}>
      <svg className={css.threads} viewBox="0 0 400 240" aria-hidden="true">
        <path d="M-10 60 C 90 10, 160 150, 260 90 S 380 40, 410 120" stroke="#ff0000" />
        <path d="M-10 160 C 90 210, 170 60, 260 130 S 380 190, 410 110" stroke="#00ffff" />
      </svg>
      <Link href="/" className={css.brandName}>{site.name}</Link>
      <h2 className={css.brandTitle}>{t.title}</h2>
      <p className={css.brandLead}>{t.lead}</p>
      <ul className={css.brandList}>{t.points.map((x) => <li key={x}>{x}</li>)}</ul>
    </aside>
  );
}
