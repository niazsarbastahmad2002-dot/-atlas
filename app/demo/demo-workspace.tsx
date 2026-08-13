"use client";

import Link from "next/link";
import { useState } from "react";
import {
  allowedAppointmentTransitions,
  cleanDisplayName,
  isValidDisplayName,
  normalizeIraqiMobile,
  parseBaghdadDateTime,
  toBaghdadInputValue,
  type AppointmentStatus,
} from "@/lib/appointments";
import { baghdadDate, baghdadDateTime } from "@/lib/i18n/config";

type DemoAppointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  appointmentAt: string;
  status: AppointmentStatus;
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

const actionLabels: Record<AppointmentStatus, string> = {
  pending: "Reopen",
  confirmed: "Confirm",
  cancelled: "Cancel",
  completed: "Complete",
  no_show: "No-show",
};

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong></article>;
}

export function DemoWorkspace() {
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<DemoAppointment[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function updateStatus(id: string, status: AppointmentStatus) {
    setAppointments((current) => current.map((appointment) => (
      appointment.id === id ? { ...appointment, status } : appointment
    )));
    setFeedback({ tone: "success", text: "Test appointment status updated." });
  }

  function resetWorkspace() {
    setAppointments([]);
    setClinicName(null);
    setFeedback(null);
  }

  if (!clinicName) {
    return (
      <main className="center-page">
        <section className="auth-card">
          <Link className="brand" href="/">Atlas</Link>
          <div className="eyebrow">Safe test mode</div>
          <h1>Create a test clinic.</h1>
          <p className="demo-banner">
            Use invented details only. This workspace stays in this browser tab and never writes to Supabase.
          </p>
          {feedback ? <p className="notice notice-error" role="alert">{feedback.text}</p> : null}
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const rawValue = String(new FormData(event.currentTarget).get("name") ?? "");
              const value = cleanDisplayName(rawValue);
              if (!isValidDisplayName(rawValue)) {
                setFeedback({ tone: "error", text: "Enter a clinic name between 2 and 120 characters." });
                return;
              }
              setClinicName(value);
              setFeedback(null);
            }}
          >
            <label htmlFor="demo_clinic_name">Clinic name</label>
            <input id="demo_clinic_name" name="name" minLength={2} maxLength={120} placeholder="Example Clinic" required />
            <button className="button" type="submit">Create test workspace</button>
          </form>
          <div className="auth-alternative">
            <Link className="button button-ghost" href="/login">Back to sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  const today = baghdadDate.format(new Date());
  const todayRows = appointments.filter((appointment) => baghdadDate.format(new Date(appointment.appointmentAt)) === today);
  const confirmed = todayRows.filter((appointment) => appointment.status === "confirmed").length;
  const minimum = new Date(Date.now() + 5 * 60 * 1000);
  minimum.setSeconds(0, 0);
  const maximum = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

  return (
    <main className="dashboard shell">
      <header className="dashboard-header">
        <div>
          <div className="brand">Atlas</div>
          <p className="quiet">{clinicName} · Test mode · Erbil time</p>
        </div>
        <div className="demo-header-actions">
          <Link className="button button-ghost button-small" href="/login">Exit test</Link>
          <button className="button button-small" type="button" onClick={resetWorkspace}>Start over</button>
        </div>
      </header>

      <p className="demo-banner" role="status">
        Test mode is active. Everything below is temporary and cannot create clinic or patient records.
      </p>
      {feedback ? (
        <p className={`notice demo-feedback notice-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      ) : null}

      <section className="stats" aria-label="Today’s test appointment summary">
        <Stat label="Today’s appointments" value={todayRows.length} />
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Reminders sent" value={0} />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><div className="eyebrow">Reception test</div><h1>Add appointment</h1></div></div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const rawPatientName = String(data.get("patient_name") ?? "");
              const patientName = cleanDisplayName(rawPatientName);
              const patientPhone = normalizeIraqiMobile(String(data.get("patient_phone") ?? ""));
              const rawDoctorName = String(data.get("doctor_name") ?? "");
              const doctorName = cleanDisplayName(rawDoctorName);
              const appointmentAt = parseBaghdadDateTime(String(data.get("appointment_at") ?? ""));

              if (!isValidDisplayName(rawPatientName) || !isValidDisplayName(rawDoctorName)) {
                setFeedback({ tone: "error", text: "Check the patient and doctor names." });
                return;
              }
              if (!patientPhone) {
                setFeedback({ tone: "error", text: "Enter an Iraqi mobile number, such as 0750 000 0000." });
                return;
              }
              if (!appointmentAt) {
                setFeedback({ tone: "error", text: "Choose a valid future date and time in Erbil." });
                return;
              }

              setAppointments((current) => [...current, {
                id: crypto.randomUUID(),
                patientName,
                patientPhone,
                doctorName,
                appointmentAt: appointmentAt.toISOString(),
                status: "pending",
              }]);
              setFeedback({ tone: "success", text: "Test appointment saved." });
              form.reset();
            }}
          >
            <label htmlFor="demo_patient_name">Patient name</label>
            <input id="demo_patient_name" name="patient_name" minLength={2} maxLength={120} required />
            <label htmlFor="demo_patient_phone">Iraqi mobile number</label>
            <input id="demo_patient_phone" name="patient_phone" type="tel" inputMode="tel" maxLength={24} placeholder="0750 000 0000" required />
            <label htmlFor="demo_doctor_name">Doctor</label>
            <input id="demo_doctor_name" name="doctor_name" minLength={2} maxLength={120} required />
            <label htmlFor="demo_appointment_at">Date and time (Erbil)</label>
            <input
              id="demo_appointment_at"
              name="appointment_at"
              type="datetime-local"
              min={toBaghdadInputValue(minimum)}
              max={toBaghdadInputValue(maximum)}
              required
            />
            <button className="button" type="submit">Save appointment</button>
          </form>
        </section>

        <section className="panel appointments-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Test schedule</div><h1>Appointments</h1></div>
            <span className="count-pill">{appointments.length} total</span>
          </div>

          {appointments.length === 0 ? (
            <div className="empty-state"><div><strong>No test appointments yet.</strong><span>Add one using invented details.</span></div></div>
          ) : (
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <article className="appointment-row" key={appointment.id}>
                  <div className="appointment-primary">
                    <div className="patient-cell">
                      <strong>{appointment.patientName}</strong>
                      <span><bdi dir="ltr">{appointment.patientPhone}</bdi></span>
                    </div>
                    <div className="appointment-badges">
                      <span className={`status status-${appointment.status}`}>{statusLabels[appointment.status]}</span>
                      <span className="status status-reminder">Reminders off</span>
                    </div>
                  </div>
                  <dl className="appointment-details">
                    <div><dt>Doctor</dt><dd>{appointment.doctorName}</dd></div>
                    <div><dt>Time</dt><dd>{baghdadDateTime.format(new Date(appointment.appointmentAt))}</dd></div>
                  </dl>
                  <div className="row-actions" aria-label="Test appointment actions">
                    {allowedAppointmentTransitions(appointment.status).map((nextStatus) => (
                      <button type="button" key={nextStatus} onClick={() => updateStatus(appointment.id, nextStatus)}>
                        {actionLabels[nextStatus]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("Delete this test appointment?")) return;
                        setAppointments((current) => current.filter((item) => item.id !== appointment.id));
                        setFeedback({ tone: "success", text: "Test appointment deleted." });
                      }}
                    >Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
