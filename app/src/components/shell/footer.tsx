/** The footer of every signed-in page: the copyright, the pages about Eyes Opener, and that it is not a medical device. */
import Link from "next/link";
import { common } from "@/copy/common";

export function AppFooter() {
  const f = common.shell.footer;
  const links = [["/privacy", f.links.privacy], ["/terms", f.links.terms], ["/childrens-data", f.links.children], ["/safety", f.links.safety], ["/evidence", f.links.evidence]] as const;
  return (
    <footer className="appfoot">
      <nav aria-label={f.label} className="appfoot-links">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <p className="appfoot-note">{common.notMedical}</p>
      <p className="appfoot-copy">{f.copyright(new Date().getFullYear())}</p>
    </footer>
  );
}
