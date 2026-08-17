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
  type DayPeriod,
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

type SlotParts = {
  hour24: number;
  hour12: number;
  minute: number;
  period: DayPeriod;
};

const timeCopy = {
  en: {
    date: "Appointment date",
    time: "Appointment time",
    slot: "Available time",
    chooseDoctor: "Choose a doctor first",
    noSlots: "No available times",
    custom: "Use custom time",
    slots: "Use available times",
    customHelp: "Type the hour and minute, then choose AM or PM. Typing 3 with 00 means 03:00.",
    slotHelp: "Choose AM or PM, then the hour and minute. Booked times are disabled.",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    hour: "Hour",
    minute: "Minute",
    selected: "Selected",
    am: "AM",
    pm: "PM",
  },
  ku: {
    date: "بەرواری وادە",
    time: "کاتی وادە",
    slot: "کاتی بەردەست",
    chooseDoctor: "سەرەتا پزیشک هەڵبژێرە",
    noSlots: "کاتی بەردەست نییە",
    custom: "کاتی تایبەت",
    slots: "کاتە بەردەستەکان",
    customHelp: "کاتژمێر و خولەک بنووسە، پاشان پێش یان دوای نیوەڕۆ هەڵبژێرە. ٣ و ٠٠ واتە ٠٣:٠٠.",
    slotHelp: "پێش یان دوای نیوەڕۆ هەڵبژێرە، پاشان کاتژمێر و خولەک. کاتە گیراوەکان ناچالاکن.",
    previousMonth: "مانگی پێشوو",
    nextMonth: "مانگی داهاتوو",
    hour: "کاتژمێر",
    minute: "خولەک",
    selected: "هەڵبژێردراو",
    am: "پێش نیوەڕۆ",
    pm: "دوای نیوەڕۆ",
  },
  ar: {
    date: "تاريخ الموعد",
    time: "وقت الموعد",
    slot: "الوقت المتاح",
    chooseDoctor: "اختر الطبيب أولاً",
    noSlots: "لا توجد أوقات متاحة",
    custom: "وقت مخصص",
    slots: "الأوقات المتاحة",
    customHelp: "اكتب الساعة والدقيقة ثم اختر صباحاً أو مساءً. ٣ مع ٠٠ تعني ٠٣:٠٠.",
    slotHelp: "اختر صباحاً أو مساءً، ثم الساعة والدقيقة. الأوقات المحجوزة معطلة.",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    hour: "الساعة",
    minute: "الدقيقة",
    selected: "المحدد",
    am: "صباحاً",
    pm: "مساءً",
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

function slotParts(value: string): SlotParts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 > 23 || minute > 59) return null;
  return {
    hour24,
    hour12: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? "pm" : "am",
  };
}

function to24Hour(hour12: number, minute: number, period: DayPeriod) {
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return "";
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

function preferredSlot(slots: string[], period: DayPeriod) {
  const inPeriod = slots.filter((slot) => slotParts(slot)?.period === period);
  if (period === "pm") {
    const clinicHours = inPeriod.find((slot) => {
      const parts = slotParts(slot);
      return parts ? parts.hour24 >= 14 && parts.hour24 <= 22 : false;
    });
    if (clinicHours) return clinicHours;
  }
  return inPeriod[0] ?? "";
}

function numericInput(value: string, maxLength = 2) {
  return toAsciiDigits(value).replace(/\D/g, "").slice(0, maxLength);
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
  const [period, setPeriod] = useState<DayPeriod>("pm");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customPeriod, setCustomPeriod] = useState<DayPeriod>("pm");
  const [customHour, setCustomHour] = useState("03");
  const [customMinute, setCustomMinute] = useState("00");
  const [dateOpen, setDateOpen] = useState(false);
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
      setSelectedSlot("");
    };
    syncDoctor();
    doctorSelect.addEventListener("change", syncDoctor);
    return () => doctorSelect.removeEventListener("change", syncDoctor);
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setDateOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const availableSlots = useMemo(() => slots.filter((slot) => {
    const candidate = `${date}T${slot}`;
    return candidate >= min && candidate <= max && !occupiedSet.has(candidate);
  }), [date, max, min, occupiedSet, slots]);

  useEffect(() => {
    if (!doctorId || availableSlots.length === 0) {
      setSelectedSlot("");
      return;
    }
    if (selectedSlot && availableSlots.includes(selectedSlot)) return;

    const next = preferredSlot(availableSlots, period)
      || preferredSlot(availableSlots, period === "pm" ? "am" : "pm")
      || availableSlots[0];
    const parts = slotParts(next);
    setSelectedSlot(next);
    if (parts) setPeriod(parts.period);
  }, [availableSlots, doctorId, period, selectedSlot]);

  const selectedParts = slotParts(selectedSlot);
  const hourChoices = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const periodSlots = useMemo(
    () => availableSlots.filter((slot) => slotParts(slot)?.period === period),
    [availableSlots, period],
  );
  const selectedHour = selectedParts?.period === period ? selectedParts.hour12 : null;
  const minuteChoices = useMemo(() => {
    if (!selectedHour) return [];
    return periodSlots
      .map((slot) => slotParts(slot))
      .filter((parts): parts is SlotParts => Boolean(parts && parts.hour12 === selectedHour))
      .map((parts) => parts.minute)
      .filter((minute, index, values) => values.indexOf(minute) === index);
  }, [periodSlots, selectedHour]);

  const periodHasSlots = (candidatePeriod: DayPeriod) => availableSlots.some((slot) => slotParts(slot)?.period === candidatePeriod);
  const hourHasSlots = (hour: number) => periodSlots.some((slot) => slotParts(slot)?.hour12 === hour);

  const choosePeriod = (nextPeriod: DayPeriod) => {
    if (!periodHasSlots(nextPeriod)) return;
    setPeriod(nextPeriod);
    const current = slotParts(selectedSlot);
    if (current) {
      const sameClock = to24Hour(current.hour12, current.minute, nextPeriod);
      if (availableSlots.includes(sameClock)) {
        setSelectedSlot(sameClock);
        return;
      }
    }
    setSelectedSlot(preferredSlot(availableSlots, nextPeriod));
  };

  const chooseHour = (hour: number) => {
    const currentMinute = selectedParts?.minute ?? 0;
    const exact = to24Hour(hour, currentMinute, period);
    if (availableSlots.includes(exact)) {
      setSelectedSlot(exact);
      return;
    }
    const first = periodSlots.find((slot) => slotParts(slot)?.hour12 === hour);
    if (first) setSelectedSlot(first);
  };

  const chooseMinute = (minute: number) => {
    if (!selectedHour) return;
    const next = to24Hour(selectedHour, minute, period);
    if (availableSlots.includes(next)) setSelectedSlot(next);
  };

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

  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const reference = new Date(Date.UTC(2026, 0, 3 + index));
    return formatWeekday(reference, locale);
  }), [locale]);

  const chooseDate = (value: string) => {
    setDate(value);
    setSelectedSlot("");
    setDateOpen(false);
    setMonth(monthFromValue(value));
  };

  const openCustom = () => {
    const parts = slotParts(selectedSlot);
    if (parts) {
      setCustomHour(pad(parts.hour12));
      setCustomMinute(pad(parts.minute));
      setCustomPeriod(parts.period);
    } else {
      setCustomHour("03");
      setCustomMinute("00");
      setCustomPeriod("pm");
    }
    setCustom(true);
  };

  const customHourNumber = Number(customHour);
  const customMinuteNumber = Number(customMinute);
  const customClock = customHour && customMinute
    ? to24Hour(customHourNumber, customMinuteNumber, customPeriod)
    : "";
  const customCandidate = customClock ? `${date}T${customClock}` : "";
  const customValid = Boolean(
    doctorId
      && customCandidate
      && customCandidate >= min
      && customCandidate <= max
      && !occupiedSet.has(customCandidate),
  );
  const selectedValue = selectedSlot ? `${date}T${selectedSlot}` : "";
  const valueForSubmit = custom ? (customValid ? customCandidate : "") : (doctorId ? selectedValue : "");

  return (
    <div className="time-field-group localized-time-field" ref={rootRef}>
      <label>{text.date} <span className="label-muted">· {timeZoneLabel}</span></label>
      <div className="date-picker-wrap">
        <button
          className="localized-field-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={dateOpen}
          onClick={() => setDateOpen((value) => !value)}
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

      <label>{custom ? text.time : `${text.slot} · ${formatMinutes(intervalMinutes, locale)}`}</label>

      {custom ? (
        <div className="custom-time-card">
          <div className="period-toggle" role="group" aria-label={text.time}>
            <button type="button" className={customPeriod === "am" ? "is-selected" : ""} onClick={() => setCustomPeriod("am")}>{text.am}</button>
            <button type="button" className={customPeriod === "pm" ? "is-selected" : ""} onClick={() => setCustomPeriod("pm")}>{text.pm}</button>
          </div>
          <div className="custom-clock-row" dir="ltr">
            <label className="custom-number-field">
              <span>{text.hour}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={localizeDigits(customHour, locale)}
                onChange={(event) => setCustomHour(numericInput(event.target.value))}
                onBlur={() => {
                  const value = Number(customHour);
                  if (value >= 1 && value <= 12) setCustomHour(pad(value));
                }}
                aria-label={text.hour}
              />
            </label>
            <span className="custom-colon" aria-hidden="true">:</span>
            <label className="custom-number-field">
              <span>{text.minute}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={localizeDigits(customMinute, locale)}
                onChange={(event) => setCustomMinute(numericInput(event.target.value))}
                onBlur={() => {
                  const value = Number(customMinute);
                  if (value >= 0 && value <= 59) setCustomMinute(pad(value));
                }}
                aria-label={text.minute}
              />
            </label>
          </div>
          <div className={`selected-time ${customClock ? "" : "is-empty"}`}>
            <span>{text.selected}</span>
            <strong>{customClock ? formatTimeValue(customClock, locale) : "—"}</strong>
          </div>
          <button className="inline-mode-button" type="button" onClick={() => setCustom(false)}>
            {text.slots} · {formatMinutes(intervalMinutes, locale)}
          </button>
          <p className="field-help">{text.customHelp}</p>
        </div>
      ) : (
        <div className="fast-time-picker">
          <div className="period-toggle" role="group" aria-label={text.time}>
            <button
              type="button"
              disabled={!doctorId || !periodHasSlots("am")}
              className={period === "am" ? "is-selected" : ""}
              onClick={() => choosePeriod("am")}
            >
              {text.am}
            </button>
            <button
              type="button"
              disabled={!doctorId || !periodHasSlots("pm")}
              className={period === "pm" ? "is-selected" : ""}
              onClick={() => choosePeriod("pm")}
            >
              {text.pm}
            </button>
          </div>

          {!doctorId ? (
            <div className="time-empty">{text.chooseDoctor}</div>
          ) : availableSlots.length === 0 ? (
            <div className="time-empty">{text.noSlots}</div>
          ) : (
            <>
              <div className="time-section-label">{text.hour}</div>
              <div className="hour-grid" role="group" aria-label={text.hour}>
                {hourChoices.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    disabled={!hourHasSlots(hour)}
                    className={selectedHour === hour ? "is-selected" : ""}
                    onClick={() => chooseHour(hour)}
                  >
                    {localizeDigits(String(hour).padStart(2, "0"), locale)}
                  </button>
                ))}
              </div>

              <div className="time-section-label">{text.minute}</div>
              <div className="minute-grid" role="group" aria-label={text.minute}>
                {minuteChoices.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={selectedParts?.minute === minute ? "is-selected" : ""}
                    onClick={() => chooseMinute(minute)}
                  >
                    {localizeDigits(pad(minute), locale)}
                  </button>
                ))}
              </div>

              <div className="selected-time">
                <span>{text.selected}</span>
                <strong>{selectedSlot ? formatTimeValue(selectedSlot, locale) : "—"}</strong>
              </div>
            </>
          )}

          <button className="inline-mode-button" type="button" onClick={openCustom}>
            {text.custom}
          </button>
          <p className="field-help">{text.slotHelp}</p>
        </div>
      )}

      <input type="hidden" name="appointment_at" value={valueForSubmit} required />

      <style jsx>{`
        .localized-time-field {
          min-width: 0;
          position: relative;
        }
        .date-picker-wrap {
          min-width: 0;
          position: relative;
          width: 100%;
        }
        .localized-field-trigger {
          display: flex;
          width: 100%;
          min-width: 0;
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
        .localized-field-trigger:focus,
        .period-toggle button:focus,
        .hour-grid button:focus,
        .minute-grid button:focus,
        .custom-number-field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(31, 90, 67, .10);
          outline: none;
        }
        .field-chevron {
          flex: none;
          color: var(--muted);
          font-size: 14px;
        }
        .calendar-popover {
          position: absolute;
          z-index: 95;
          inset-inline: 0;
          top: calc(100% + 7px);
          width: 100%;
          border: 1px solid var(--line-strong);
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          box-shadow: var(--shadow-md);
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
        .calendar-weekdays { margin-bottom: 4px; }
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
        .calendar-grid button:hover { background: var(--accent-faint); }
        .calendar-grid button.is-selected {
          background: var(--accent);
          color: #fff;
          font-weight: 800;
        }
        .calendar-grid button:disabled { opacity: .28; cursor: not-allowed; }
        .fast-time-picker,
        .custom-time-card {
          display: grid;
          gap: 9px;
          min-width: 0;
        }
        .period-toggle {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          padding: 4px;
          border-radius: 12px;
          background: #edf2ef;
        }
        .period-toggle button {
          min-height: 40px;
          border: 1px solid transparent;
          border-radius: 9px;
          padding: 8px 10px;
          background: transparent;
          color: var(--ink-soft);
          font-size: 12px;
          font-weight: 760;
          cursor: pointer;
        }
        .period-toggle button.is-selected {
          border-color: #cbdad1;
          background: #fff;
          color: var(--accent);
          box-shadow: 0 2px 8px rgba(20,36,28,.07);
        }
        .period-toggle button:disabled { opacity: .35; cursor: not-allowed; }
        .time-section-label {
          margin-top: 2px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
        }
        .hour-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 5px;
        }
        .minute-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }
        .hour-grid button,
        .minute-grid button {
          min-width: 0;
          min-height: 38px;
          border: 1px solid #dce4df;
          border-radius: 9px;
          padding: 6px 4px;
          background: #fff;
          color: var(--ink-soft);
          font-size: 12px;
          font-weight: 720;
          cursor: pointer;
        }
        .hour-grid button.is-selected,
        .minute-grid button.is-selected {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 850;
        }
        .hour-grid button:disabled,
        .minute-grid button:disabled { opacity: .28; cursor: not-allowed; }
        .selected-time {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 10px;
          padding: 9px 11px;
          background: var(--accent-faint);
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
        }
        .selected-time strong {
          color: var(--accent);
          font-size: 14px;
          font-weight: 850;
          direction: ltr;
          unicode-bidi: isolate;
        }
        .selected-time.is-empty strong { color: var(--muted); }
        .time-empty {
          border: 1px dashed var(--line-strong);
          border-radius: 10px;
          padding: 12px;
          color: var(--muted);
          text-align: center;
          font-size: 11px;
        }
        .custom-clock-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: end;
          gap: 8px;
        }
        .custom-number-field {
          display: grid;
          gap: 5px;
          margin: 0 !important;
          color: var(--muted);
          font-size: 10px !important;
          font-weight: 750 !important;
        }
        .custom-number-field input {
          width: 100%;
          min-width: 0;
          min-height: 48px;
          border: 1px solid #cbd4ce;
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
          color: var(--ink);
          text-align: center;
          font-size: 17px;
          font-weight: 760;
        }
        .custom-colon {
          padding-bottom: 12px;
          color: var(--ink);
          font-size: 21px;
          font-weight: 800;
        }
        .inline-mode-button {
          justify-self: ${locale === "en" ? "start" : "end"};
        }
        @media (max-width: 420px) {
          .hour-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
