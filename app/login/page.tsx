import Link from "next/link";
import { redirect } from "next/navigation";
import { getUiLocale } from "@/lib/i18n/ui-server";
import type { UiLocale } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { LoginLanguagePicker } from "./language-picker";

type LoginPageProps = { searchParams: Promise<{ error?: string; notice?: string }> };
type LoginPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  invalid: string;
  signedOut: string;
  clinicDeleted: string;
  accountDeleted: string;
  stageSignal: string;
  stagePulse: string;
  language: string;
};

const pageCopy: Record<UiLocale, LoginPageCopy> = {
  en: {
    eyebrow: "Front desk",
    title: "Your clinic starts with your number.",
    subtitle: "Enter your WhatsApp number. Atlas sends a code there, you copy it here, and you’re in.",
    invalid: "That sign-in session is no longer valid. Request a fresh WhatsApp code below.",
    signedOut: "You signed out safely.",
    clinicDeleted: "The clinic workspace was deleted.",
    accountDeleted: "Your Atlas account was permanently deleted. Verify a phone number whenever you want to create a completely new account.",
    stageSignal: "One number. Your clinic workspace.",
    stagePulse: "Verified through WhatsApp",
    language: "Choose your language",
  },
  ku: {
    eyebrow: "سکرتێر",
    title: "کلینیکەکەت بە ژمارەی مۆبایلەکەت دەست پێ دەکات.",
    subtitle: "ژمارەی WhatsApp ـەکەت بنووسە. Atlas کۆدێک بۆ WhatsApp دەنێرێت، کۆپی بکە و لێرە دایبنێ، پاشان دەچیتە ژوورەوە.",
    invalid: "دانیشتنی چوونەژوورەوەکە چیتر دروست نییە. کۆدێکی نوێی WhatsApp داوا بکە.",
    signedOut: "بە سەلامەتی چوویتە دەرەوە.",
    clinicDeleted: "شوێنی کاری کلینیکەکە سڕایەوە.",
    accountDeleted: "هەژماری Atlas ـەکەت بە هەمیشەیی سڕایەوە. هەر کات دەتەوێت هەژمارێکی تەواو نوێ دروست بکەیت، ژمارەیەک پشتڕاست بکەرەوە.",
    stageSignal: "یەک ژمارە، شوێنی کاری کلینیکەکەت.",
    stagePulse: "پشتڕاستکراوە لە WhatsApp",
    language: "زمانەکەت هەڵبژێرە",
  },
  bd: {
    eyebrow: "سکرتێر",
    title: "کلینیکا تە ب ژمارا موبایلا تە دەست پێ دکەت.",
    subtitle: "ژمارا WhatsApp یا خۆ بنڤیسە. Atlas کۆدەکێ بۆ WhatsApp دهنێریت، کۆپی بکە و ل ڤێرێ دابنێ، پاشی دچیتە ژوور.",
    invalid: "دانیشتنا چوونەژوورێ دیگر دروست نینە. کۆدەکێ نوو یێ WhatsApp بخوازە.",
    signedOut: "ب سەلامەتی چوویە دەرڤە.",
    clinicDeleted: "شوێنێ کارێ کلینیکێ هاتە ژێبرن.",
    accountDeleted: "هەژمارا Atlas یا تە بۆ هەردەم هاتە ژێبرن. هەر دەم بخوازیت هەژمارەکا تەمام نوو دروست بکەی، ژمارەکێ پشتڕاست بکە.",
    stageSignal: "ئێک ژمارە، شوێنێ کارێ کلینیکا تە.",
    stagePulse: "ل WhatsApp هاتییە پشتڕاستکرن",
    language: "زمانێ خۆ هەلبژێرە",
  },
  ar: {
    eyebrow: "الاستقبال",
    title: "عيادتك تبدأ من رقمك.",
    subtitle: "اكتب رقم واتساب. Atlas يرسل لك كود على واتساب، انسخه هنا، وتدخل مباشرة.",
    invalid: "جلسة تسجيل الدخول لم تعد صالحة. اطلب كود واتساب جديد بالأسفل.",
    signedOut: "تم تسجيل الخروج بأمان.",
    clinicDeleted: "تم حذف مساحة العيادة.",
    accountDeleted: "تم حذف حساب Atlas نهائياً. لما تريد تبدأ من جديد، وثّق رقمك وأنشئ حساباً جديداً بالكامل.",
    stageSignal: "رقم واحد، مساحة عيادتك.",
    stagePulse: "موثّق عبر واتساب",
    language: "اختار لغتك",
  },
};

function AtlasLoginLogo() {
  return (
    <Link className="login-logo-lockup" href="/" aria-label="Atlas">
      <img className="login-main-mark" src="/atlas-mark.svg" alt="" aria-hidden="true" />
      <span className="login-logo-copy"><strong>ATLAS</strong></span>
    </Link>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;
  if (process.env.ATLAS_E2E_NO_AUTH !== "true") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard/select-clinic");
  }

  const locale = await getUiLocale();
  const copy = pageCopy[locale];
  const errorMessage = error === "invalid_link" || error === "invalid_otp" || error === "invalid_invite" ? copy.invalid : null;
  const noticeMessage = notice === "signed_out" ? copy.signedOut
    : notice === "clinic_deleted" ? copy.clinicDeleted
      : notice === "account_deleted" ? copy.accountDeleted
        : null;

  return (
    <main className="login-page">
      <aside className="login-visual" aria-hidden="true">
        <div className="login-brand-stage">
          <img className="login-hero-mark" src="/atlas-mark.svg" alt="" />
          <span className="login-stage-word">ATLAS</span>
          <span className="login-stage-signal">{copy.stageSignal}</span>
          <span className="login-stage-pulse">{copy.stagePulse}</span>
        </div>
      </aside>

      <section className="login-card">
        <AtlasLoginLogo />
        <div className="login-language-block">
          <span>{copy.language}</span>
          <LoginLanguagePicker locale={locale} />
        </div>
        <div className="login-copy">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        {errorMessage ? <p className="notice notice-error login-notice" role="alert">{errorMessage}</p> : null}
        {noticeMessage ? <p className="notice notice-success login-notice" role="status">{noticeMessage}</p> : null}
        <LoginForm locale={locale} />
      </section>
    </main>
  );
}
