"use client";

import { useMemo, useState } from "react";
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
  en: { hour: "Hour", minute: "Minute", am: "AM", pm: "PM", close: "Done", previous: "Previous month", next: "Next month", custom: "Custom time" },
  ku: { hour: "کاتژمێر", minute: "خولەک", am: "پێش نیوەڕۆ", pm: "دوای نیوەڕۆ", close: "تەواو", previous: "مانگی پێشوو", next: "مانگی داهاتوو", custom: "کاتی دیاریکراو" },
  bd: { hour: "دەمژمێر", minute: "خولەک", am: "بەری نیڤرۆ", pm: "پشتی نیڤرۆ", close: "تەمام", previous: "مەها بەرێ", next: "مەها پاش", custom: "دەمێ تایبەت" },
  ar: { hour: "الساعة", minute: "الدقيقة", am: "صباحاً", pm: "مساءً", close: "تم", previous: "الشهر السابق", next: "الشهر التالي", custom: "وقت مخصص" },
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

function cleanNumericInput(value: string) {
  return toAsciiDigits(value).replace(/\D/g, "").slice(0, 2);
}

export function AppointmentEditDateTimeField({ id, appointmentAt, min, max, locale, label, timeZoneLabel }: Props) {
  const t = copy[locale];
  const initialLocal = toBaghdadInputValue(new Date(appointmentAt));
  const initial = parseValue(initialLocal) ?? parseValue(min) ?? { date: min.slice(0, 10), hour12: 1, minute: 0, period: "pm" as DayPeriod };
  const minDate = min.slice(0, 10);
  const maxDate = max.slice(0, 10);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial.date);
  const [month, setMonth] = useState(() => monthFromValue(initial.date));
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
          <div className="edit-custom-time-heading">{t.custom}</div>
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
          min-height: 52px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #cbd4ce;
          border-radius: 13px;
          padding: 11px 15px;
          background: #fff;
          color: var(--ink);
          text-align: ${locale === "en" ? "left" : "right"};
          font-size: 15px;
          font-weight: 760;
          cursor: pointer;
        }
        .edit-datetime-trigger > span:first-child { min-width: 0; direction: ${locale === "en" ? "ltr" : "rtl"}; }
        .edit-datetime-popover {
          position: relative;
          z-index: 20;
          width: 100%;
          margin-top: 3px;
          border: 1px solid var(--line-strong);
          border-radius: 18px;
          padding: 15px;
          background: #fff;
          box-shadow: var(--shadow-md);
        }
        .edit-calendar-heading { display: grid; grid-template-columns: 40px minmax(0,1fr) 40px; align-items: center; gap: 8px; margin-bottom: 10px; }
        .edit-calendar-heading strong { text-align: center; font-size: 15px; }
        .edit-calendar-heading button,
        .edit-calendar-grid button,
        .edit-period-toggle button,
        .edit-datetime-done { border: 0; cursor: pointer; }
        .edit-calendar-heading button { width: 40px; height: 40px; border-radius: 10px; background: var(--surface-soft); font-size: 23px; }
        .edit-calendar-weekdays,
        .edit-calendar-grid { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 5px; }
        .edit-calendar-weekdays { margin-bottom: 4px; }
        .edit-calendar-weekdays span { padding: 4px 0; color: var(--muted); text-align: center; font-size: 9px; font-weight: 760; white-space: nowrap; }
        .edit-calendar-grid button,
        .edit-calendar-grid > span { height: 38px; min-width: 0; }
        .edit-calendar-grid button { border-radius: 10px; background: transparent; color: var(--ink); font-size: 13px; }
        .edit-calendar-grid button.is-selected { background: var(--accent); color: #fff; font-weight: 840; box-shadow: 0 4px 12px rgba(8,119,90,.18); }
        .edit-calendar-grid button:disabled { opacity: .25; cursor: not-allowed; }
        .edit-time-divider { height: 1px; margin: 14px 0; background: var(--line); }
        .edit-custom-time-heading { margin-bottom: 8px; color: var(--muted); font-size: 10px; font-weight: 800; }
        .edit-period-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; border-radius: 12px; background: #edf2ef; }
        .edit-period-toggle button { min-height: 42px; border-radius: 9px; background: transparent; color: var(--ink-soft); font-size: 12px; font-weight: 780; }
        .edit-period-toggle button.is-selected { background: #fff; color: var(--accent); box-shadow: 0 2px 8px rgba(20,36,28,.09); }
        .edit-custom-time {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
          align-items: end;
          gap: 8px;
          margin-top: 11px;
        }
        .edit-custom-time label { display: grid; gap: 5px; color: var(--muted); font-size: 10px; font-weight: 800; }
        .edit-custom-time input {
          width: 100%;
          min-height: 50px;
          border: 1px solid var(--line-strong);
          border-radius: 12px;
          padding: 8px 10px;
          background: #fff;
          color: var(--ink);
          text-align: center;
          font-size: 20px;
          font-weight: 840;
          font-variant-numeric: tabular-nums;
        }
        .edit-time-colon { padding-bottom: 11px; color: var(--ink); text-align: center; font-size: 24px; font-weight: 850; }
        .edit-time-preview { margin-top: 10px; border-radius: 11px; padding: 10px 12px; background: var(--accent-faint); color: var(--accent); text-align: center; font-size: 14px; font-weight: 850; font-variant-numeric: tabular-nums; }
        .edit-datetime-done { width: 100%; min-height: 43px; margin-top: 10px; border-radius: 11px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 800; }
        .edit-datetime-done:disabled { opacity: .42; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
