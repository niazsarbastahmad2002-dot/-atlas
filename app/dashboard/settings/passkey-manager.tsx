"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: {
    title: "Optional quick sign-in",
    help: "Not needed for everyday use. Atlas normally keeps this device signed in. Set this up only if you want a faster way back in after a future sign-out.",
    button: "Set up quick sign-in",
    waiting: "Waiting for device…",
    ready: "Quick sign-in ready",
    readyHelp: "Quick sign-in is saved. Normal Atlas launches still open directly while this device remains signed in.",
    existing: "Quick sign-in is already saved for this account.",
    cancelled: "The device prompt was closed. Nothing changed — you can try again later.",
    unavailable: "Quick sign-in could not be set up. Your current Atlas session is unchanged.",
    disabled: "Quick sign-in is temporarily unavailable. Email sign-in still works normally.",
  },
  ku: {
    title: "چوونەژوورەوەی خێرای ئارەزوومەندانە",
    help: "بۆ بەکارهێنانی ڕۆژانە پێویست نییە. Atlas بە ئاسایی ئەم ئامێرە بە چوونەژوورەوە دەهێڵێتەوە. تەنها ئەگەر دەتەوێت دوای چوونەدەرەوە گەڕانەوە خێراتر بێت، ڕێکی بخە.",
    button: "چوونەژوورەوەی خێرا ڕێکبخە",
    waiting: "چاوەڕێی ئامێرەکەتە…",
    ready: "چوونەژوورەوەی خێرا ئامادەیە",
    readyHelp: "چوونەژوورەوەی خێرا هەڵگیرا. تا ئەم ئامێرە چوونەژوورەوەی تێدا ماوە، Atlas هەر ڕاستەوخۆ دەکرێتەوە.",
    existing: "چوونەژوورەوەی خێرا پێشتر بۆ ئەم هەژمارە هەڵگیراوە.",
    cancelled: "پەنجەرەی ئامێر داخرا. هیچ شتێک نەگۆڕا — دواتر دەتوانیت دووبارە هەوڵ بدەیت.",
    unavailable: "چوونەژوورەوەی خێرا ڕێک نەخرا. سێشنی ئێستای Atlas هیچ گۆڕانکارییەکی بەسەردا نەهات.",
    disabled: "چوونەژوورەوەی خێرا کاتێکی کورت بەردەست نییە. چوونەژوورەوە بە ئیمەیڵ هەر کار دەکات.",
  },
  ar: {
    title: "دخول سريع اختياري",
    help: "ليس مطلوباً للاستخدام اليومي. يبقي Atlas هذا الجهاز مسجلاً للدخول عادةً. أعدّه فقط إذا أردت طريقة أسرع للعودة بعد تسجيل خروج مستقبلي.",
    button: "إعداد الدخول السريع",
    waiting: "بانتظار الجهاز…",
    ready: "الدخول السريع جاهز",
    readyHelp: "تم حفظ الدخول السريع. ما دام هذا الجهاز مسجلاً للدخول فسيظل Atlas يفتح مباشرة.",
    existing: "الدخول السريع محفوظ بالفعل لهذا الحساب.",
    cancelled: "تم إغلاق طلب الجهاز. لم يتغير شيء ويمكنك المحاولة لاحقاً.",
    unavailable: "تعذر إعداد الدخول السريع. جلسة Atlas الحالية لم تتغير.",
    disabled: "الدخول السريع غير متاح مؤقتاً. تسجيل الدخول بالبريد ما زال يعمل بشكل طبيعي.",
  },
} as const;

export function PasskeyManager({ locale }: { locale: UiLocale }) {
  const t = copy[locale];
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function register() {
    if (status === "working") return;
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();

      if (error) {
        const code = error.code ?? "";
        const text = error.message?.toLowerCase() ?? "";

        if (code === "passkey_disabled") {
          setMessage(t.disabled);
        } else if (code === "webauthn_credential_exists" || code === "too_many_passkeys" || text.includes("already") || (text.includes("credential") && text.includes("exist"))) {
          setMessage(t.existing);
          setStatus("success");
          return;
        } else if (text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out") || text.includes("abort")) {
          setMessage(t.cancelled);
        } else {
          setMessage(t.unavailable);
        }
        setStatus("error");
        return;
      }

      setMessage(t.readyHelp);
      setStatus("success");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMessage(name === "NotAllowedError" || name === "AbortError" ? t.cancelled : t.unavailable);
      setStatus("error");
    }
  }

  return (
    <div className="settings-form passkey-settings-inline">
      <div>
        <strong className="passkey-settings-title">{t.title}</strong>
        <p className="field-help">{t.help}</p>
      </div>
      <button className="button button-ghost" type="button" onClick={register} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? t.waiting : status === "success" ? t.ready : t.button}
      </button>
      {message ? (
        <p className={`notice ${status === "success" ? "notice-success" : "notice-error"}`} role={status === "success" ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
      <style jsx>{`
        .passkey-settings-inline { margin-top: 8px; }
        .passkey-settings-title { display: block; margin-bottom: 4px; font-size: 12px; color: var(--ink-soft); }
        .passkey-settings-inline .button { justify-self: start; width: auto; }
      `}</style>
    </div>
  );
}
