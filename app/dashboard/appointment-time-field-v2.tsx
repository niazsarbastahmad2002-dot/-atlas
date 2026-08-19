"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  en: { date: "Appointment date", time: "Appointment time", am: "AM", pm: "PM", hour: "Hour", minute: "Minute", custom: "Custom time", quick: "Available times", selected: "Selected", booked: "That exact time is already booked for this doctor.", doctor: "Choose a doctor first" },
  ku: { date: "بەرواری وادە", time: "کاتی وادە", am: "پێش نیوەڕۆ", pm: "دوای نیوەڕۆ", hour: "کاتژمێر", minute: "خولەک", custom: "کاتی تایبەت", quick: "کاتە بەردەستەکان", selected: "هەڵبژێردراو", booked: "ئەم کاتەی تەواو بۆ ئەم پزیشکە گیراوە.", doctor: "سەرەتا پزیشک هەڵبژێرە" },
  ar: { date: "تاريخ الموعد", time: "وقت الموعد", am: "صباحاً", pm: "مساءً", hour: "الساعة", minute: "الدقيقة", custom: "وقت مخصص", quick: "الأوقات المتاحة", selected: "المحدد", booked: "هذا الوقت محجوز بالفعل لهذا الطبيب.", doctor: "اختر الطبيب أولاً" },
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

export function AppointmentTimeField({ intervalMinutes, min, max, initialDate, occupiedByDoctor, timeZoneLabel, locale }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const text = copy[locale];
  const minDate = min.slice(0, 10);
  const maxDate = max.slice(0, 10);
  const initial = initialDate && initialDate >= minDate && initialDate <= maxDate ? initialDate : minDate;
  const [doctorId, setDoctorId] = useState("");
  const [interval, setInterval] = useState([5, 10, 15, 20, 30].includes(intervalMinutes) ? intervalMinutes : 15);
  const [date, setDate] = useState(initial);
  const [period, setPeriod] = useState<Period>("am");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [custom, setCustom] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    const doctor = form?.querySelector<HTMLInputElement>("#doctor_id");
    const clinic = form?.querySelector<HTMLInputElement>('input[name="clinic_id"]');
    if (!form || !doctor) return;
    const nextDoctor = doctor.value;
    setDoctorId(nextDoctor);
    if (!clinic?.value || !nextDoctor) return;
    const controller = new AbortController();
    fetch(`/api/settings/doctor-workflow?clinic_id=${encodeURIComponent(clinic.value)}&doctor_id=${encodeURIComponent(nextDoctor)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const value = Number(data?.appointmentIntervalMinutes);
        if ([5, 10, 15, 20, 30].includes(value)) setInterval(value);
        const language = data?.defaultReminderLanguage;
        const languageSelect = form.querySelector<HTMLSelectElement>('select[name="reminder_language"]');
        if (languageSelect && ["ku", "ar", "en"].includes(language)) languageSelect.value = language;
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const occupied = useMemo(() => new Set(doctorId ? occupiedByDoctor[doctorId] ?? [] : []), [doctorId, occupiedByDoctor]);
  const minuteOptions = useMemo(() => {
    const values: number[] = [];
    for (let value = 0; value < 60; value += interval) values.push(value);
    return values;
  }, [interval]);

  const chooseParts = (localValue: string) => {
    const [nextDate, nextTime] = localValue.split("T");
    const parts = to12(nextTime);
    setDate(nextDate);
    setPeriod(parts.period);
    setHour(parts.hour);
    setMinute(parts.minute);
  };

  const nextDefault = useMemo(() => {
    if (!doctorId) return "";
    const dayAppointments = [...occupied].filter((value) => value.startsWith(`${date}T`)).sort();
    let candidate = dayAppointments.length ? addLocalMinutes(dayAppointments[dayAppointments.length - 1], interval) : date === minDate ? ceilToInterval(min, interval) : `${date}T09:00`;
    if (!candidate.startsWith(`${date}T`) && date !== minDate) candidate = `${date}T09:00`;
    for (let attempt = 0; attempt < 288; attempt += 1) {
      if (candidate >= min && candidate <= max && !occupied.has(candidate)) return candidate;
      candidate = addLocalMinutes(candidate, interval);
      if (!candidate.startsWith(`${date}T`)) break;
    }
    return "";
  }, [date, doctorId, interval, max, min, minDate, occupied]);

  useEffect(() => {
    if (custom || touched || !nextDefault) return;
    chooseParts(nextDefault);
  }, [custom, nextDefault, touched]);

  useEffect(() => { setTouched(false); }, [date, doctorId]);

  const time = to24(hour, minute, period);
  const value = `${date}T${time}`;
  const exactBooked = occupied.has(value);
  const outOfRange = value < min || value > max;
  const usable = Boolean(doctorId) && !exactBooked && !outOfRange;

  const select = (nextHour: number, nextMinute: number, nextPeriod: Period) => {
    setHour(nextHour); setMinute(nextMinute); setPeriod(nextPeriod); setTouched(true);
  };

  return (
    <div className="atlas-time-v2" ref={rootRef}>
      <label htmlFor="atlas-appointment-date-v2">{text.date} <small>· {timeZoneLabel}</small></label>
      <input id="atlas-appointment-date-v2" type="date" value={date} min={minDate} max={maxDate} onChange={(event) => { setDate(event.target.value); setTouched(false); }} />
      <div className="atlas-time-heading"><strong>{text.time} · {interval} min</strong><button type="button" onClick={() => { setCustom((current) => !current); setTouched(true); }}>{custom ? text.quick : text.custom}</button></div>
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
          <div className="atlas-hour-grid">{Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <button className={hour === item ? "is-selected" : ""} type="button" key={item} onClick={() => select(item, minuteOptions.includes(minute) ? minute : minuteOptions[0], period)}>{pad(item)}</button>)}</div>
          <span className="atlas-time-grid-label">{text.minute}</span>
          <div className="atlas-minute-grid">{minuteOptions.map((item) => {
            const candidate = `${date}T${to24(hour, item, period)}`;
            const blocked = occupied.has(candidate) || candidate < min || candidate > max;
            return <button className={minute === item ? "is-selected" : ""} type="button" key={item} disabled={blocked} onClick={() => select(hour, item, period)}>{pad(item)}</button>;
          })}</div>
        </>
      )}
      <input type="hidden" name="appointment_at" value={usable ? value : ""} />
      <div className={`atlas-selected-time ${usable ? "" : "is-error"}`}><span>{usable ? text.selected : exactBooked ? text.booked : text.doctor}</span><strong dir="ltr">{usable ? `${pad(hour)}:${pad(minute)} ${period.toUpperCase()}` : "—"}</strong></div>
      <style>{`
        .atlas-time-v2{display:grid;gap:10px}.atlas-time-v2>label{font-size:12px;font-weight:800}.atlas-time-v2>label small{font-weight:600;color:var(--muted)}.atlas-time-v2 input[type=date]{min-height:48px;border:1px solid var(--line-strong);border-radius:13px;padding:10px 13px;background:#fff;color:var(--ink);font:inherit}.atlas-time-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:3px}.atlas-time-heading strong{font-size:12px}.atlas-time-heading button{border:0;background:transparent;color:var(--accent);font-size:11px;font-weight:800;cursor:pointer}.atlas-period-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;border-radius:13px;padding:4px;background:var(--surface-soft)}.atlas-period-tabs button,.atlas-hour-grid button,.atlas-minute-grid button{min-height:42px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--ink);font-weight:800;cursor:pointer}.atlas-period-tabs button.is-selected,.atlas-hour-grid button.is-selected,.atlas-minute-grid button.is-selected{border-color:rgba(8,119,90,.35);background:#fff;color:var(--accent);box-shadow:0 2px 8px rgba(8,119,90,.08)}.atlas-time-grid-label{margin-top:2px;color:var(--muted);font-size:10px;font-weight:800}.atlas-hour-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.atlas-minute-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.atlas-hour-grid button,.atlas-minute-grid button{border-color:var(--line);background:#fff}.atlas-hour-grid button:disabled,.atlas-minute-grid button:disabled{opacity:.28;cursor:not-allowed}.atlas-custom-time{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:9px}.atlas-custom-time label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:800}.atlas-custom-time input{min-height:54px;border:1px solid var(--line-strong);border-radius:13px;padding:8px 12px;text-align:center;font-size:22px;font-weight:850}.atlas-time-colon{padding-bottom:13px;font-size:24px;font-weight:900}.atlas-selected-time{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;padding:11px 13px;background:var(--accent-soft);color:var(--accent)}.atlas-selected-time span{font-size:11px;font-weight:750}.atlas-selected-time strong{font-size:14px}.atlas-selected-time.is-error{background:#fff2ef;color:#a64a3a}@media(max-width:560px){.atlas-hour-grid,.atlas-minute-grid{grid-template-columns:repeat(4,1fr)}}
      `}</style>
    </div>
  );
}
