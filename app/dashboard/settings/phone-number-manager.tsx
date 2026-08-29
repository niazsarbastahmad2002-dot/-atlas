"use client";

import Link from "next/link";
import { formatPhoneForDisplay } from "@/lib/phone-display";
import type { UiLocale } from "@/lib/i18n/ui";

type Copy = {
  title: string;
  help: string;
  verified: string;
  pending: string;
  manage: string;
};

const copyByLocale: Record<UiLocale, Copy> = {
  en: {
    title: "Sign-in phone",
    help: "This is the verified phone number you use to sign in to Atlas.",
    verified: "Verified phone",
    pending: "Phone not verified yet",
    manage: "Manage sign-in phone",
  },
  ku: {
    title: "ژمارەی چوونەژوورەوە",
    help: "ئەمە ژمارەی پشتڕاستکراوەیە کە بۆ چوونەژوورەوەی Atlas بەکاری دەهێنیت.",
    verified: "ژمارەی پشتڕاستکراو",
    pending: "ژمارە هێشتا پشتڕاست نەکراوەتەوە",
    manage: "بەڕێوەبردنی ژمارەی چوونەژوورەوە",
  },
  bd: {
    title: "ژمارا چوونەژوورێ",
    help: "ئەڤە ژمارا پشتڕاستکرییە کو بۆ چوونەژوورا Atlas بکار دئینی.",
    verified: "ژمارا پشتڕاستکری",
    pending: "ژمارا موبایلێ هێشتا نەهاتییە پشتڕاستکرن",
    manage: "بەڕێڤەبرنا ژمارا چوونەژوورێ",
  },
  ar: {
    title: "رقم تسجيل الدخول",
    help: "هذا هو رقم الهاتف الموثق الذي تستخدمه للدخول إلى Atlas.",
    verified: "الرقم الموثق",
    pending: "رقم الهاتف غير موثق بعد",
    manage: "إدارة رقم تسجيل الدخول",
  },
};

export function PhoneNumberManager({ locale, currentPhone }: { locale: UiLocale; currentPhone: string | null }) {
  const copy = copyByLocale[locale];

  return (
    <div className="settings-form">
      <div>
        <strong>{copy.title}</strong>
        <p className="field-help">{copy.help}</p>
      </div>
      <div className="settings-readonly-clinic">
        <span>{copy.verified}</span>
        <strong className="atlas-phone-display" dir="ltr" lang="en">
          {currentPhone ? formatPhoneForDisplay(currentPhone) : copy.pending}
        </strong>
      </div>
      <Link className="button button-ghost button-small" href="/dashboard/settings/phone">
        {copy.manage}
      </Link>
    </div>
  );
}
