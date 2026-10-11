// Eyes Opener: Server actions for uploading and replacing official brand logo assets in the admin portal.
"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";

const PUBLIC_IMG_DIR = path.join(process.cwd(), "public", "Images");

const SLOT_FILES: Record<string, string> = {
  mark: "logo-mark.png",
  logo_light: "logo-horizontal-light.png",
  logo_dark: "logo-horizontal-dark.png",
  logo: "logo.png",
  favicon: "favicon.ico",
  apple: "apple-icon.png",
  icon_pwa: "icon.png",
};

export async function uploadLogoSlot(formData: FormData) {
  await requireStaff("branding");
  const slot = formData.get("slot") as string;
  const file = formData.get("file") as File | null;

  if (!slot || !file || file.size === 0) {
    return { ok: false, error: "No file was selected." };
  }

  const filename = SLOT_FILES[slot];
  if (!filename) {
    return { ok: false, error: "Unknown logo slot." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await fs.mkdir(PUBLIC_IMG_DIR, { recursive: true });
  const targetPath = slot === "apple" || slot === "icon_pwa" 
    ? path.join(process.cwd(), "public", filename)
    : path.join(PUBLIC_IMG_DIR, filename);

  await fs.writeFile(targetPath, buffer);
  revalidatePath("/admin/branding");
  revalidatePath("/");

  return { ok: true, filename };
}
