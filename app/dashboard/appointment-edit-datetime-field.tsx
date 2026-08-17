"use client";

import { useMemo, useRef, useState } from "react";
import {
  formatLocalDateValue,
  formatMonthYear,
  formatTimeValue,
  formatWeekday,
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
  en: { date: "Date", time: "Time", hour: "Hour", minute: "Minute", am: "AM", pm: "PM", close: "Done", previous: "Previous month", next: "Next month" },
  ku: { date: "بەروار", time: "کات", hour: "کاتژمێر", minute: "خولەک", am: "پێش نیوەڕۆ", pm: "دوای نیوەڕۆ", close: "تەواو", previous: "مانگی پێشوو", next: "مانگی داهاتوو" },
  ar: { date: "التاريخ", time: "الوقت", hour: "الساعة", minute: "الدقيقة", am: "صباحاً", pm: "مساءً", close: "تم", previous: "الشهر السابق", next: "الشهر التالي" },
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

function dateValue(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function monthFromValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function shiftMonth(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

export function AppointmentEditDateTimeField({ id, appointmentAt, min, max, locale, label, timeZoneLabel }: Props) {
  const t = copy[locale];
  const initialLocal = toBaghdadInputValue(new Date(appointmentAt));
  const initial = parseValue(initialLocal) ?? parseValue(min) ?? { date: min.slice(0, 10), hour12: 1, minute: 0, period: "pm" as DayPeriod };
  const minDate = min.slice(0, 10);
  const maxDate = max.slice(0, 10);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial.date);
  const [month, setMonth] = useState(() => monthFromValue(initial.date));
  const [period, setPeriod] = useState<DayPeriod>(initial.period);
  const [hour, setHour] = useState(initial.hour12);
  const [minute, setMinute] = useState(pad(initial.minute));

  const numericMinute = Math.min(59, Math.max(0, Number(minute || 0)));
  const clock = to24Hour(hour, numericMinute, period);
  const candidate = `${date}T${clock}`;
  const valid = candidate >= min && candidate <= max;
  const display = `${formatLocalDateValue(date, locale)} · ${formatTimeValue(clock, locale)}`;
  const hours = period === "am" ? [8, 9, 10, 11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const calendarCells = useMemo(() => {
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    const offset = (firstWeekday + 1) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1;
      const valueDate = new Date(Date.UTC(year, monthIndex, day));
      const value = dateValue(valueDate);
      return {
        day: valueDate.getUTCDate(),
        value,
        inMonth: valueDate.getUTCMonth() === monthIndex,
        disabled: value < minDate || value > maxDate,
      };
    });
  }, [maxDate, minDate, month]);

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const reference = new Date(Date.UTC(2026, 0, 3 + index));
    return formatWeekday(reference, locale);
  }), [locale]);

  function choosePeriod(next: DayPeriod) {
    setPeriod(next);
    if (next === "am" && (hour < 8 || hour > 11)) setHour(8);
  }

  function changeMinute(value: string) {
    setMinute(toAsciiDigits(value).replace(/\D/g, "").slice(0, 2));
  }

  function finishMinute() {
    setMinute(pad(Math.min(59, Math.max(0, Number(minute || 0)))));
  }

  return (
    <div className="edit-datetime-field" ref={rootRef}>
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
          <div className="edit-calendar-heading">
            <button type="button" aria-label={t.previous} onClick={() => setMonth((value) => shiftMonth(value, -1))}>‹</button>
            <strong>{formatMonthYear(month, locale)}</strong>
            <button type="button" aria-label={t.next} onClick={() => setMonth((value) => shiftMonth(value, 1))}>›</button>
          </div>
          <div className="edit-calendar-weekdays" aria-hidden="true">
            {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
          </div>
          <div className="edit-calendar-grid">
            {calendarCells.map((cell, index) => cell.inMonth ? (
              <button
                key={cell.value}
                type="button"
                disabled={cell.disabled}
                className={cell.value === date ? "is-selected" : ""}
                onClick={() => { setDate(cell.value); setMonth(monthFromValue(cell.value)); }}
              >
                {localizeDigits(cell.day, locale)}
              </button>
            ) : <span key={`blank-${index}`} />)}
          </div>

          <div className="edit-time-divider" />
          <div className="edit-period-toggle">
            <button type="button" className={period === "am" ? "is-selected" : ""} onClick={() => choosePeriod("am")}>{t.am}</button>
            <button type="button" className={period === "pm" ? "is-selected" : ""} onClick={() => choosePeriod("pm")}>{t.pm}</button>
          </div>
          <div className="edit-time-label">{t.hour}</div>
          <div className="edit-hour-grid" dir={locale === "en" ? "ltr" : "rtl"}>
            {hours.map((value) => (
              <button type="button" key={value} className={hour === value ? "is-selected" : ""} onClick={() => setHour(value)}>
                {localizeDigits(pad(value), locale)}
              </button>
            ))}
          </div>
          <label className="edit-minute-field">
            <span>{t.minute}</span>
            <input
              type="text"
              inputMode="numeric"
              value={localizeDigits(minute, locale)}
              onChange={(event) => changeMinute(event.target.value)}
              onBlur={finishMinute}
              aria-label={t.minute}
            />
          </label>
          <div className="edit-time-preview">{formatTimeValue(clock, locale)}</div>
          <button className="edit-datetime-done" type="button" onClick={() => setOpen(false)}>{t.close}</button>
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
        .edit-datetime-trigger > span:first-child { min-width: 0; direction: ${locale === "en" ? "ltr" : "rtl"}; }
        .edit-datetime-popover {
          position: absolute;
          z-index: 140;
          inset-inline-start: 0;
          top: calc(100% + 7px);
          width: min(410px, 100%);
          border: 1px solid var(--line-strong);
          border-radius: 16px;
          padding: 13px;
          background: #fff;
          box-shadow: var(--shadow-md);
        }
        .edit-calendar-heading { display: grid; grid-template-columns: 36px minmax(0,1fr) 36px; align-items: center; gap: 7px; margin-bottom: 8px; }
        .edit-calendar-heading strong { text-align: center; font-size: 13px; }
        .edit-calendar-heading button,
        .edit-calendar-grid button,
        .edit-period-toggle button,
        .edit-hour-grid button,
        .edit-datetime-done { border: 0; cursor: pointer; }
        .edit-calendar-heading button { width: 36px; height: 36px; border-radius: 9px; background: var(--surface-soft); font-size: 22px; }
        .edit-calendar-weekdays,
        .edit-calendar-grid { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 4px; }
        .edit-calendar-weekdays { margin-bottom: 3px; }
        .edit-calendar-weekdays span { padding: 4px 0; color: var(--muted); text-align: center; font-size: 8.5px; font-weight: 760; white-space: nowrap; }
        .edit-calendar-grid button,
        .edit-calendar-grid > span { height: 34px; min-width: 0; }
        .edit-calendar-grid button { border-radius: 9px; background: transparent; color: var(--ink); font-size: 12px; }
        .edit-calendar-grid button.is-selected { background: var(--accent); color: #fff; font-weight: 820; }
        .edit-calendar-grid button:disabled { opacity: .25; cursor: not-allowed; }
        .edit-time-divider { height: 1px; margin: 10px 0; background: var(--line); }
        .edit-period-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; border-radius: 11px; background: #edf2ef; }
        .edit-period-toggle button { min-height: 38px; border-radius: 9px; background: transparent; color: var(--ink-soft); font-size: 11px; font-weight: 760; }
        .edit-period-toggle button.is-selected { background: #fff; color: var(--accent); box-shadow: 0 2px 8px rgba(20,36,28,.07); }
        .edit-time-label { margin-top: 9px; color: var(--muted); font-size: 10px; font-weight: 800; }
        .edit-hour-grid { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 5px; margin-top: 5px; }
        .edit-hour-grid button { min-height: 36px; border: 1px solid #dce4df; border-radius: 9px; background: #fff; color: var(--ink-soft); font-size: 11px; font-weight: 720; }
        .edit-hour-grid button.is-selected { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 840; }
        .edit-minute-field { display: grid; grid-template-columns: auto 84px; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; color: var(--muted); font-size: 10px; font-weight: 800; }
        .edit-minute-field input { min-height: 40px; height: 40px; padding: 7px 10px; text-align: center; }
        .edit-time-preview { margin-top: 9px; border-radius: 10px; padding: 9px 11px; background: var(--accent-faint); color: var(--accent); text-align: ${locale === "en" ? "left" : "right"}; font-size: 13px; font-weight: 840; }
        .edit-datetime-done { width: 100%; min-height: 40px; margin-top: 9px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 780; }
        @media (max-width: 540px) {
          .edit-datetime-popover { width: 100%; }
          .edit-hour-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }
        }
      `}</style>
    </div>
  );
}
