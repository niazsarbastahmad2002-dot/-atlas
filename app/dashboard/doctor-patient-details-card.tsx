"use client";

import { useEffect, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { queueSettingWrite } from "./setting-write-barrier";

type Props = { clinicId: string; locale: UiLocale };
type Workflow = {
  role: "admin" | "receptionist";
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  receptionPhone: string;
};

const copy = {
  en: {
    eyebrow: "Patient view",
    title: "Doctor & contact details",
    help: "Shown clearly on the patient’s private appointment page.",
    doctor: "Doctor",
    specialty: "Specialty / subspecialty",
    specialtyPlaceholder: "e.g. Orthopaedic surgery",
    phone: "Reception phone for this doctor",
    phonePlaceholder: "0750 123 4567",
    receptionistNote: "Reception can update the patient contact number. Clinic administration manages the doctor specialty.",
    save: "Save details",
    saving: "Saving…",
    saved: "Saved",
    failed: "That change did not save. Check the phone number and try again.",
  },
  ku: {
    eyebrow: "پەڕەی نەخۆش",
    title: "زانیاری پزیشک و پەیوەندی",
    help: "بە ڕوونی لە پەڕەی تایبەتی وادەی نەخۆش پیشان دەدرێت.",
    doctor: "پزیشک",
    specialty: "پسپۆڕی / ژێرپسپۆڕی",
    specialtyPlaceholder: "بۆ نموونە: نەشتەرگەری ئێسک و جومگە",
    phone: "ژمارەی پێشخانە بۆ ئەم پزیشکە",
    phonePlaceholder: "0750 123 4567",
    receptionistNote: "پێشخانە دەتوانێت ژمارەی پەیوەندی نەخۆش بگۆڕێت. بەڕێوەبەر پسپۆڕی پزیشک دیاری دەکات.",
    save: "پاشەکەوتکردن",
    saving: "پاشەکەوت دەکرێت…",
    saved: "پاشەکەوت کرا",
    failed: "گۆڕانکارییەکە پاشەکەوت نەکرا. ژمارەکە بپشکنە و دووبارە هەوڵ بدە.",
  },
  ar: {
    eyebrow: "صفحة المريض",
    title: "بيانات الطبيب والتواصل",
    help: "تظهر بوضوح في صفحة الموعد الخاصة بالمريض.",
    doctor: "الطبيب",
    specialty: "الاختصاص / الاختصاص الدقيق",
    specialtyPlaceholder: "مثال: جراحة العظام",
    phone: "رقم الاستقبال لهذا الطبيب",
    phonePlaceholder: "0750 123 4567",
    receptionistNote: "يمكن للاستقبال تحديث رقم التواصل مع المريض، بينما تدير إدارة العيادة اختصاص الطبيب.",
    save: "حفظ البيانات",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    failed: "لم يتم حفظ التغيير. تحقق من رقم الهاتف وحاول مرة أخرى.",
  },
} as const;

function rememberedDoctorId() {
  try {
    const direct = document.querySelector<HTMLSelectElement>("#appointment_interval_minutes")?.dataset.atlasDoctorId;
    if (direct) return direct;
    const href = window.localStorage.getItem("atlas:last-schedule-href") ?? "";
    return new URL(href || "/dashboard", window.location.origin).searchParams.get("doctor") ?? "";
  } catch {
    return "";
  }
}

export function DoctorPatientDetailsCard({ clinicId, locale }: Props) {
  const t = copy[locale];
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const load = async (doctorId = rememberedDoctorId()) => {
    const params = new URLSearchParams({ clinic_id: clinicId });
    if (doctorId) params.set("doctor_id", doctorId);
    const response = await fetch(`/api/settings/doctor-workflow?${params}`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as Workflow;
    setWorkflow(data);
    setSpecialty(data.doctorSpecialty ?? "");
    setPhone(data.receptionPhone ?? "");
    setState("idle");
  };

  useEffect(() => {
    void load();
    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.closest("[data-atlas-doctor-settings-picker]")) return;
      window.setTimeout(() => { void load(target.value); }, 0);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [clinicId]);

  const save = () => {
    if (!workflow || state === "saving") return;
    setState("saving");
    const body: Record<string, unknown> = {
      clinicId,
      doctorId: workflow.doctorId,
      receptionPhone: phone,
    };
    if (workflow.role === "admin") body.doctorSpecialty = specialty;

    void queueSettingWrite(async () => {
      const response = await fetch("/api/settings/doctor-workflow", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("save_failed");
      const saved = await response.json() as Partial<Workflow>;
      setWorkflow((current) => current ? { ...current, ...saved } : current);
      if (typeof saved.doctorSpecialty === "string") setSpecialty(saved.doctorSpecialty);
      if (typeof saved.receptionPhone === "string") setPhone(saved.receptionPhone);
      setState("saved");
      window.setTimeout(() => setState((value) => value === "saved" ? "idle" : value), 1800);
    }).catch(() => setState("failed"));
  };

  return (
    <section className="settings-card atlas-patient-details-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">✚</span>
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h2>{t.title}</h2>
          <p>{t.help}</p>
        </div>
      </div>

      {workflow ? (
        <div className="atlas-patient-details-form">
          <div className="atlas-doctor-summary">
            <span>{t.doctor}</span>
            <strong>{workflow.doctorName}</strong>
          </div>
          <label>
            <span>{t.specialty}</span>
            <input
              value={specialty}
              disabled={workflow.role !== "admin"}
              maxLength={120}
              placeholder={t.specialtyPlaceholder}
              onChange={(event) => { setSpecialty(event.target.value); setState("idle"); }}
            />
          </label>
          <label>
            <span>{t.phone}</span>
            <input
              value={phone}
              inputMode="tel"
              dir="ltr"
              maxLength={24}
              placeholder={t.phonePlaceholder}
              onChange={(event) => { setPhone(event.target.value); setState("idle"); }}
            />
          </label>
          {workflow.role === "receptionist" ? <p className="field-help">{t.receptionistNote}</p> : null}
          <button className="button atlas-details-save" type="button" onClick={save} disabled={state === "saving"}>
            {state === "saving" ? t.saving : t.save}
          </button>
          <p className={state === "failed" ? "notice notice-error" : "atlas-details-status"} role="status">
            {state === "saved" ? t.saved : state === "failed" ? t.failed : ""}
          </p>
        </div>
      ) : <div className="settings-skeleton" aria-hidden="true" />}

      <style>{`
        .atlas-patient-details-form{display:grid;gap:12px}.atlas-doctor-summary{display:grid;gap:3px;border-radius:12px;padding:12px 14px;background:var(--accent-faint)}.atlas-doctor-summary span{color:var(--muted);font-size:10px;font-weight:800}.atlas-doctor-summary strong{font-size:18px}.atlas-patient-details-form label{display:grid;gap:6px;font-size:12px;font-weight:800}.atlas-patient-details-form input{min-height:46px;border:1px solid var(--line-strong);border-radius:12px;padding:9px 12px;background:#fff;color:var(--ink);font:inherit}.atlas-patient-details-form input:disabled{background:var(--surface-soft);color:var(--muted)}.atlas-details-save{width:100%;min-height:46px}.atlas-details-status{min-height:18px;margin:0;color:var(--success);font-size:11px;font-weight:760}.settings-skeleton{height:160px;border-radius:14px;background:linear-gradient(90deg,var(--surface-soft),#fff,var(--surface-soft));background-size:200% 100%;animation:atlas-detail-pulse 1.2s linear infinite}@keyframes atlas-detail-pulse{to{background-position:-200% 0}}
      `}</style>
    </section>
  );
}
