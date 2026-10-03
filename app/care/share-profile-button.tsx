"use client";

import { useState } from "react";

type ShareProfileButtonProps = {
  title: string;
  text: string;
  shareLabel: string;
  copiedLabel: string;
  whatsappLabel: string;
};

function cleanCurrentUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function ShareProfileButton({
  title,
  text,
  shareLabel,
  copiedLabel,
  whatsappLabel,
}: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = cleanCurrentUrl();
    if (!url) return;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else if (!fallbackCopy(url)) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      if (fallbackCopy(url)) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    }
  }

  function shareOnWhatsApp() {
    const url = cleanCurrentUrl();
    if (!url) return;
    const message = [text, url].filter(Boolean).join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="atlas-profile-share-actions">
      <button className="button button-ghost" type="button" onClick={() => void share()}>
        {copied ? copiedLabel : shareLabel}
      </button>
      <button className="button button-ghost" type="button" onClick={shareOnWhatsApp}>
        {whatsappLabel}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ""}</span>
    </div>
  );
}
