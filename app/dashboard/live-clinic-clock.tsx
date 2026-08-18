"use client";

import { useEffect, useMemo, useState } from "react";
import { uiLocaleMeta, type UiLocale } from "@/lib/i18n/ui";

function timeParts(date: Date, locale: string) {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
    dayPeriod: value("dayPeriod"),
  };
}

export function LiveClinicClock({ locale }: { locale: UiLocale }) {
  const [now, setNow] = useState(() => new Date());
  const dateLocale = uiLocaleMeta[locale].dateLocale;

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  // Deliberately do not set a timeZone here. This display follows the exact
  // clock and time zone of the receptionist's device, while appointment data
  // itself continues to use the clinic's Erbil/Baghdad scheduling time zone.
  const date = useMemo(() => new Intl.DateTimeFormat(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now), [dateLocale, now]);

  const clock = useMemo(() => timeParts(now, dateLocale), [dateLocale, now]);
  const accessibleTime = [
    `${clock.hour}:${clock.minute}:${clock.second}`,
    clock.dayPeriod,
  ].filter(Boolean).join(" ");

  return (
    <div className="atlas-live-clock" aria-label={`${date} ${accessibleTime}`}>
      <div className="atlas-live-clock-orbit" aria-hidden="true"><span /></div>
      <div className="atlas-live-clock-time" dir="auto">
        <strong>{clock.hour}<span className="atlas-live-clock-colon">:</span>{clock.minute}</strong>
        <span className="atlas-live-clock-seconds">{clock.second}</span>
        {clock.dayPeriod ? <span className="atlas-live-clock-period">{clock.dayPeriod}</span> : null}
      </div>
      <div className="atlas-live-clock-date"><span>{date}</span></div>
      <style jsx>{`
        .atlas-live-clock {
          position: relative;
          display: grid;
          min-width: 154px;
          overflow: hidden;
          border: 1px solid rgba(9, 107, 80, .18);
          border-radius: 20px;
          padding: 12px 15px 11px;
          background:
            radial-gradient(circle at 88% 18%, rgba(30, 191, 145, .18), transparent 32%),
            linear-gradient(145deg, rgba(255,255,255,.92), rgba(239,250,246,.78));
          box-shadow:
            0 14px 34px rgba(15, 61, 48, .10),
            inset 0 1px 0 rgba(255,255,255,.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          isolation: isolate;
        }
        .atlas-live-clock::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,.58) 48%, transparent 72%);
          transform: translateX(-85%);
          animation: atlas-clock-sheen 7s ease-in-out infinite;
          pointer-events: none;
        }
        .atlas-live-clock-orbit {
          position: absolute;
          inset-inline-end: 11px;
          top: 10px;
          width: 10px;
          height: 10px;
          border: 1px solid rgba(5, 133, 95, .24);
          border-radius: 999px;
          display: grid;
          place-items: center;
        }
        .atlas-live-clock-orbit span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 4px rgba(8,119,90,.08);
          animation: atlas-clock-pulse 2s ease-in-out infinite;
        }
        .atlas-live-clock-time {
          display: flex;
          align-items: baseline;
          gap: 5px;
          padding-inline-end: 10px;
          white-space: nowrap;
        }
        .atlas-live-clock-time strong {
          color: var(--ink);
          font-size: 25px;
          font-weight: 880;
          letter-spacing: -.035em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .atlas-live-clock-colon {
          display: inline-block;
          transform: translateY(-1px);
          color: var(--accent);
          animation: atlas-clock-colon 1s steps(1) infinite;
        }
        .atlas-live-clock-seconds {
          color: var(--accent);
          font-size: 11px;
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }
        .atlas-live-clock-period {
          color: var(--muted);
          font-size: 9px;
          font-weight: 780;
          text-transform: uppercase;
        }
        .atlas-live-clock-date {
          margin-top: 5px;
          padding-top: 6px;
          border-top: 1px solid rgba(9, 107, 80, .10);
          color: var(--ink-soft);
          font-size: 11px;
          font-weight: 760;
          line-height: 1.2;
          white-space: nowrap;
        }
        @keyframes atlas-clock-colon { 50% { opacity: .35; } }
        @keyframes atlas-clock-pulse { 50% { transform: scale(.72); opacity: .55; } }
        @keyframes atlas-clock-sheen {
          0%, 70%, 100% { transform: translateX(-85%); opacity: 0; }
          78% { opacity: .55; }
          92% { transform: translateX(90%); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .atlas-live-clock::before,
          .atlas-live-clock-orbit span,
          .atlas-live-clock-colon { animation: none; }
        }
        @media (max-width: 620px) {
          .atlas-live-clock { min-width: 136px; border-radius: 17px; padding: 10px 12px 9px; }
          .atlas-live-clock-time strong { font-size: 22px; }
          .atlas-live-clock-date { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
