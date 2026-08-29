"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

type Signal = {
  appointmentId: string;
  patientName: string;
  signal: "on_my_way" | "running_late";
  updatedAt: string | null;
};

type Flow = {
  clinicId: string;
  doctorId: string;
  doctorName: string;
  day: string;
  isToday: boolean;
  delayMinutes: number | null;
  timingUpdatedAt?: string | null;
  signals: Signal[];
};

const delays = [-15, 0, 15, 30, 45, 60] as const;

const copy = {
  en: {
    timing: "Clinic timing",
    help: "Share only what reception actually knows. Patients see the same estimate.",
    early: "15 early",
    onTime: "On time",
    late: (minutes: number) => `${minutes} late`,
    patientUpdates: "Patient updates",
    onWay: "on the way",
    runningLate: "running late",
    failed: "Timing did not save.",
  },
  ku: {
    timing: "کاتی کلینیک",
    help: "تەنها ئەو کاتە نیشان بدە کە ڕیسێپشن بەڕاستی دەیزانێت. نەخۆش هەمان خەمڵاندن دەبینێت.",
    early: "١٥ خولەک زووتر دێت",
    onTime: "لە کاتی خۆی دێت",
    late: (minutes: number) => `${minutes} خولەک دوا دەکەوێت`,
    patientUpdates: "نوێکاری نەخۆش",
    onWay: "لە ڕێگادایە",
    runningLate: "دواکەوتووە",
    failed: "کاتی کلینیک پاشەکەوت نەکرا.",
  },
  bd: {
    timing: "دەمێ کلینیکێ",
    help: "تەنێ ئەو دەمێ نیشان بدە کو ڕیسێپشن ب ڕاستی دزانیت. نەخۆش هەمان خەملاندن دبینیت.",
    early: "١٥ خولەک زووتر",
    onTime: "د دەمێ خۆ دا",
    late: (minutes: number) => `${minutes} خولەک دوا`,
    patientUpdates: "نووکرنێن نەخۆشی",
    onWay: "د ڕێکێ دایە",
    runningLate: "دواکەفتییە",
    failed: "دەمێ کلینیکێ نەهاتە پاراستن.",
  },
  ar: {
    timing: "وقت العيادة",
    help: "خلي التقدير على الشي اللي الاستقبال يعرفه فعلاً. المريض يشوف نفس التقدير.",
    early: "15 د أبكر",
    onTime: "بالوقت",
    late: (minutes: number) => `${minutes} د تأخير`,
    patientUpdates: "تحديثات المرضى",
    onWay: "بالطريق",
    runningLate: "راح يتأخر",
    failed: "ما انحفظ وقت العيادة.",
  },
} as const;

function delayLabel(locale: UiLocale, value: number) {
  const t = copy[locale];
  if (value < 0) return t.early;
  if (value === 0) return t.onTime;
  return t.late(value);
}

export function LiveClinicFlow({
  locale,
  clinicId,
  doctorId,
  day,
}: {
  locale: UiLocale;
  clinicId: string | null;
  doctorId: string | null;
  day: string | null;
}) {
  const t = copy[locale];
  const [flow, setFlow] = useState<Flow | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (clinicId) params.set("clinic_id", clinicId);
    if (doctorId) params.set("doctor_id", doctorId);
    if (day) params.set("day", day);
    return params.toString();
  }, [clinicId, doctorId, day]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/clinic-live-flow${query ? `?${query}` : ""}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const next = await response.json() as Flow;
      setFlow(next.isToday ? next : null);
    } catch {}
  }, [query]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);

  async function setDelay(delayMinutes: number) {
    if (!flow || saving !== null || flow.delayMinutes === delayMinutes) return;
    setSaving(delayMinutes);
    setError(false);
    try {
      const response = await fetch("/api/clinic-live-flow", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: flow.clinicId,
          doctorId: flow.doctorId,
          delayMinutes,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      const saved = await response.json() as { delayMinutes: number };
      setFlow((current) => current ? { ...current, delayMinutes: saved.delayMinutes } : current);
    } catch {
      setError(true);
    } finally {
      setSaving(null);
    }
  }

  if (!flow) return null;

  return (
    <section className="live-clinic-flow shell" aria-label={t.timing}>
      <div className="live-clinic-timing">
        <div className="live-clinic-copy">
          <strong>{t.timing}</strong>
          <span>{flow.doctorName}</span>
          <small>{t.help}</small>
        </div>
        <div className="live-clinic-options" role="group" aria-label={t.timing}>
          {delays.map((delay) => (
            <button
              key={delay}
              type="button"
              aria-pressed={flow.delayMinutes === delay}
              className={flow.delayMinutes === delay ? "is-selected" : ""}
              disabled={saving !== null}
              onClick={() => void setDelay(delay)}
            >
              {saving === delay ? "…" : delayLabel(locale, delay)}
            </button>
          ))}
        </div>
        {error ? <span className="live-clinic-error" role="alert">{t.failed}</span> : null}
      </div>

      {flow.signals.length ? (
        <div className="live-patient-updates">
          <strong>{t.patientUpdates}</strong>
          <div className="live-patient-pills">
            {flow.signals.map((signal) => (
              <span className={`live-patient-pill is-${signal.signal}`} key={signal.appointmentId}>
                <b>{signal.patientName}</b>
                <span>· {signal.signal === "on_my_way" ? t.onWay : t.runningLate}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <style>{`
        .live-clinic-flow{display:grid;gap:9px;margin-top:10px;margin-bottom:10px}.live-clinic-timing{display:grid;grid-template-columns:minmax(150px,1fr) auto;align-items:center;gap:12px;border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:var(--surface)}.live-clinic-copy{display:grid;gap:2px;min-width:0}.live-clinic-copy>strong{font-size:11px;font-weight:880}.live-clinic-copy>span{color:var(--muted);font-size:10px;font-weight:720}.live-clinic-copy>small{margin-top:2px;color:var(--muted);font-size:9px;font-weight:560;line-height:1.4}.live-clinic-options{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none}.live-clinic-options::-webkit-scrollbar{display:none}.live-clinic-options button{flex:0 0 auto;min-height:34px;border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:var(--surface-soft);color:var(--ink-soft);font-size:9.5px;font-weight:800;cursor:pointer}.live-clinic-options button.is-selected{border-color:rgba(8,119,90,.28);background:var(--accent-soft);color:var(--accent)}.live-clinic-options button:disabled{cursor:wait;opacity:.72}.live-clinic-error{grid-column:1/-1;color:var(--danger);font-size:10px;font-weight:720}.live-patient-updates{display:flex;align-items:center;gap:9px;min-width:0}.live-patient-updates>strong{flex:0 0 auto;color:var(--muted);font-size:9.5px;font-weight:850}.live-patient-pills{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.live-patient-pills::-webkit-scrollbar{display:none}.live-patient-pill{display:inline-flex;flex:0 0 auto;align-items:center;gap:2px;border-radius:999px;padding:6px 9px;background:var(--accent-faint);color:var(--ink-soft);font-size:9.5px}.live-patient-pill b{font-weight:850}.live-patient-pill.is-running_late{background:var(--warning-bg);color:var(--warning)}@media(max-width:720px){.live-clinic-timing{grid-template-columns:1fr}.live-clinic-copy>small{display:none}.live-clinic-options{width:100%}.live-clinic-options button{flex:1 0 auto}.live-patient-updates{align-items:flex-start;flex-direction:column;gap:5px}.live-patient-pills{width:100%}}
      `}</style>
    </section>
  );
}
