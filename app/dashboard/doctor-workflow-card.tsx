"use client";

import { useEffect, useState } from "react";
import { formatLeadTime, formatMinutes } from "@/lib/i18n/format";
import type { UiLocale } from "@/lib/i18n/ui";
import { queueSettingWrite } from "./setting-write-barrier";
import { WhatsAppCoexistencePanel } from "./whatsapp-coexistence-panel";

type Props = {
  clinicId: string;
  locale: UiLocale;
  canManage: boolean;
};

type Workflow = {
  role: "admin" | "receptionist";
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  receptionPhone: string;
  doctors: Array<{ id: string; name: string }>;
  appointmentIntervalMinutes: number;
  remindersEnabled: boolean;
  reminderLeadMinutes: number;
  reminderSecondLeadMinutes: number | null;
  defaultReminderLanguage: string;
  messagingApproved: boolean;
};

const intervals = [5, 10, 15, 20, 30];
const leadOptions = [30, 60, 120, 240, 360, 720, 1440, 2880, 10080];

const copy = {
  en: {
    eyebrow: "Doctor workflow",
    title: "Schedule & patient communication",
    help: "One place for the selected doctor's everyday settings.",
    doctor: "Doctor",
    interval: "Appointment interval",
    patientDetails: "Patient-facing details",
    specialty: "Specialty / subspecialty",
    specialtyPlaceholder: "e.g. Orthopaedic surgery",
    phone: "Reception phone",
    phonePlaceholder: "0750 123 4567",
    reminders: "Patient reminders",
    remindersHelp: "Open only when you need to change reminder timing or language.",
    enabled: "Send reminders automatically",
    waiting: "Timing can be prepared now. Sending stays off until WhatsApp is approved and connected.",
    first: "First reminder",
    second: "Second reminder",
    off: "Off",
    language: "Default reminder language",
    save: "Save doctor settings",
    saving: "Saving…",
    saved: "Saved",
    failed: "That change did not save. Check the details and try again.",
    whatsapp: "WhatsApp connection",
  },
  ku: {
    eyebrow: "ڕێکخستنی پزیشک",
    title: "خشتە و پەیوەندی نەخۆش",
    help: "هەموو ڕێکخستنە ڕۆژانەکانی پزیشکی هەڵبژێردراو لە یەک شوێن.",
    doctor: "پزیشک",
    interval: "ماوەی نێوان وادەکان",
    patientDetails: "زانیاری پەڕەی نەخۆش",
    specialty: "پسپۆڕی / ژێرپسپۆڕی",
    specialtyPlaceholder: "بۆ نموونە: نەشتەرگەری ئێسک و جومگە",
    phone: "ژمارەی ڕیسێپشن",
    phonePlaceholder: "0750 123 4567",
    reminders: "بیرخستنەوەی نەخۆش",
    remindersHelp: "تەنها کاتێک بکەرەوە کە دەتەوێت کات یان زمانی بیرخستنەوە بگۆڕیت.",
    enabled: "بیرخستنەوە خۆکار بنێرە",
    waiting: "دەتوانیت کاتەکان ئێستا ئامادە بکەیت. ناردن تا پەسەندکردن و پەیوەستکردنی WhatsApp ناچالاک دەمێنێتەوە.",
    first: "بیرخستنەوەی یەکەم",
    second: "بیرخستنەوەی دووەم",
    off: "ناچالاک",
    language: "زمانی بنەڕەتی بیرخستنەوە",
    save: "ڕێکخستنەکانی پزیشک پاشەکەوت بکە",
    saving: "پاشەکەوت دەکرێت…",
    saved: "پاشەکەوت کرا",
    failed: "گۆڕانکارییەکە پاشەکەوت نەکرا. زانیارییەکان بپشکنە و دووبارە هەوڵ بدە.",
    whatsapp: "پەیوەندی WhatsApp",
  },
  bd: {
    eyebrow: "ڕێکخستنێن دکتۆری",
    title: "خشتە و پەیوەندیا نەخۆشی",
    help: "هەمی ڕێکخستنێن ڕۆژانە یێن دکتۆرێ هەلبژارتی ل ئێک جهی.",
    doctor: "دکتۆر",
    interval: "ماوەیا ناڤبەرا وادەیان",
    patientDetails: "زانیاریێن پەرەیا نەخۆشی",
    specialty: "تایبەتمەندی / تایبەتمەندیا ورد",
    specialtyPlaceholder: "بۆ نموونە: نەشتەرگەریا ئێسک و جومگە",
    phone: "ژمارا ڕیسێپشنێ",
    phonePlaceholder: "0750 123 4567",
    reminders: "بیرخستنەوەیێن نەخۆشی",
    remindersHelp: "تەنێ دەمێ پێدڤی بیت دەم یان زمانێ بیرخستنەوەیێ بگوهەریت ڤەکە.",
    enabled: "بیرخستنەوە خودکار بهنێرە",
    waiting: "دشێی دەمێن بیرخستنەوەیێ نوکە ئامادە بکەی. هنارتن تا پەسەندکرن و گرێدانا WhatsApp ناچالاک دمینیت.",
    first: "بیرخستنەوەیا ئێکێ",
    second: "بیرخستنەوەیا دوویێ",
    off: "نەچالاک",
    language: "زمانێ سەرەکی یێ بیرخستنەوەیێ",
    save: "ڕێکخستنێن دکتۆری بپارێزە",
    saving: "دهێتە پاراستن…",
    saved: "هاتە پاراستن",
    failed: "گۆڕین نەهاتە پاراستن. زانیارییان بپشکنە و دووبارە هەول بدە.",
    whatsapp: "گرێدانا WhatsApp",
  },
  ar: {
    eyebrow: "إعدادات الطبيب",
    title: "الجدول وتواصل المريض",
    help: "كل إعدادات الطبيب اليومية المهمة في مكان واحد.",
    doctor: "الطبيب",
    interval: "الفاصل بين المواعيد",
    patientDetails: "بيانات تظهر للمريض",
    specialty: "الاختصاص / الاختصاص الدقيق",
    specialtyPlaceholder: "مثال: جراحة العظام",
    phone: "رقم الاستقبال",
    phonePlaceholder: "0750 123 4567",
    reminders: "تذكيرات المرضى",
    remindersHelp: "افتحها فقط عندما تحتاج تغيير وقت أو لغة التذكير.",
    enabled: "إرسال التذكيرات تلقائياً",
    waiting: "تقدر تجهز التوقيت الآن. الإرسال يبقى متوقفاً إلى أن تتم الموافقة على واتساب وربطه.",
    first: "التذكير الأول",
    second: "التذكير الثاني",
    off: "إيقاف",
    language: "لغة التذكير الافتراضية",
    save: "حفظ إعدادات الطبيب",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    failed: "لم يتم حفظ التغيير. تحقق من البيانات وحاول مرة ثانية.",
    whatsapp: "ربط واتساب",
  },
} as const;

const languageLabels = {
  en: { ku: "Kurdish (Sorani)", bd: "Kurdish (Badini)", ar: "Iraqi Arabic", en: "English" },
  ku: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  bd: { ku: "کوردی (سۆرانی)", bd: "کوردی (بادینی)", ar: "عەرەبی (عێراقی)", en: "ئینگلیزی" },
  ar: { ku: "الكردية (السورانية)", bd: "الكردية (البادينية)", ar: "العربية العراقية", en: "الإنجليزية" },
} as const;

function rememberedDoctorId() {
  try {
    const href = window.localStorage.getItem("atlas:last-schedule-href") ?? "";
    return new URL(href || "/dashboard", window.location.origin).searchParams.get("doctor") ?? "";
  } catch {
    return "";
  }
}

function leadLabel(minutes: number, locale: UiLocale) {
  return formatLeadTime(minutes, locale);
}

export function DoctorWorkflowCard({ clinicId, locale, canManage }: Props) {
  const t = copy[locale];
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [interval, setInterval] = useState(15);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [firstReminder, setFirstReminder] = useState(1440);
  const [secondReminder, setSecondReminder] = useState<number | null>(null);
  const [language, setLanguage] = useState("ku");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "failed">("loading");

  const apply = (data: Workflow) => {
    setWorkflow(data);
    setSpecialty(data.doctorSpecialty ?? "");
    setPhone(data.receptionPhone ?? "");
    setInterval(data.appointmentIntervalMinutes);
    setRemindersEnabled(data.remindersEnabled);
    setFirstReminder(data.reminderLeadMinutes);
    setSecondReminder(data.reminderSecondLeadMinutes);
    setLanguage(data.defaultReminderLanguage);
    setState("idle");
  };

  const load = async (doctorId = "") => {
    setState("loading");
    const params = new URLSearchParams({ clinic_id: clinicId });
    const requested = doctorId || rememberedDoctorId();
    if (requested) params.set("doctor_id", requested);
    try {
      const response = await fetch(`/api/settings/doctor-workflow?${params}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      apply(await response.json() as Workflow);
    } catch {
      setState("failed");
    }
  };

  useEffect(() => { void load(); }, [clinicId]);

  const save = () => {
    if (!workflow || state === "saving") return;
    setState("saving");
    const body: Record<string, unknown> = {
      clinicId,
      doctorId: workflow.doctorId,
      appointmentIntervalMinutes: interval,
      receptionPhone: phone,
      remindersEnabled,
      reminderLeadMinutes: firstReminder,
      reminderSecondLeadMinutes: secondReminder,
      defaultReminderLanguage: language,
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
      setState("saved");
      window.setTimeout(() => setState((current) => current === "saved" ? "idle" : current), 1600);
    }).catch(() => setState("failed"));
  };

  return (
    <section className="settings-card settings-card-wide atlas-workflow-card">
      <div className="settings-card-heading">
        <span className="settings-card-icon" aria-hidden="true">⌁</span>
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h2>{t.title}</h2>
          <p>{t.help}</p>
        </div>
      </div>

      {!workflow ? (
        <div className="settings-skeleton" aria-hidden="true" />
      ) : (
        <div className="atlas-workflow-form">
          {workflow.doctors.length > 1 ? (
            <label>
              <span>{t.doctor}</span>
              <select value={workflow.doctorId} disabled={state === "saving" || state === "loading"} onChange={(event) => void load(event.target.value)}>
                {workflow.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
              </select>
            </label>
          ) : (
            <div className="atlas-workflow-doctor"><span>{t.doctor}</span><strong>{workflow.doctorName}</strong></div>
          )}

          <label>
            <span>{t.interval}</span>
            <select value={interval} onChange={(event) => { setInterval(Number(event.target.value)); setState("idle"); }}>
              {intervals.map((minutes) => <option value={minutes} key={minutes}>{formatMinutes(minutes, locale)}</option>)}
            </select>
          </label>

          <fieldset className="atlas-workflow-section">
            <legend>{t.patientDetails}</legend>
            <label>
              <span>{t.specialty}</span>
              <input value={specialty} disabled={workflow.role !== "admin"} maxLength={120} placeholder={t.specialtyPlaceholder} onChange={(event) => { setSpecialty(event.target.value); setState("idle"); }} />
            </label>
            <label>
              <span>{t.phone}</span>
              <input value={phone} inputMode="tel" dir="ltr" maxLength={24} placeholder={t.phonePlaceholder} onChange={(event) => { setPhone(event.target.value); setState("idle"); }} />
            </label>
          </fieldset>

          <details className="atlas-workflow-details" open={remindersEnabled}>
            <summary><span><strong>{t.reminders}</strong><small>{t.remindersHelp}</small></span><span aria-hidden="true">⌄</span></summary>
            <div className="atlas-workflow-details-body">
              <label className="toggle-row">
                <span><strong>{t.enabled}</strong>{!workflow.messagingApproved ? <small>{t.waiting}</small> : null}</span>
                <input type="checkbox" checked={remindersEnabled} onChange={(event) => { setRemindersEnabled(event.target.checked); setState("idle"); }} />
              </label>
              <div className="atlas-workflow-two">
                <label><span>{t.first}</span><select value={firstReminder} onChange={(event) => { const value = Number(event.target.value); setFirstReminder(value); if (secondReminder === value) setSecondReminder(null); setState("idle"); }}>{leadOptions.map((minutes) => <option value={minutes} key={minutes}>{leadLabel(minutes, locale)}</option>)}</select></label>
                <label><span>{t.second}</span><select value={secondReminder ?? ""} onChange={(event) => { setSecondReminder(event.target.value ? Number(event.target.value) : null); setState("idle"); }}><option value="">{t.off}</option>{leadOptions.filter((minutes) => minutes !== firstReminder).map((minutes) => <option value={minutes} key={minutes}>{leadLabel(minutes, locale)}</option>)}</select></label>
              </div>
              <label><span>{t.language}</span><select value={language} onChange={(event) => { setLanguage(event.target.value); setState("idle"); }}>{Object.entries(languageLabels[locale]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

              {canManage ? (
                <details className="atlas-workflow-provider">
                  <summary>{t.whatsapp}</summary>
                  <WhatsAppCoexistencePanel clinicId={clinicId} locale={locale} canManage={canManage} />
                </details>
              ) : null}
            </div>
          </details>

          <button className="button" type="button" onClick={save} disabled={state === "saving" || state === "loading"}>{state === "saving" ? t.saving : t.save}</button>
          <p className={state === "failed" ? "notice notice-error" : "atlas-workflow-status"} role="status">{state === "saved" ? t.saved : state === "failed" ? t.failed : ""}</p>
        </div>
      )}

      <style>{`
        .atlas-workflow-form{display:grid;gap:14px}.atlas-workflow-form>label,.atlas-workflow-section label,.atlas-workflow-details-body>label,.atlas-workflow-two label{display:grid;gap:6px;font-size:12px;font-weight:800}.atlas-workflow-form input,.atlas-workflow-form select{min-height:46px;border:1px solid var(--line-strong);border-radius:12px;padding:9px 12px;background:#fff;color:var(--ink);font:inherit}.atlas-workflow-form input:disabled{background:var(--surface-soft);color:var(--muted)}.atlas-workflow-doctor{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;padding:12px 14px;background:var(--accent-faint)}.atlas-workflow-doctor span{color:var(--muted);font-size:11px;font-weight:750}.atlas-workflow-section{display:grid;gap:12px;margin:0;border:1px solid var(--line);border-radius:14px;padding:14px}.atlas-workflow-section legend{padding-inline:6px;color:var(--muted);font-size:11px;font-weight:850}.atlas-workflow-details{border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}.atlas-workflow-details>summary{display:flex;min-height:56px;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;cursor:pointer;list-style:none}.atlas-workflow-details>summary::-webkit-details-marker{display:none}.atlas-workflow-details>summary span:first-child{display:grid;gap:2px}.atlas-workflow-details>summary small{color:var(--muted);font-size:10px;font-weight:600}.atlas-workflow-details-body{display:grid;gap:12px;border-top:1px solid var(--line);padding:14px}.atlas-workflow-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.atlas-workflow-provider{border-radius:12px;background:#fff}.atlas-workflow-provider>summary{padding:11px 12px;color:var(--accent);font-size:12px;font-weight:800;cursor:pointer}.atlas-workflow-status{min-height:18px;margin:0;color:var(--success);font-size:11px;font-weight:760}.settings-skeleton{height:170px;border-radius:14px;background:var(--surface-soft)}@media(max-width:620px){.atlas-workflow-two{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
