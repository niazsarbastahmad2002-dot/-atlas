"use client";

import { useActionState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { provisionStaffMember, type StaffProvisionState } from "./actions";

const initialState: StaffProvisionState = { status: "idle", message: "" };

type DoctorOption = { id: string; name: string };

const copy = {
  en: {
    email: "Receptionist email",
    doctor: "Receptionist's doctor",
    chooseDoctor: "Choose one doctor",
    add: "Add receptionist",
    adding: "Sending invitation…",
    help: "Atlas emails them automatically. They stay Pending until they open the email, then access turns on for this doctor.",
  },
  ku: {
    email: "ئیمەیڵی پێشخانە",
    doctor: "پزیشکی پێشخانە",
    chooseDoctor: "یەک پزیشک هەڵبژێرە",
    add: "پێشخانە زیاد بکە",
    adding: "بانگهێشتنامە دەنێردرێت…",
    help: "Atlas خۆکارانە ئیمەیڵێکی بۆ دەنێرێت. تا ئیمەیڵەکە نەکاتەوە Pending دەمێنێتەوە، پاشان دەسەڵاتی ئەم پزیشکە چالاک دەبێت.",
  },
  ar: {
    email: "بريد موظف الاستقبال",
    doctor: "طبيب موظف الاستقبال",
    chooseDoctor: "اختر طبيباً واحداً",
    add: "إضافة موظف استقبال",
    adding: "جارٍ إرسال الدعوة…",
    help: "Atlas يرسل له البريد تلقائياً. يبقى Pending إلى أن يفتح الرسالة، وبعدها تتفعل صلاحية هذا الطبيب.",
  },
} as const;

export function StaffProvisionForm({ clinicId, locale, doctors }: { clinicId: string; locale: UiLocale; doctors: DoctorOption[] }) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(provisionStaffMember, initialState);

  return (
    <div className="settings-form">
      <form action={action} className="settings-form">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="role" value="receptionist" />
        <label htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} dir="ltr" required />
        <label htmlFor="assigned_doctor_id">{t.doctor}</label>
        <select id="assigned_doctor_id" name="assigned_doctor_id" defaultValue="" required disabled={doctors.length === 0}>
          <option value="" disabled>{t.chooseDoctor}</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select>
        <button className="button" type="submit" disabled={pending || doctors.length === 0}>
          {pending ? t.adding : t.add}
        </button>
        <p className="field-help">{t.help}</p>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
          {state.email ? <div className="field-help" dir="ltr">{state.email}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
