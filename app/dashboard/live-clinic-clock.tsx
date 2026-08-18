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

  const date = useMemo(() => new Intl.DateTimeFormat(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now), [dateLocale, now]);

  const clock = useMemo(() => timeParts(now, dateLocale), [dateLocale, now]);
  const dayPeriod = locale === "ku"
    ? (now.getHours() < 12 ? "پ.ن" : "د.ن")
    : clock.dayPeriod;
  const accessibleTime = [
    `${clock.hour}:${clock.minute}:${clock.second}`,
    dayPeriod,
  ].filter(Boolean).join(" ");

  return (
    <div className="atlas-live-clock" aria-label={`${date} ${accessibleTime}`}>
      <div className="atlas-live-clock-orbit" aria-hidden="true"><span /></div>
      <div className="atlas-live-clock-time" dir="ltr">
        <strong dir="ltr">
          <span>{clock.hour}</span>
          <span className="atlas-live-clock-colon">:</span>
          <span>{clock.minute}</span>
        </strong>
        <span className="atlas-live-clock-seconds">{clock.second}</span>
        {dayPeriod ? <span className="atlas-live-clock-period">{dayPeriod}</span> : null}
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
        }
        .atlas-live-clock-time {
          display: flex;
          direction: ltr;
          align-items: baseline;
          gap: 5px;
          padding-inline-end: 10px;
          white-space: nowrap;
          unicode-bidi: isolate;
        }
        .atlas-live-clock-time strong {
          display: inline-flex;
          direction: ltr;
          align-items: baseline;
          gap: 0;
          color: var(--ink);
          font-size: 25px;
          font-weight: 880;
          letter-spacing: -.035em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          unicode-bidi: isolate;
        }
        .atlas-live-clock-colon {
          display: inline-block;
          min-width: .45em;
          transform: translateY(-1px);
          color: var(--accent);
          text-align: center;
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
        @media (max-width: 620px) {
          .atlas-live-clock { min-width: 136px; border-radius: 17px; padding: 10px 12px 9px; }
          .atlas-live-clock-time strong { font-size: 22px; }
          .atlas-live-clock-date { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
