// Eyes Opener: Client component for uploading and previewing specific logo slots.
"use client";

import { useState, useTransition } from "react";
import { uploadLogoSlot } from "./actions";

interface SlotProps {
  id: string;
  title: string;
  purpose: string;
  dimensions: string;
  aspect: string;
  format: string;
  safeArea: string;
  previewUrl: string;
  darkBg?: boolean;
}

export function LogoSlotCard({
  id,
  title,
  purpose,
  dimensions,
  aspect,
  format,
  safeArea,
  previewUrl,
  darkBg,
}: SlotProps) {
  const [currentUrl, setCurrentUrl] = useState(previewUrl);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("slot", id);
    fd.append("file", file);

    startTransition(async () => {
      setStatus("Uploading...");
      const res = await uploadLogoSlot(fd);
      if (res.ok) {
        setStatus("Updated successfully!");
        setCurrentUrl(URL.createObjectURL(file));
      } else {
        setStatus(res.error || "Upload failed");
      }
    });
  };

  return (
    <div style={{
      border: "1px solid var(--line)",
      borderRadius: "var(--r-md)",
      padding: "20px",
      background: "var(--card)",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{title}</h3>
          <p style={{ fontSize: "13px", color: "var(--ink-2)", margin: "4px 0 0" }}>{purpose}</p>
        </div>
        <span style={{
          fontSize: "12px",
          fontWeight: 600,
          background: "var(--sunken)",
          padding: "3px 8px",
          borderRadius: "6px",
          border: "1px solid var(--line)"
        }}>
          {format}
        </span>
      </div>

      {/* Preview Box with optional checkerboard or dark bg */}
      <div style={{
        height: "140px",
        borderRadius: "var(--r-sm)",
        background: darkBg ? "#101220" : "radial-gradient(#e2e4e8 1px, transparent 1px) 0 0 / 12px 12px, #f6f7f9",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        border: "1px solid var(--line)",
        padding: "12px",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUrl}
          alt={title}
          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Specifications Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        fontSize: "12.5px",
        background: "var(--sunken)",
        padding: "10px 12px",
        borderRadius: "var(--r-sm)",
      }}>
        <div>
          <span style={{ color: "var(--ink-3)", display: "block" }}>Required Size:</span>
          <strong style={{ fontFamily: "monospace", fontSize: "13px" }}>{dimensions}</strong>
        </div>
        <div>
          <span style={{ color: "var(--ink-3)", display: "block" }}>Aspect Ratio:</span>
          <strong>{aspect}</strong>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <span style={{ color: "var(--ink-3)", display: "block" }}>Safe Area / Margins:</span>
          <span>{safeArea}</span>
        </div>
      </div>

      {/* Upload Input */}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <label style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 14px",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "var(--r-sm)",
          background: "var(--ink)",
          color: "var(--paper)",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}>
          {isPending ? "Saving..." : "Upload New File"}
          <input
            type="file"
            accept=".png,.ico,.jpg,.jpeg,.svg"
            onChange={handleUpload}
            disabled={isPending}
            style={{ display: "none" }}
          />
        </label>
        {status && <span style={{ fontSize: "12px", color: "var(--ink-2)" }}>{status}</span>}
      </div>
    </div>
  );
}
