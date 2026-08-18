"use client";

import { useLayoutEffect } from "react";

export function LiteralTextGuard() {
  useLayoutEffect(() => {
    const protect = () => {
      document.querySelectorAll<HTMLElement>('[dir="ltr"]').forEach((element) => {
        if (element.dataset.atlasLiteralText) return;
        const value = element.textContent?.trim() ?? "";
        if (!value.includes("@")) return;

        // Email addresses and other literal account identities are data, not
        // translated UI. Keep their original ASCII spelling and digits even
        // while the surrounding Atlas interface is Kurdish or Arabic.
        element.dataset.atlasLiteralText = value;
        element.setAttribute("aria-label", value);
        element.textContent = "";
        element.classList.add("atlas-literal-text");
      });
    };

    protect();
    const observer = new MutationObserver(protect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      .atlas-literal-text::before {
        content: attr(data-atlas-literal-text);
        direction: ltr;
        unicode-bidi: isolate;
      }
    `}</style>
  );
}
