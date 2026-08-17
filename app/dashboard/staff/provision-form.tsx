"use client";

import { useActionState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";
import { provisionStaffMember, type StaffProvisionState } from "./actions";

const initialState: StaffProvisionState = { status: "idle", message: "" };

const copy = {
  en: {
    email: "Receptionist work email",
    add: "Add receptionist",
    adding: "Adding receptionist…",
    help: "They will use the normal Atlas sign-in screen with this email. No clinic setup code is needed.",
  },
  ku: {
    email: "ئیمەیڵی کاری پێشخانە",
    add: "پێشخانە زیاد بکە",
    adding: "پێشخانە زیاد دەکرێت…",
    help: "بەم ئیمەیڵەوە پەڕەی ئاسایی چوونەژوورەوەی Atlas بەکاردەهێنێت. کۆدی تایبەتی کلینیک پێویست نییە.",
  },
  ar: {
    email: "بريد موظف الاستقبال للعمل",
    add: "إضافة موظف استقبال",
    adding: "جارٍ إضافة موظف الاستقبال…",
    help: "سيستخدم شاشة دخول Atlas العادية بهذا البريد. لا حاجة إلى رمز إعداد خاص بالعيادة.",
  },
} as const;

export function StaffProvisionForm({ clinicId, locale }: { clinicId: string; locale: UiLocale }) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(provisionStaffMember, initialState);

  return (
    <div className="settings-form">
      <form action={action} className="settings-form">
        <input type="hidden" name="clinic_id" value={clinicId} />
        <input type="hidden" name="role" value="receptionist" />
        <label htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} dir="ltr" required />
        <button className="button" type="submit" disabled={pending}>
          {pending ? t.adding : t.add}
        </button>
        <p className="field-help">{t.help}</p>
      </form>

      {state.message ? (
        <div className={`notice ${state.status === "success" ? "notice-success" : "notice-error"}`} role={state.status === "success" ? "status" : "alert"}>
          <strong>{state.message}</strong>
          {state.status === "success" && state.email ? <div className="field-help" dir="ltr">{state.email}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
