"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  cleanDisplayName,
  formatIraqiMobile,
  isValidDisplayName,
  normalizeIraqiMobile,
} from "@/lib/appointments";

type DemoStatus = "pending" | "confirmed" | "completed" | "no_show" | "cancelled";
type DemoAppointment = { id: string; patient: string; phone: string; doctor: string; time: string; status: DemoStatus };

const statusLabel: Record<DemoStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", completed: "Completed", no_show: "No-show", cancelled: "Cancelled",
};

const seededAppointments: DemoAppointment[] = [
  { id: "sample-1", patient: "Rana Ahmed", phone: "0750 000 1201", doctor: "Dr. Sara", time: "09:00", status: "confirmed" },
  { id: "sample-2", patient: "Omar Karim", phone: "0750 000 1202", doctor: "Dr. Sara", time: "09:30", status: "pending" },
  { id: "sample-3", patient: "Dilan Hassan", phone: "0750 000 1203", doctor: "Dr. Sara", time: "10:15", status: "confirmed" },
  { id: "sample-4", patient: "Ari Mahmood", phone: "0750 000 1204", doctor: "Dr. Sara", time: "11:00", status: "completed" },
];

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong></article>;
}

function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function reopenedStatus(status: DemoStatus): DemoStatus {
  return status === "cancelled" ? "pending" : "confirmed";
}

function baghdadMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function demoMinimumTime() {
  const minutes = Math.min(baghdadMinutes() + 5, 23 * 60 + 59);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function isFutureDemoTime(value: string) {
  const match = /^(\\d{2}):(\\d{2})$/.exec(value);
  if (!match) return false;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= baghdadMinutes() + 5;
}

export function ModernDemoWorkspace() {
  const [appointments, setAppointments] = useState<DemoAppointment[]>(seededAppointments);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const minimumTime = useMemo(() => demoMinimumTime(), []);
  const counts = useMemo(() => ({
    pending: appointments.filter((item) => item.status === "pending").length,
    confirmed: appointments.filter((item) => item.status === "confirmed").length,
    completed: appointments.filter((item) => item.status === "completed").length,
    noShow: appointments.filter((item) => item.status === "no_show").length,
    cancelled: appointments.filter((item) => item.status === "cancelled").length,
  }), [appointments]);
  const activeQueue = appointments.filter((item) => item.status === "pending" || item.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time));
  const queueOrder = new Map(activeQueue.map((item, index) => [item.id, index + 1]));

  function setStatus(id: string, status: DemoStatus) {
    setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setFeedback({ tone: "success", text: `Sample appointment marked ${statusLabel[status].toLowerCase()}.` });
  }

  return (
    <div className="app-shell demo-modern-shell" id="top">
      <header className="app-topbar">
        <div className="app-topbar-inner shell">
          <Link className="app-brand" href="/" aria-label="Atlas home"><span className="app-brand-mark" aria-hidden="true">A</span><span className="app-brand-word">Atlas</span></Link>
          <div className="demo-modern-top-actions"><span className="demo-modern-pill">Sample clinic</span><Link className="button button-ghost button-small" href="/login">Use Atlas</Link></div>
        </div>
      </header>

      <div className="demo-modern-flow" role="status"><div className="shell demo-modern-flow-inner"><span><strong>Clinic timing</strong> · running on time</span><span>Safe demo · nothing is saved</span></div></div>

      <main className="workspace-page shell demo-modern-workspace">
        <header className="workspace-header"><div className="workspace-title-block"><div className="eyebrow">Schedule</div><h1>Hawler Sample Clinic</h1><p>Dr. Sara · synthetic data only</p></div><div className="demo-modern-clock">Today · Erbil</div></header>

        <nav className="schedule-date-shortcuts" aria-label="Quick schedule dates"><button type="button" disabled>Yesterday</button><button type="button" className="is-selected" aria-current="date">Today</button><button type="button" disabled>Tomorrow</button></nav>
        {feedback ? <p className={`notice notice-${feedback.tone} workspace-notice`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}

        <section className="stats workspace-stats" aria-label="Today’s sample appointment summary">
          <Stat label="Appointments" value={appointments.length} /><Stat label="Pending" value={counts.pending} /><Stat label="Confirmed" value={counts.confirmed} /><Stat label="Completed" value={counts.completed} /><Stat label="No-show" value={counts.noShow} /><Stat label="Cancelled" value={counts.cancelled} />
        </section>

        <div className="workspace-grid">
          <section className="panel appointment-composer" id="new-appointment">
            <div className="panel-heading composer-heading"><div><div className="eyebrow">Today</div><h2>New appointment</h2></div><span className="composer-shortcut" aria-hidden="true">+</span></div>
            <form className="stack-form appointment-form" onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const rawPatient = String(data.get("patient") ?? "");
              const patient = cleanDisplayName(rawPatient);
              const phone = normalizeIraqiMobile(String(data.get("phone") ?? ""));
              const time = String(data.get("time") ?? "").trim();
              if (!isValidDisplayName(rawPatient)) {
                setFeedback({ tone: "error", text: "Use a patient name between 2 and 120 characters." });
                return;
              }
              if (!phone) {
                setFeedback({ tone: "error", text: "Enter a valid Iraqi mobile number, such as 0750 000 0000." });
                return;
              }
              if (!isFutureDemoTime(time)) {
                setFeedback({ tone: "error", text: "Choose a time at least 5 minutes from now in Erbil." });
                return;
              }
              const next: DemoAppointment = { id: crypto.randomUUID(), patient, phone, doctor: "Dr. Sara", time, status: "pending" };
              setAppointments((current) => [...current, next].sort((a, b) => a.time.localeCompare(b.time)));
              setFeedback({ tone: "success", text: "Sample appointment added. Nothing was saved to Atlas." });
              form.reset();
            }}>
              <label htmlFor="demo_patient">Patient name</label><input id="demo_patient" name="patient" minLength={2} maxLength={120} placeholder="Sample patient" required />
              <label htmlFor="demo_phone">Iraqi mobile number</label><input id="demo_phone" name="phone" type="tel" inputMode="tel" placeholder="0750 000 0000" required />
              <label>Doctor</label><div className="composer-doctor-lock"><strong>Dr. Sara</strong><span aria-hidden="true">✓</span></div>
              <label htmlFor="demo_time">Time <span className="label-muted">· Erbil</span></label><input className="demo-modern-time-input" id="demo_time" name="time" type="time" min={minimumTime} defaultValue={minimumTime} required />
              <button className="button" type="submit">Save sample appointment</button>
            </form>
            <div className="reminder-note"><strong>Patient reminders: </strong>off in safe demo</div><p className="composer-privacy">Scheduling only — do not enter real patient or medical information.</p>
          </section>

          <section className="panel appointments-panel schedule-card">
            <div className="panel-heading schedule-heading"><div><div className="eyebrow">Today</div><h2>Clinic day</h2><p className="panel-subtitle">Dr. Sara</p></div><span className="count-pill">{appointments.length}</span></div>
            <div className="appointment-list polished-appointment-list">{appointments.map((appointment) => {
              const order = queueOrder.get(appointment.id);
              const active = appointment.status === "pending" || appointment.status === "confirmed";
              return <article className="appointment-row polished-appointment" key={appointment.id}>
                <div className="appointment-primary"><div className="patient-cell"><strong>{appointment.patient}</strong><span><bdi dir="ltr">{formatIraqiMobile(appointment.phone)}</bdi></span></div><div className="appointment-badges">{order ? <span className="appointment-order-badge">#{order}</span> : null}<span className={`status status-${appointment.status}`}>{statusLabel[appointment.status]}</span></div></div>
                <dl className="appointment-details polished-details"><div><dt>Time</dt><dd className="appointment-time-value">{timeLabel(appointment.time)}</dd></div><div><dt>Doctor</dt><dd>{appointment.doctor}</dd></div><div><dt>Reminder</dt><dd>Safe demo · off</dd></div></dl>
                <div className="row-actions polished-actions" aria-label={`Sample actions for ${appointment.patient}`}>
                  {appointment.status === "pending" ? <button type="button" onClick={() => setStatus(appointment.id, "confirmed")}>Confirm</button> : null}
                  {active ? <button type="button" onClick={() => setStatus(appointment.id, "completed")}>Complete</button> : null}
                  {active ? <button type="button" onClick={() => setStatus(appointment.id, "no_show")}>No-show</button> : null}
                  {active ? <button type="button" onClick={() => setStatus(appointment.id, "cancelled")}>Cancel</button> : null}
                  {!active ? <button type="button" onClick={() => setStatus(appointment.id, reopenedStatus(appointment.status))}>Reopen</button> : null}
                </div>
              </article>;
            })}</div>
          </section>
        </div>
      </main>

      <nav className="app-bottom-nav demo-modern-bottom" aria-label="Sample Atlas navigation"><a className="is-active" href="#top"><span className="demo-nav-icon">▣</span><span>Schedule</span></a><a className="app-bottom-add" href="#new-appointment"><span className="app-bottom-add-circle">+</span><span>Add</span></a><Link href="/login"><span className="demo-nav-icon">⚙</span><span>Use Atlas</span></Link></nav>

      <style>{`
        .demo-modern-shell{min-height:100dvh}.demo-modern-top-actions{display:flex;align-items:center;gap:10px}.demo-modern-pill{display:inline-flex;align-items:center;min-height:30px;border:1px solid rgba(8,119,90,.18);border-radius:999px;padding:5px 10px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}.demo-modern-flow{border-bottom:1px solid var(--line);background:rgba(237,248,244,.9)}.demo-modern-flow-inner{display:flex;min-height:42px;align-items:center;justify-content:space-between;gap:16px;color:var(--ink-soft);font-size:11px}.demo-modern-flow-inner strong{color:var(--accent)}.demo-modern-workspace{padding-bottom:110px}.demo-modern-clock{color:var(--muted);font-size:12px;font-weight:700}.schedule-date-shortcuts button{display:inline-flex;min-height:38px;align-items:center;border:1px solid var(--line-strong);border-radius:999px;padding:7px 13px;background:#fff;color:var(--ink-soft);font:inherit;font-size:11px;font-weight:750}.schedule-date-shortcuts button.is-selected{border-color:rgba(8,119,90,.28);background:var(--accent-soft);color:var(--accent)}.schedule-date-shortcuts button:disabled{opacity:.48}.composer-doctor-lock{display:flex;min-height:46px;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line-strong);border-radius:12px;padding:10px 13px;background:var(--surface-soft);color:var(--ink)}.composer-doctor-lock strong{font-size:14px;font-weight:780}.composer-doctor-lock span{display:grid;width:24px;height:24px;place-items:center;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:900}.demo-modern-time-input{width:100%;max-width:100%;min-width:0;text-align:left;direction:ltr}.demo-modern-time-input::-webkit-date-and-time-value{text-align:left}.demo-modern-time-input::-webkit-datetime-edit{text-align:left}.demo-modern-bottom{display:none}.demo-nav-icon{font-size:18px}@media(max-width:760px){.demo-modern-flow-inner{align-items:flex-start;flex-direction:column;gap:2px;padding-top:8px;padding-bottom:8px}.demo-modern-top-actions .demo-modern-pill{display:none}.demo-modern-workspace{padding-bottom:120px}.demo-modern-bottom{display:grid}}
      `}</style>
    </div>
  );
}
