// Eyes Opener: Brand and Logo Management console in the Admin portal.
import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { requireStaff } from "@/lib/auth";
import { LogoSlotCard } from "./upload-card";

export const generateMetadata = (): Metadata => ({ title: "Brand & Logos · Admin" });

const LOGO_SLOTS = [
  {
    id: "mark",
    title: "Square App Mark / Brand Emblem",
    purpose: "Used in portal navigation, app icons, and square avatar displays.",
    dimensions: "512 × 512 px",
    aspect: "1 : 1 (Square)",
    format: "PNG (Alpha Transparency)",
    safeArea: "Inner 420×420 px circle (approx 10-15% padding)",
    previewUrl: "/Images/logo-mark.png",
  },
  {
    id: "logo_light",
    title: "Horizontal Logo (Light Backgrounds)",
    purpose: "Primary web header, invoices, and light mode brand headers.",
    dimensions: "720 × 200 px",
    aspect: "3.6 : 1",
    format: "PNG (Alpha Transparency)",
    safeArea: "15% vertical margins, emblem on left + text on right",
    previewUrl: "/Images/logo-horizontal-light.png",
  },
  {
    id: "logo_dark",
    title: "Horizontal Logo (Dark Backgrounds)",
    purpose: "Cinema player, dark mode pages, and TV headers.",
    dimensions: "720 × 200 px",
    aspect: "3.6 : 1",
    format: "PNG (Alpha Transparency)",
    safeArea: "White text, 15% vertical margins",
    previewUrl: "/Images/logo-horizontal-dark.png",
    darkBg: true,
  },
  {
    id: "favicon",
    title: "Web Favicon",
    purpose: "Browser tab icon and address bar indicator.",
    dimensions: "16×16, 32×32, 48×48 px",
    aspect: "1 : 1 (Square)",
    format: "ICO or PNG",
    safeArea: "High contrast icon mark fitting edge-to-edge",
    previewUrl: "/Images/logo-mark.png",
  },
  {
    id: "apple",
    title: "Apple Touch Icon (iOS Home Screen)",
    purpose: "Displayed when bookmarked on iPhone/iPad home screen.",
    dimensions: "180 × 180 px",
    aspect: "1 : 1 (Square)",
    format: "PNG (Solid / Opaque)",
    safeArea: "Inner 150×150 px. Solid background required (no transparency)",
    previewUrl: "/apple-icon.png",
  },
  {
    id: "tv_banner",
    title: "Android TV Leanback Banner",
    purpose: "Android TV launcher app tile and TV Play Store listing.",
    dimensions: "320 × 180 px",
    aspect: "16 : 9",
    format: "PNG or JPEG (Solid)",
    safeArea: "Dark navy background (#101220), centered 10-foot UI lockup",
    previewUrl: "/Images/logo-horizontal-dark.png",
    darkBg: true,
  },
];

export default async function AdminBrandingPage() {
  await requireStaff("overview");

  return (
    <>
      <PageHead
        title="Brand & Logo Asset Manager"
        sub="Manage, review specifications, and upload high-resolution replacement assets for each platform screen."
        crumb={[{ href: "/admin", label: t.back }]}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "20px",
        marginTop: "20px",
      }}>
        {LOGO_SLOTS.map((slot) => (
          <LogoSlotCard key={slot.id} {...slot} />
        ))}
      </div>
    </>
  );
}
