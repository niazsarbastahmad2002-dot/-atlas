"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UiLocale } from "@/lib/i18n/ui";

const copy = {
  en: {
    button: "Finish setup",
    waiting: "Waiting for your device…",
    help: "Approve the secure prompt once. Normal visits open Atlas directly while your session remains active.",
    cancelled: "The secure prompt was closed before setup finished. Try again, or continue to Atlas for now.",
    unavailable: "This device could not finish quick access. Your signed-in Atlas session is still protected.",
    continue: "Continue to Atlas",
  },
  ku: {
    button: "ڕێکخستن تەواو بکە",
    waiting: "چاوەڕێی ئامێرەکەتە…",
    help: "یەک جار پشتڕاستکردنەوەی پارێزراو تەواو بکە. تا سێشنەکەت چالاکە، جارەکانی داهاتوو Atlas ڕاستەوخۆ دەکرێتەوە.",
    cancelled: "پشتڕاستکردنەوە پێش تەواوبوونی ڕێکخستن داخرا. دووبارە هەوڵ بدە، یان فعلاً بەردەوام بە بۆ Atlas.",
    unavailable: "ئەم ئامێرە نەیتوانی چوونەژوورەوەی خێرا تەواو بکات. سێشنی Atlas ـەکەت هەر پارێزراوە.",
    continue: "بەردەوام بە بۆ Atlas",
  },
  ar: {
    button: "إنهاء الإعداد",
    waiting: "بانتظار جهازك…",
    help: "وافق على التحقق الآمن مرة واحدة. الزيارات العادية تفتح Atlas مباشرة ما دامت جلستك فعالة.",
    cancelled: "أُغلق التحقق قبل اكتمال الإعداد. حاول مرة أخرى، أو تابع إلى Atlas الآن.",
    unavailable: "لم يتمكن هذا الجهاز من إكمال الدخول السريع. جلسة Atlas الحالية ما زالت محمية.",
    continue: "متابعة إلى Atlas",
  },
} as const;

export function DeviceSetup({ locale }: { locale: UiLocale }) {
  const t = copy[locale];
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function secureDevice() {
    if (status === "working") return;
    setStatus("working");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();

      if (!error || error.code === "webauthn_credential_exists" || error.code === "too_many_passkeys") {
        window.location.replace("/dashboard");
        return;
      }

      const text = `${error.name ?? ""} ${error.message ?? ""}`.toLowerCase();
      const cancelled = text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("timed out") || text.includes("abort");
      setMessage(cancelled ? t.cancelled : t.unavailable);
      setStatus("error");
    } catch (error) {
      const text = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : "";
      const cancelled = text.includes("cancel") || text.includes("notallowed") || text.includes("not allowed") || text.includes("abort");
      setMessage(cancelled ? t.cancelled : t.unavailable);
      setStatus("error");
    }
  }

  return (
    <div className="settings-form device-setup-actions">
      <button className="button" type="button" onClick={secureDevice} disabled={status === "working"} aria-busy={status === "working"}>
        {status === "working" ? t.waiting : t.button}
      </button>
      <p className="field-help">{t.help}</p>

      {status === "error" ? (
        <div className="notice notice-error" role="alert">
          <p>{message}</p>
          <div className="device-setup-continue">
            <a className="button button-ghost button-small" href="/dashboard">{t.continue}</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
