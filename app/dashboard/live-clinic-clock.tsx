"use client";

import { useEffect, useMemo, useState } from "react";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

export function LiveClinicClock({ locale }: { locale: UiLocale }) {
  const [now, setNow] = useState(() => new Date());
  const dateLocale = uiLocaleMeta[locale].dateLocale;

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const date = useMemo(() => new Intl.DateTimeFormat(dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now), [dateLocale, now]);

  const time = useMemo(() => new Intl.DateTimeFormat(dateLocale, {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  }).format(now), [dateLocale, now]);

  return (
    <div className="atlas-live-clock" aria-label={`${date} ${time}`}>
      <strong>{time}</strong>
      <span>{date}</span>
      <style jsx>{`
        .atlas-live-clock {
          display: grid;
          justify-items: end;
          gap: 1px;
          min-width: 118px;
          border: 1px solid rgba(10, 70, 54, .10);
          border-radius: 14px;
          padding: 9px 12px;
          background: rgba(255, 255, 255, .58);
          box-shadow: 0 8px 24px rgba(17, 52, 42, .05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .atlas-live-clock strong {
          color: var(--ink);
          font-size: 19px;
          font-weight: 850;
          letter-spacing: -.02em;
          line-height: 1.05;
        }
        .atlas-live-clock span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 720;
          white-space: nowrap;
        }
        @media (max-width: 620px) {
          .atlas-live-clock { min-width: 102px; padding: 8px 10px; }
          .atlas-live-clock strong { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}
