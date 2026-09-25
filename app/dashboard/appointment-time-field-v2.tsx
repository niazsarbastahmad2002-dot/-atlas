"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatAppointmentDateValue,
  formatMonthYear,
  formatWeekday,
  localizeDigits,
} from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";

type Props = {
  intervalMinutes: number;
  min: string;
  max: string;
  initialDate?: string;
  occupiedByDoctor: Record<string, string[]>;
  timeZoneLabel: string;
  locale: UiLocale;
};

type Period = "am" | "pm";

const copy = {
  en: { date: "Appointment date", time: "Appointment time", am: "AM", pm: "PM", hour: "Hour", minute: "Minute", custom: "Custom time", quick: "Available times", selected: "Selected", booked: "That exact time is already booked for this doctor.", doctor: "Choose a doctor first", invalid: "Choose a valid future time", previous: "Previous month", next: "Next month" },
  ku: { date: "بەرواری وادە", time: "کاتی وادە", am: "پێش نیوەڕۆ", pm: "دوای نیوەڕۆ", hour: "کاتژمێر", minute: "خولەک", custom: "کاتی تایبەت", quick: "کاتە بەردەستەکان", selected: "هەڵبژێردراو", booked: "ئەم کاتەی تەواو بۆ ئەم پزیشکە گیراوە.", doctor: "سەرەتا پزیشک هەڵبژێرە", invalid: "کاتێکی دروستی داهاتوو هەڵبژێرە", previous: "مانگی پێشوو", next: "مانگی داهاتوو" },
  bd: { date: "ڕێکەفتا وادەیێ", time: "دەمێ وادەیێ", am: "بەری نیڤرۆ", pm: "پشتی نیڤرۆ", hour: "دەمژمێر", minute: "خولەک", custom: "دەمێ تایبەت", quick: "دەمێن بەردەست", selected: "هەلبژارتی", booked: "ئەڤ دەم بۆ ڤی دکتۆری هاتییە گرتن.", doctor: "سەرەتا دکتۆر هەلبژێرە", invalid: "دەمەکێ دروست یێ داهاتوو هەلبژێرە", previous: "مەها بەرێ", next: "مەها پاش" },
  ar: { date: "تاريخ الموعد", time: "وقت الموعد", am: "صباحاً", pm: "مساءً", hour: "الساعة", minute: "الدقيقة", custom: "وقت مخصص", quick: "الأوقات المتاحة", selected: "المحدد", booked: "هذا الوقت محجوز بالفعل لهذا الطبيب.", doctor: "اختر الطبيب أولاً", invalid: "اختر وقتاً مستقبلياً صالحاً", previous: "الشهر السابق", next: "الشهر التالي" },
} as const;

function pad(value: number) { return String(value).padStart(2, "0"); }
function to24(hour: number, minute: number, period: Period) {
  const h = period === "am" ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
  return `${pad(h)}:${pad(minute)}`;
}
function to12(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return { hour: hour % 12 || 12, minute, period: (hour >= 12 ? "pm" : "am") as Period };
}
function addDays(date: string, amount: number) {
  const [y, m, d] = date.split("-").map(Number);
  const value = new Date(Date.UTC(y, m - 1, d + amount));
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}
function addLocalMinutes(value: string, minutes: number) {
  const [date, time] = value.split("T");
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const dayShift = Math.floor(total / 1440);
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${addDays(date, dayShift)}T${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}
function ceilToInterval(value: string, interval: number) {
  const [date, time] = value.split("T");
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute;
  const rounded = Math.ceil(total / interval) * interval;
  if (rounded >= 1440) return `${addDays(date, 1)}T00:00`;
  return `${date}T${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
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

function baghdadLocalMinute(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function AppointmentTimeField({ intervalMinutes, min, max, initialDate, occupiedByDoctor, timeZoneLabel, locale }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const appliedAfterRef = useRef("");
  const text = copy[locale];
  const [liveMin, setLiveMin] = useState(min);
  const effectiveMin = liveMin > min ? liveMin : min;
  const minDate = effectiveMin.slice(0, 10);
  const maxDate = max.slice(0, 10);
  const initial = initialDate && initialDate >= minDate && initialDate <= maxDate ? initialDate : minDate;
  const [doctorId, setDoctorId] = useState("");
  const [interval, setInterval] = useState([5, 10, 15, 20, 30].includes(intervalMinutes) ? intervalMinutes : 15);
  const [date, setDate] = useState(initial);
  const [dateOpen, setDateOpen] = useState(false);
  const [month, setMonth] = useState(() => monthFromValue(initial));
  const [period, setPeriod] = useState<Period>("am");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [custom, setCustom] = useState(false);
  const [touched, setTouched] = useState(false);
  const [savedAdvance, setSavedAdvance] = useState(false);

  useEffect(() => {
    const refreshMinimum = () => {
      const fiveMinutesFromNow = addLocalMinutes(baghdadLocalMinute(new Date()), 5);
      setLiveMin((current) => current === fiveMinutesFromNow ? current : fiveMinutesFromNow);
    };
    refreshMinimum();
    const timer = window.setInterval(refreshMinimum, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    const doctor = form?.querySelector<HTMLSelectElement>("#doctor_id");
    const clinic = form?.querySelector<HTMLInputElement>('input[name="clinic_id"]');
    if (!form || !doctor) return;

    let controller: AbortController | null = null;
    const syncDoctor = () => {
      const nextDoctor = doctor.value;
      setDoctorId(nextDoctor);
      setTouched(false);
      setSavedAdvance(false);
      controller?.abort();
      if (!clinic?.value || !nextDoctor) return;
      controller = new AbortController();
      fetch(`/api/settings/doctor-workflow?clinic_id=${encodeURIComponent(clinic.value)}&doctor_id=${encodeURIComponent(nextDoctor)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          const value = Number(data?.appointmentIntervalMinutes);
          if ([5, 10, 15, 20, 30].includes(value)) setInterval(value);
          const language = data?.defaultReminderLanguage;
          const languageSelect = form.querySelector<HTMLSelectElement>('select[name="reminder_language"]');
          if (languageSelect && ["ku", "bd", "ar", "en"].includes(language)) languageSelect.value = language;
        })
        .catch(() => undefined);
    };

    syncDoctor();
    doctor.addEventListener("change", syncDoctor);
    return () => {
      controller?.abort();
      doctor.removeEventListener("change", syncDoctor);
    };
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setDateOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const occupied = useMemo(() => new Set(doctorId ? occupiedByDoctor[doctorId] ?? [] : []), [doctorId, occupiedByDoctor]);
  const minuteOptions = useMemo(() => {
    const values: number[] = [];
    for (let value = 0; value < 60; value += interval) values.push(value);
    return values;
  }, [interval]);

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

  const chooseParts = (localValue: string) => {
    const [nextDate, nextTime] = localValue.split("T");
    const parts = to12(nextTime);
    setDate(nextDate);
    setMonth(monthFromValue(nextDate));
    setPeriod(parts.period);
    setHour(parts.hour);
    setMinute(parts.minute);
  };

  const nextDefault = useMemo(() => {
    if (!doctorId) return "";
    const dayAppointments = [...occupied].filter((value) => value.startsWith(`${date}T`)).sort();
    let candidate = dayAppointments.length ? addLocalMinutes(dayAppointments[dayAppointments.length - 1], interval) : date === minDate ? ceilToInterval(effectiveMin, interval) : `${date}T09:00`;
    if (!candidate.startsWith(`${date}T`) && date !== minDate) candidate = `${date}T09:00`;
    for (let attempt = 0; attempt < 288; attempt += 1) {
      if (candidate >= effectiveMin && candidate <= max && !occupied.has(candidate)) return candidate;
      candidate = addLocalMinutes(candidate, interval);
      if (!candidate.startsWith(`${date}T`)) break;
    }
    return "";
  }, [date, doctorId, effectiveMin, interval, max, minDate, occupied]);

  useEffect(() => {
    if (custom || touched || savedAdvance || !nextDefault) return;
    chooseParts(nextDefault);
  }, [custom, nextDefault, savedAdvance, touched]);

  const time = to24(hour, minute, period);
  const value = `${date}T${time}`;
  const exactBooked = occupied.has(value);
  const outOfRange = value < min || value > max;
  const usable = Boolean(doctorId) && !exactBooked && !outOfRange;

  useEffect(() => {
    if (!doctorId || !occupied.has(value)) return;
    let candidate = addLocalMinutes(value, interval);
    for (let attempt = 0; attempt < 288; attempt += 1) {
      if (!candidate.startsWith(`${date}T`)) return;
      if (candidate >= effectiveMin && candidate <= max && !occupied.has(candidate)) {
        chooseParts(candidate);
        setCustom(false);
        setSavedAdvance(true);
        return;
      }
      candidate = addLocalMinutes(candidate, interval);
    }
  }, [date, doctorId, effectiveMin, interval, max, occupied, value]);

  useEffect(() => {
    if (!doctorId || touched || custom || typeof window === "undefined") return;
    const after = new URLSearchParams(window.location.search).get("after");
    if (!after || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(after) || !after.startsWith(`${date}T`)) return;
    const applicationKey = `${doctorId}:${after}:${interval}`;
    if (appliedAfterRef.current === applicationKey) return;

    let candidate = addLocalMinutes(after, interval);
    for (let attempt = 0; attempt < 288; attempt += 1) {
      if (!candidate.startsWith(`${date}T`)) break;
      if (candidate >= effectiveMin && candidate <= max && !occupied.has(candidate)) {
        chooseParts(candidate);
        setCustom(false);
        setSavedAdvance(true);
        appliedAfterRef.current = applicationKey;
        return;
      }
      candidate = addLocalMinutes(candidate, interval);
    }
    appliedAfterRef.current = applicationKey;
  }, [custom, date, doctorId, effectiveMin, interval, max, occupied, touched]);

  const select = (nextHour: number, nextMinute: number, nextPeriod: Period) => {
    setHour(nextHour);
    setMinute(nextMinute);
    setPeriod(nextPeriod);
    setSavedAdvance(false);
    setTouched(true);
  };

  const chooseDate = (nextDate: string) => {
    setDate(nextDate);
    setMonth(monthFromValue(nextDate));
    setDateOpen(false);
    setSavedAdvance(false);
    setTouched(false);
  };

  return (
    <div className="atlas-time-v2" ref={rootRef}>
      <label>{text.date} <small>· {timeZoneLabel}</small></label>
      <div className="atlas-date-wrap">
        <button
          className="atlas-date-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={dateOpen}
          onClick={() => setDateOpen((current) => !current)}
        >
          <bdi dir="ltr" className="atlas-date-value">{formatAppointmentDateValue(date)}</bdi>
          <span className="atlas-date-chevron" aria-hidden="true">⌄</span>
        </button>
        {dateOpen ? (
          <div className="atlas-calendar-popover" role="dialog" aria-label={text.date} dir={locale === "en" ? "ltr" : "rtl"}>
            <div className="atlas-calendar-heading">
              <button type="button" aria-label={text.previous} onClick={() => setMonth((current) => shiftMonth(current, -1))}>‹</button>
              <strong>{formatMonthYear(month, locale)}</strong>
              <button type="button" aria-label={text.next} onClick={() => setMonth((current) => shiftMonth(current, 1))}>›</button>
            </div>
            <div className="atlas-calendar-weekdays" aria-hidden="true">
              {weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
            </div>
            <div className="atlas-calendar-grid">
              {calendarCells.map((cell, index) => cell.inMonth ? (
                <button
                  key={cell.value}
                  type="button"
                  disabled={cell.disabled}
                  className={cell.value === date ? "is-selected" : ""}
                  onClick={() => chooseDate(cell.value)}
                >
                  {localizeDigits(cell.day, locale)}
                </button>
              ) : <span key={`blank-${index}`} />)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="atlas-time-heading"><strong>{text.time} · {interval} min</strong><button type="button" onClick={() => { setCustom((current) => !current); setSavedAdvance(false); setTouched(true); }}>{custom ? text.quick : text.custom}</button></div>
      <div className="atlas-period-tabs" role="group" aria-label={text.time}>
        <button className={period === "am" ? "is-selected" : ""} type="button" onClick={() => select(hour, minute, "am")}>{text.am}</button>
        <button className={period === "pm" ? "is-selected" : ""} type="button" onClick={() => select(hour, minute, "pm")}>{text.pm}</button>
      </div>
      {custom ? (
        <div className="atlas-custom-time">
          <label><span>{text.hour}</span><input inputMode="numeric" type="number" min="1" max="12" value={hour} onChange={(event) => select(Math.max(1, Math.min(12, Number(event.target.value) || 1)), minute, period)} /></label>
          <span className="atlas-time-colon">:</span>
          <label><span>{text.minute}</span><input inputMode="numeric" type="number" min="0" max="59" value={minute} onChange={(event) => select(hour, Math.max(0, Math.min(59, Number(event.target.value) || 0)), period)} /></label>
        </div>
      ) : (
        <>
          <span className="atlas-time-grid-label">{text.hour}</span>
          <div className="atlas-hour-grid">{Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <button className={hour === item ? "is-selected" : ""} type="button" key={item} onClick={() => select(item, minuteOptions.includes(minute) ? minute : minuteOptions[0], period)}>{localizeDigits(item, locale)}</button>)}</div>
          <span className="atlas-time-grid-label">{text.minute}</span>
          <div className="atlas-minute-grid">{minuteOptions.map((item) => {
            const candidate = `${date}T${to24(hour, item, period)}`;
            const blocked = occupied.has(candidate) || candidate < effectiveMin || candidate > max;
            return <button className={minute === item ? "is-selected" : ""} type="button" key={item} disabled={blocked} onClick={() => select(hour, item, period)}>{localizeDigits(item, locale)}</button>;
          })}</div>
        </>
      )}
      <input type="hidden" name="appointment_at" value={usable ? value : ""} />
      <div className={`atlas-selected-time ${usable ? "" : "is-error"}`}><span>{usable ? text.selected : !doctorId ? text.doctor : exactBooked ? text.booked : text.invalid}</span><strong dir="ltr">{usable ? `${localizeDigits(hour, locale)}:${localizeDigits(pad(minute), locale)} ${period === "am" ? text.am : text.pm}` : "—"}</strong></div>
      <style>{`
        .atlas-time-v2{display:grid;gap:10px;position:relative}.atlas-time-v2>label{font-size:12px;font-weight:800}.atlas-time-v2>label small{font-weight:600;color:var(--muted)}
        .atlas-date-wrap{position:relative}.atlas-date-trigger{display:flex;width:100%;min-height:50px;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--line-strong);border-radius:13px;padding:10px 14px;background:#fff;color:var(--ink);font:inherit;font-weight:760;cursor:pointer}.atlas-date-value{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;letter-spacing:.02em}.atlas-date-chevron{color:var(--muted);font-size:16px}
        .atlas-calendar-popover{position:absolute;z-index:40;inset-inline:0;top:calc(100% + 7px);border:1px solid var(--line-strong);border-radius:18px;padding:15px;background:#fff;box-shadow:var(--shadow-md)}
        .atlas-calendar-heading{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;gap:8px;margin-bottom:10px}.atlas-calendar-heading strong{text-align:center;font-size:15px}.atlas-calendar-heading button{width:40px;height:40px;border:0;border-radius:10px;background:var(--surface-soft);font-size:23px;cursor:pointer}
        .atlas-calendar-weekdays,.atlas-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.atlas-calendar-weekdays{margin-bottom:4px}.atlas-calendar-weekdays span{padding:4px 0;color:var(--muted);text-align:center;font-size:9px;font-weight:760;white-space:nowrap}.atlas-calendar-grid button,.atlas-calendar-grid>span{height:38px;min-width:0}.atlas-calendar-grid button{border:0;border-radius:10px;background:transparent;color:var(--ink);font-size:13px;cursor:pointer}.atlas-calendar-grid button.is-selected{background:var(--accent);color:#fff;font-weight:840;box-shadow:0 4px 12px rgba(8,119,90,.18)}.atlas-calendar-grid button:disabled{opacity:.25;cursor:not-allowed}
        .atlas-time-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:3px}.atlas-time-heading strong{font-size:12px}.atlas-time-heading button{border:0;background:transparent;color:var(--accent);font-size:11px;font-weight:800;cursor:pointer}.atlas-period-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;border-radius:13px;padding:4px;background:var(--surface-soft)}.atlas-period-tabs button,.atlas-hour-grid button,.atlas-minute-grid button{min-height:42px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--ink);font-weight:800;cursor:pointer}.atlas-period-tabs button.is-selected,.atlas-hour-grid button.is-selected,.atlas-minute-grid button.is-selected{border-color:rgba(8,119,90,.35);background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(8,119,90,.08)}.atlas-time-grid-label{margin-top:2px;color:var(--muted);font-size:10px;font-weight:800}.atlas-hour-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.atlas-minute-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.atlas-hour-grid button,.atlas-minute-grid button{border-color:var(--line);background:#fff}.atlas-hour-grid button:disabled,.atlas-minute-grid button:disabled{opacity:.28;cursor:not-allowed}.atlas-custom-time{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:9px}.atlas-custom-time label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:800}.atlas-custom-time input{min-height:54px;border:1px solid var(--line-strong);border-radius:13px;padding:8px 12px;text-align:center;font-size:22px;font-weight:850}.atlas-time-colon{padding-bottom:13px;font-size:24px;font-weight:900}.atlas-selected-time{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;padding:11px 13px;background:var(--accent-soft);color:var(--accent)}.atlas-selected-time span{font-size:11px;font-weight:750}.atlas-selected-time strong{font-size:14px}.atlas-selected-time.is-error{background:#fff2ef;color:#a64a3a}@media(max-width:560px){.atlas-hour-grid,.atlas-minute-grid{grid-template-columns:repeat(4,1fr)}.atlas-calendar-popover{position:relative;top:auto;margin-top:7px}}
      `}</style>
    </div>
  );
}
