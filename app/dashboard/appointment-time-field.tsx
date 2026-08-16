"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatLocalDateValue,
  formatMinutes,
  formatMonthYear,
  formatTimeValue,
  formatWeekday,
  localizeDigits,
  toAsciiDigits,
} from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

type AppointmentTimeFieldProps = {
  intervalMinutes: number;
  min: string;
  max: string;
  initialDate?: string;
  occupiedByDoctor: Record<string, string[]>;
  timeZoneLabel: string;
  locale: UiLocale;
};

const timeCopy = {
  en: {
    dateTime: "Date and time",
    date: "Appointment date",
    time: "Appointment time",
    slot: "Available slot",
    chooseDoctor: "Choose a doctor first",
    noSlots: "No available times",
    custom: "Use custom time",
    slots: "Use available slots",
    customHelp: "Enter the exact time you need, for example 14:30.",
    slotHelp: "Times that are already booked are hidden.",
    previousMonth: "Previous month",
    nextMonth: "Next month",
  },
  ku: {
    dateTime: "بەروار و کات",
    date: "بەرواری وادە",
    time: "کاتی وادە",
    slot: "کاتی بەردەست",
    chooseDoctor: "سەرەتا پزیشک هەڵبژێرە",
    noSlots: "کاتی بەردەست نییە",
    custom: "کاتی تایبەت",
    slots: "کاتە بەردەستەکان",
    customHelp: "کاتی دڵخواز بنووسە، بۆ نموونە ١٤:٣٠.",
    slotHelp: "کاتە گیراوەکان نیشان نادرێن.",
    previousMonth: "مانگی پێشوو",
    nextMonth: "مانگی داهاتوو",
  },
  ar: {
    dateTime: "التاريخ والوقت",
    date: "تاريخ الموعد",
    time: "وقت الموعد",
    slot: "الوقت المتاح",
    chooseDoctor: "اختر الطبيب أولاً",
    noSlots: "لا توجد أوقات متاحة",
    custom: "وقت مخصص",
    slots: "الأوقات المتاحة",
    customHelp: "أدخل الوقت المطلوب، مثلاً ١٤:٣٠.",
    slotHelp: "الأوقات المحجوزة مخفية.",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
  },
} as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function slotTimes(intervalMinutes: number) {
  const values: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += intervalMinutes) {
    values.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return values;
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

function typedTime(value: string) {
  const ascii = toAsciiDigits(value).replace(/[^0-9:]/g, "");
  if (ascii.includes(":")) {
    const [hours = "", minutes = ""] = ascii.split(":");
    return `${hours.slice(0, 2)}${minutes.length || ascii.endsWith(":") ? ":" : ""}${minutes.slice(0, 2)}`;
  }
  const digits = ascii.slice(0, 4);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function canonicalTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(toAsciiDigits(value));
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${pad(hours)}:${pad(minutes)}`;
}

export function AppointmentTimeField({
  intervalMinutes,
  min,
  max,
  initialDate,
  occupiedByDoctor,
  timeZoneLabel,
  locale,
}: AppointmentTimeFieldProps) {
  const text = timeCopy[locale];
  const minDate = min.slice(0, 10);
  const maxDate = max.slice(0, 10);
  const startingDate = initialDate && initialDate >= minDate && initialDate <= maxDate ? initialDate : minDate;
  const rootRef = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(startingDate);
  const [doctorId, setDoctorId] = useState("");
  const [time, setTime] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [month, setMonth] = useState(() => monthFromValue(startingDate));
  const slots = useMemo(() => slotTimes(intervalMinutes), [intervalMinutes]);
  const occupiedSet = useMemo(
    () => new Set(doctorId ? occupiedByDoctor[doctorId] ?? [] : []),
    [doctorId, occupiedByDoctor],
  );

  useEffect(() => {
    const doctorSelect = document.querySelector<HTMLSelectElement>("#doctor_id");
    if (!doctorSelect) return;
    const syncDoctor = () => {
      setDoctorId(doctorSelect.value);
      setTime("");
      setSlotOpen(false);
    };
    syncDoctor();
    doctorSelect.addEventListener("change", syncDoctor);
    return () => doctorSelect.removeEventListener("change", syncDoctor);
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDateOpen(false);
        setSlotOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const availableSlots = useMemo(() => slots.filter((slot) => {
    const candidate = `${date}T${slot}`;
    return candidate >= min && candidate <= max && !occupiedSet.has(candidate);
  }), [date, max, min, occupiedSet, slots]);

  const selectedTime = time && availableSlots.includes(time) ? time : (availableSlots[0] ?? "");
  const selectedValue = selectedTime ? `${date}T${selectedTime}` : "";
  const customCanonical = canonicalTime(customTime);
  const customCandidate = customCanonical ? `${date}T${customCanonical}` : "";
  const customValid = Boolean(
    doctorId
      && customCandidate
      && customCandidate >= min
      && customCandidate <= max
      && !occupiedSet.has(customCandidate),
  );
  const valueForSubmit = custom ? (customValid ? customCandidate : "") : (doctorId ? selectedValue : "");

  const calendarCells = useMemo(() => {
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    const offset = (firstWeekday + 1) % 7; // Saturday-first week for Iraq.
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

  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const reference = new Date(Date.UTC(2026, 0, 3 + index)); // Saturday onward.
    return formatWeekday(reference, locale);
  }), [locale]);

  const chooseDate = (value: string) => {
    setDate(value);
    setTime("");
    setDateOpen(false);
    setMonth(monthFromValue(value));
  };

  const openCustom = () => {
    setCustomTime(selectedTime || customTime);
    setCustom(true);
    setSlotOpen(false);
  };

  return (
    <div className="time-field-group localized-time-field" ref={rootRef}>
      <label>{text.date} <span className="label-muted">· {timeZoneLabel}</span></label>
      <div className="date-picker-wrap">
        <button
          className="localized-field-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={dateOpen}
          onClick={() => { setDateOpen((value) => !value); setSlotOpen(false); }}
        >
          <span>{formatLocalDateValue(date, locale)}</span>
          <span className="field-chevron" aria-hidden="true">⌄</span>
        </button>
        {dateOpen ? (
          <div className="calendar-popover" role="dialog" aria-label={text.date}>
            <div className="calendar-heading">
              <button type="button" aria-label={text.previousMonth} onClick={() => setMonth((value) => shiftMonth(value, -1))}>‹</button>
              <strong>{formatMonthYear(month, locale)}</strong>
              <button type="button" aria-label={text.nextMonth} onClick={() => setMonth((value) => shiftMonth(value, 1))}>›</button>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {weekdayLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
            </div>
            <div className="calendar-grid">
              {calendarCells.map((cell, index) => cell.inMonth ? (
                <button
                  key={cell.value}
                  type="button"
                  className={cell.value === date ? "is-selected" : ""}
                  disabled={cell.disabled}
                  aria-current={cell.value === date ? "date" : undefined}
                  onClick={() => chooseDate(cell.value)}
                >
                  {localizeDigits(cell.day, locale)}
                </button>
              ) : <span key={`blank-${index}`} />)}
            </div>
          </div>
        ) : null}
      </div>

      {custom ? (
        <>
          <label htmlFor="appointment_custom_time">{text.time}</label>
          <input
            id="appointment_custom_time"
            className="localized-custom-time"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={localizeDigits(customTime, locale)}
            placeholder={localizeDigits("14:30", locale)}
            aria-invalid={Boolean(customTime) && !customValid}
            onChange={(event) => setCustomTime(typedTime(event.target.value))}
            required
          />
          <button className="inline-mode-button" type="button" onClick={() => setCustom(false)}>
            {text.slots} · {formatMinutes(intervalMinutes, locale)}
          </button>
          <p className="field-help">{text.customHelp}</p>
        </>
      ) : (
        <>
          <label>{text.slot} · {formatMinutes(intervalMinutes, locale)}</label>
          <div className="slot-picker-wrap">
            <button
              className="localized-field-trigger"
              type="button"
              disabled={!doctorId || availableSlots.length === 0}
              aria-haspopup="listbox"
              aria-expanded={slotOpen}
              onClick={() => { setSlotOpen((value) => !value); setDateOpen(false); }}
            >
              <span>
                {!doctorId
                  ? text.chooseDoctor
                  : selectedTime
                    ? formatTimeValue(selectedTime, locale)
                    : text.noSlots}
              </span>
              <span className="field-chevron" aria-hidden="true">⌄</span>
            </button>
            {slotOpen ? (
              <div className="slot-popover" role="listbox" aria-label={text.slot}>
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    role="option"
                    aria-selected={slot === selectedTime}
                    className={slot === selectedTime ? "is-selected" : ""}
                    onClick={() => { setTime(slot); setSlotOpen(false); }}
                  >
                    {formatTimeValue(slot, locale)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="inline-mode-button" type="button" onClick={openCustom}>
            {text.custom}
          </button>
          <p className="field-help">{text.slotHelp}</p>
        </>
      )}

      <input type="hidden" name="appointment_at" value={valueForSubmit} />

      <style jsx>{`
        .localized-time-field {
          min-width: 0;
          position: relative;
        }
        .date-picker-wrap,
        .slot-picker-wrap {
          min-width: 0;
          position: relative;
          width: 100%;
        }
        .localized-field-trigger,
        .localized-custom-time {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          min-height: 48px;
          border: 1px solid #cbd4ce;
          border-radius: 12px;
          padding: 10px 13px;
          background: #fff;
          color: var(--ink);
          box-sizing: border-box;
        }
        .localized-field-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: ${locale === "en" ? "left" : "right"};
          cursor: pointer;
        }
        .localized-field-trigger:focus,
        .localized-custom-time:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(31, 90, 67, .10);
          outline: none;
        }
        .localized-field-trigger:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .field-chevron {
          flex: none;
          color: var(--muted);
          font-size: 14px;
        }
        .localized-custom-time {
          direction: ltr;
          text-align: ${locale === "en" ? "left" : "right"};
        }
        .calendar-popover,
        .slot-popover {
          position: absolute;
          z-index: 95;
          inset-inline: 0;
          top: calc(100% + 7px);
          width: 100%;
          border: 1px solid var(--line-strong);
          border-radius: 16px;
          background: #fff;
          box-shadow: var(--shadow-md);
        }
        .calendar-popover {
          padding: 12px;
        }
        .calendar-heading {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 34px;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .calendar-heading strong {
          min-width: 0;
          text-align: center;
          font-size: 13px;
        }
        .calendar-heading button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 9px;
          background: var(--surface-soft);
          color: var(--ink);
          font-size: 22px;
          cursor: pointer;
        }
        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 3px;
        }
        .calendar-weekdays {
          margin-bottom: 4px;
        }
        .calendar-weekdays span {
          padding: 5px 0;
          color: var(--muted);
          text-align: center;
          font-size: 9px;
          font-weight: 750;
        }
        .calendar-grid button,
        .calendar-grid > span {
          min-width: 0;
          height: 34px;
        }
        .calendar-grid button {
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--ink);
          font-size: 12px;
          cursor: pointer;
        }
        .calendar-grid button:hover {
          background: var(--accent-faint);
        }
        .calendar-grid button.is-selected {
          background: var(--accent);
          color: #fff;
          font-weight: 800;
        }
        .calendar-grid button:disabled {
          opacity: .28;
          cursor: not-allowed;
        }
        .slot-popover {
          max-height: 270px;
          overflow-y: auto;
          padding: 6px;
          overscroll-behavior: contain;
        }
        .slot-popover button {
          display: block;
          width: 100%;
          min-height: 40px;
          border: 0;
          border-radius: 9px;
          padding: 8px 12px;
          background: transparent;
          color: var(--ink);
          text-align: ${locale === "en" ? "left" : "right"};
          cursor: pointer;
        }
        .slot-popover button:hover,
        .slot-popover button.is-selected {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 750;
        }
      `}</style>
    </div>
  );
}
