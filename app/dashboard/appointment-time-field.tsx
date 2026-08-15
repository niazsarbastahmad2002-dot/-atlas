"use client";

import { useEffect, useMemo, useState } from "react";

type AppointmentTimeFieldProps = {
  intervalMinutes: number;
  min: string;
  max: string;
  occupiedByDoctor: Record<string, string[]>;
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
  occupiedByDoctor,
  timeZoneLabel,
}: AppointmentTimeFieldProps) {
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(min.slice(0, 10));
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
        disabled={!doctorId}
      >
        {!doctorId ? <option value="">Choose a doctor first</option> : null}
        {doctorId && !firstAvailable ? <option value="">No selectable slots</option> : null}
        {doctorId ? slots.map((slot) => {
          const candidate = `${date}T${slot}`;
          const outsideWindow = candidate < min || candidate > max;
          const booked = occupiedSet.has(candidate);
          return (
            <option key={slot} value={slot} disabled={outsideWindow || booked}>
              {slot}{booked ? " — booked" : ""}
            </option>
          );
        }) : null}
      </select>
      <input type="hidden" name="appointment_at" value={doctorId ? selectedValue : ""} />
      <button className="button button-ghost button-small" type="button" onClick={() => setCustom(true)}>
        Use custom time
      </button>
      <p className="field-help">Booked pending/confirmed times are checked for the selected doctor. Custom times remain available when needed.</p>
    </>
  );
}
