"use client";

import { useState } from "react";
import {
  formatLocalDateValue,
  formatTimeValue,
  localizeDigits,
  toAsciiDigits,
  type DayPeriod,
} from "@/lib/i18n/format";
import { toBaghdadInputValue } from "@/lib/appointments";
import type { UiLocale } from "@/lib/i18n/ui";

type Props = {
  id: string;
  appointmentAt: string;
  min: string;
  max: string;
  locale: UiLocale;
  label: string;
  timeZoneLabel: string;
};

const copy = {
  en: { date: "Date", hour: "Hour", minute: "Minute", am: "AM", pm: "PM", close: "Done", custom: "Custom date & time" },
  ku: { date: "بەروار", hour: "کاتژمێر", minute: "خولەک", am: "پێش نیوەڕۆ", pm: "دوای نیوەڕۆ", close: "تەواو", custom: "بەروار و کاتی دیاریکراو" },
  ar: { date: "التاريخ", hour: "الساعة", minute: "الدقيقة", am: "صباحاً", pm: "مساءً", close: "تم", custom: "تاريخ ووقت مخصصان" },
} as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseValue(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[2]);
  const minute = Number(match[3]);
  if (hour24 > 23 || minute > 59) return null;
  return {
    date: match[1],
    hour12: hour24 % 12 || 12,
    minute,
    period: (hour24 >= 12 ? "pm" : "am") as DayPeriod,
  };
}

function to24Hour(hour12: number, minute: number, period: DayPeriod) {
  const hour24 = period === "am"
    ? (hour12 === 12 ? 0 : hour12)
    : (hour12 === 12 ? 12 : hour12 + 12);
  return `${pad(hour24)}:${pad(minute)}`;
}

function cleanNumericInput(value: string) {
  return toAsciiDigits(value).replace(/\D/g, "").slice(0, 2);
}

export function AppointmentEditDateTimeField({ id, appointmentAt, min, max, locale, label, timeZoneLabel }: Props) {
  const t = copy[locale];
  const initialLocal = toBaghdadInputValue(new Date(appointmentAt));
  const initial = parseValue(initialLocal) ?? parseValue(min) ?? { date: min.slice(0, 10), hour12: 1, minute: 0, period: "pm" as DayPeriod };
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial.date);
  const [period, setPeriod] = useState<DayPeriod>(initial.period);
  const [hour, setHour] = useState(pad(initial.hour12));
  const [minute, setMinute] = useState(pad(initial.minute));

  const numericHour = Number(hour || 0);
  const numericMinute = Number(minute || 0);
  const validHour = Number.isInteger(numericHour) && numericHour >= 1 && numericHour <= 12;
  const validMinute = Number.isInteger(numericMinute) && numericMinute >= 0 && numericMinute <= 59;
  const clock = to24Hour(validHour ? numericHour : 1, validMinute ? numericMinute : 0, period);
  const candidate = `${date}T${clock}`;
  const valid = validHour && validMinute && candidate >= min && candidate <= max;
  const display = `${formatLocalDateValue(date, locale)} · ${formatTimeValue(clock, locale)}`;

  function finishHour() {
    const next = Math.min(12, Math.max(1, Number(hour || initial.hour12)));
    setHour(pad(next));
  }

  function finishMinute() {
    const next = Math.min(59, Math.max(0, Number(minute || 0)));
    setMinute(pad(next));
  }

  return (
    <div className="edit-datetime-field">
      <label htmlFor={`${id}-trigger`}>{label} <span className="label-muted">· {timeZoneLabel}</span></label>
      <button
        id={`${id}-trigger`}
        className="edit-datetime-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{display}</span>
        <span aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div className="edit-datetime-popover" role="dialog" aria-label={label} dir={locale === "en" ? "ltr" : "rtl"}>
          <div className="edit-custom-heading">{t.custom}</div>

          <label className="edit-date-field">
            <span>{t.date}</span>
            <input
              type="date"
              value={date}
              min={min.slice(0, 10)}
              max={max.slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <div className="edit-period-toggle">
            <button type="button" className={period === "am" ? "is-selected" : ""} onClick={() => setPeriod("am")}>{t.am}</button>
            <button type="button" className={period === "pm" ? "is-selected" : ""} onClick={() => setPeriod("pm")}>{t.pm}</button>
          </div>

          <div className="edit-custom-time" dir="ltr">
            <label>
              <span>{t.hour}</span>
              <input
                type="text"
                inputMode="numeric"
                value={localizeDigits(hour, locale)}
                onChange={(event) => setHour(cleanNumericInput(event.target.value))}
                onBlur={finishHour}
                aria-label={t.hour}
              />
            </label>
            <span className="edit-time-colon" aria-hidden="true">:</span>
            <label>
              <span>{t.minute}</span>
              <input
                type="text"
                inputMode="numeric"
                value={localizeDigits(minute, locale)}
                onChange={(event) => setMinute(cleanNumericInput(event.target.value))}
                onBlur={finishMinute}
                aria-label={t.minute}
              />
            </label>
          </div>

          <div className="edit-time-preview" dir="ltr">{formatTimeValue(clock, locale)}</div>
          <button className="edit-datetime-done" type="button" disabled={!valid} onClick={() => setOpen(false)}>{t.close}</button>
        </div>
      ) : null}

      <input className="sr-only" type="text" name="appointment_at" value={valid ? candidate : ""} readOnly required tabIndex={-1} aria-hidden="true" />

      <style jsx>{`
        .edit-datetime-field { position: relative; display: grid; gap: 7px; min-width: 0; }
        .edit-datetime-field > label { margin-top: 2px; font-size: 12px; font-weight: 760; }
        .edit-datetime-trigger {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #cbd4ce;
          border-radius: 12px;
          padding: 10px 13px;
          background: #fff;
          color: var(--ink);
          text-align: ${locale === "en" ? "left" : "right"};
          cursor: pointer;
        }
        .edit-datetime-popover {
          position: relative;
          z-index: 2;
          display: grid;
          gap: 12px;
          width: 100%;
          margin-top: 3px;
          border: 1px solid var(--line-strong);
          border-radius: 16px;
          padding: 14px;
          background: #fff;
          box-shadow: var(--shadow-md);
        }
        .edit-custom-heading { color: var(--ink); font-size: 13px; font-weight: 850; }
        .edit-date-field,
        .edit-custom-time label { display: grid; gap: 5px; color: var(--muted); font-size: 10px; font-weight: 800; }
        .edit-date-field input,
        .edit-custom-time input {
          width: 100%;
          min-height: 46px;
          border: 1px solid var(--line-strong);
          border-radius: 11px;
          padding: 8px 10px;
          background: #fff;
          color: var(--ink);
          font-size: 16px;
          font-weight: 780;
        }
        .edit-date-field input { direction: ltr; text-align: ${locale === "en" ? "left" : "right"}; }
        .edit-period-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; border-radius: 11px; background: #edf2ef; }
        .edit-period-toggle button,
        .edit-datetime-done { border: 0; cursor: pointer; }
        .edit-period-toggle button { min-height: 40px; border-radius: 9px; background: transparent; color: var(--ink-soft); font-size: 11px; font-weight: 760; }
        .edit-period-toggle button.is-selected { background: #fff; color: var(--accent); box-shadow: 0 2px 8px rgba(20,36,28,.07); }
        .edit-custom-time {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr);
          align-items: end;
          gap: 7px;
        }
        .edit-custom-time input { text-align: center; font-size: 18px; font-weight: 820; font-variant-numeric: tabular-nums; }
        .edit-time-colon { padding-bottom: 10px; color: var(--ink); text-align: center; font-size: 22px; font-weight: 850; }
        .edit-time-preview { border-radius: 10px; padding: 9px 11px; background: var(--accent-faint); color: var(--accent); text-align: center; font-size: 13px; font-weight: 840; font-variant-numeric: tabular-nums; }
        .edit-datetime-done { width: 100%; min-height: 42px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 780; }
        .edit-datetime-done:disabled { opacity: .45; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
