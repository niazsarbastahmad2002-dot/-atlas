"use client";

import { useEffect, useMemo, useState } from "react";
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
    slot: "Available slot",
    chooseDoctor: "Choose a doctor first",
    noSlots: "No selectable slots",
    booked: "booked",
    custom: "Use custom time",
    slots: "Use quick slots",
    customHelp: "Custom time is available when the clinic needs an off-grid appointment.",
    slotHelp: "Booked pending and confirmed times are hidden for the selected doctor.",
  },
  ku: {
    dateTime: "بەروار و کات",
    date: "بەرواری وادە",
    slot: "کاتی بەردەست",
    chooseDoctor: "سەرەتا پزیشک هەڵبژێرە",
    noSlots: "کاتی بەردەست نییە",
    booked: "گیراوە",
    custom: "کاتی تایبەت",
    slots: "کاتە خێراکان",
    customHelp: "ئەگەر کلینیک پێویستی بە کاتێکی دەرەوەی خشتە هەبێت، کاتی تایبەت بەکاربهێنە.",
    slotHelp: "کاتە گیراوەکانی چاوەڕوان و پشتڕاستکراو بۆ پزیشکی هەڵبژێردراو نیشان نادرێن.",
  },
  ar: {
    dateTime: "التاريخ والوقت",
    date: "تاريخ الموعد",
    slot: "الوقت المتاح",
    chooseDoctor: "اختر الطبيب أولاً",
    noSlots: "لا توجد أوقات متاحة",
    booked: "محجوز",
    custom: "وقت مخصص",
    slots: "الأوقات السريعة",
    customHelp: "استخدم وقتاً مخصصاً عندما تحتاج العيادة موعداً خارج الفواصل المعتادة.",
    slotHelp: "الأوقات المحجوزة قيد الانتظار أو المؤكدة مخفية للطبيب المحدد.",
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
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(startingDate);
  const [doctorId, setDoctorId] = useState("");
  const [time, setTime] = useState("");
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
    };
    syncDoctor();
    doctorSelect.addEventListener("change", syncDoctor);
    return () => doctorSelect.removeEventListener("change", syncDoctor);
  }, []);

  const firstAvailable = useMemo(() => {
    return slots.find((slot) => {
      const candidate = `${date}T${slot}`;
      return candidate >= min && candidate <= max && !occupiedSet.has(candidate);
    }) ?? "";
  }, [date, max, min, occupiedSet, slots]);

  const requestedCandidate = time ? `${date}T${time}` : "";
  const requestedTimeValid = Boolean(
    time
      && slots.includes(time)
      && requestedCandidate >= min
      && requestedCandidate <= max
      && !occupiedSet.has(requestedCandidate),
  );
  const selectedTime = requestedTimeValid ? time : firstAvailable;
  const selectedValue = selectedTime ? `${date}T${selectedTime}` : "";

  if (custom) {
    return (
      <div className="time-field-group" style={{ minWidth: 0 }}>
        <label htmlFor="appointment_at">{text.dateTime} <span className="label-muted">· {timeZoneLabel}</span></label>
        <input
          id="appointment_at"
          name="appointment_at"
          type="datetime-local"
          min={min}
          max={max}
          defaultValue={selectedValue}
          style={{ minWidth: 0, maxWidth: "100%" }}
          required
        />
        <button className="inline-mode-button" type="button" onClick={() => setCustom(false)}>
          {text.slots} · {intervalMinutes} min
        </button>
        <p className="field-help">{text.customHelp}</p>
      </div>
    );
  }

  return (
    <div className="time-field-group" style={{ minWidth: 0 }}>
      <label htmlFor="appointment_date">{text.date} <span className="label-muted">· {timeZoneLabel}</span></label>
      <input
        id="appointment_date"
        type="date"
        value={date}
        min={minDate}
        max={maxDate}
        style={{ minWidth: 0, maxWidth: "100%", textAlign: "left" }}
        onChange={(event) => {
          setDate(event.target.value);
          setTime("");
        }}
        required
      />

      <label htmlFor="appointment_slot">{text.slot} · {intervalMinutes} min</label>
      <select
        id="appointment_slot"
        value={selectedTime}
        onChange={(event) => setTime(event.target.value)}
        required
        disabled={!doctorId}
      >
        {!doctorId ? <option value="">{text.chooseDoctor}</option> : null}
        {doctorId && !firstAvailable ? <option value="">{text.noSlots}</option> : null}
        {doctorId ? slots.map((slot) => {
          const candidate = `${date}T${slot}`;
          const outsideWindow = candidate < min || candidate > max;
          const booked = occupiedSet.has(candidate);
          return (
            <option key={slot} value={slot} disabled={outsideWindow || booked}>
              {slot}{booked ? ` — ${text.booked}` : ""}
            </option>
          );
        }) : null}
      </select>
      <input type="hidden" name="appointment_at" value={doctorId ? selectedValue : ""} />
      <button className="inline-mode-button" type="button" onClick={() => setCustom(true)}>
        {text.custom}
      </button>
      <p className="field-help">{text.slotHelp}</p>
    </div>
  );
}
