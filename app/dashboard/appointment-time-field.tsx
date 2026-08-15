"use client";

import { useMemo, useState } from "react";

type AppointmentTimeFieldProps = {
  intervalMinutes: number;
  min: string;
  max: string;
  occupied: string[];
  timeZoneLabel: string;
};

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
  occupied,
  timeZoneLabel,
}: AppointmentTimeFieldProps) {
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(min.slice(0, 10));
  const occupiedSet = useMemo(() => new Set(occupied), [occupied]);
  const slots = useMemo(() => slotTimes(intervalMinutes), [intervalMinutes]);
  const firstAvailable = useMemo(() => {
    return slots.find((time) => {
      const candidate = `${date}T${time}`;
      return candidate >= min && candidate <= max && !occupiedSet.has(candidate);
    }) ?? "";
  }, [date, max, min, occupiedSet, slots]);
  const [time, setTime] = useState("");
  const selectedTime = time && slots.includes(time) ? time : firstAvailable;
  const selectedValue = selectedTime ? `${date}T${selectedTime}` : "";

  if (custom) {
    return (
      <>
        <label htmlFor="appointment_at">Date and time ({timeZoneLabel})</label>
        <input
          id="appointment_at"
          name="appointment_at"
          type="datetime-local"
          min={min}
          max={max}
          required
        />
        <button className="button button-ghost button-small" type="button" onClick={() => setCustom(false)}>
          Use {intervalMinutes}-minute slots
        </button>
        <p className="field-help">Custom override is allowed when the clinic needs an off-grid appointment time.</p>
      </>
    );
  }

  return (
    <>
      <label htmlFor="appointment_date">Appointment date ({timeZoneLabel})</label>
      <input
        id="appointment_date"
        type="date"
        value={date}
        min={min.slice(0, 10)}
        max={max.slice(0, 10)}
        onChange={(event) => {
          setDate(event.target.value);
          setTime("");
        }}
        required
      />

      <label htmlFor="appointment_slot">Available {intervalMinutes}-minute slot</label>
      <select
        id="appointment_slot"
        value={selectedTime}
        onChange={(event) => setTime(event.target.value)}
        required
      >
        {firstAvailable ? null : <option value="">No selectable slots</option>}
        {slots.map((slot) => {
          const candidate = `${date}T${slot}`;
          const outsideWindow = candidate < min || candidate > max;
          const booked = occupiedSet.has(candidate);
          return (
            <option key={slot} value={slot} disabled={outsideWindow || booked}>
              {slot}{booked ? " — booked" : ""}
            </option>
          );
        })}
      </select>
      <input type="hidden" name="appointment_at" value={selectedValue} />
      <button className="button button-ghost button-small" type="button" onClick={() => setCustom(true)}>
        Use custom time
      </button>
      <p className="field-help">Booked pending/confirmed times are marked unavailable. Custom times remain available when needed.</p>
    </>
  );
}
