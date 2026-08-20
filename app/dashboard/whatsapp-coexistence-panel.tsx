"use client";

import { useCallback, useEffect, useState } from "react";
import type { UiLocale } from "@/lib/i18n/ui";

type MetaLaunch = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  responseType: "code";
  overrideDefaultResponseType: true;
  extras: Record<string, unknown>;
};

type Connection = {
  provider?: unknown;
  mode?: unknown;
  displayPhoneNumber?: unknown;
  verifiedName?: unknown;
  status?: unknown;
};

type OnboardingStatus = {
  connection: Connection | null;
  launch: MetaLaunch | null;
  canStartEmbeddedSignup: boolean;
};

type SessionInfo = {
  wabaId: string;
  phoneNumberId: string | null;
  businessId: string | null;
};

type FacebookLoginResponse = {
  authResponse?: { code?: string } | null;
};

type FacebookSdk = {
  init(input: { appId: string; xfbml: boolean; version: string }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

const idPattern = /^\d{5,32}$/;
let facebookSdkPromise: Promise<void> | null = null;

const copy = {
  en: {
    title: "WhatsApp connection",
    help: "Connect the clinic's existing WhatsApp Business number without removing it from the phone app. Automatic reminders stay off until Atlas verifies the sender and templates.",
    connected: "Connected",
    connect: "Connect existing WhatsApp number",
    connecting: "Connecting…",
    loading: "Checking WhatsApp connection…",
    notReady: "Meta Coexistence setup is not ready yet.",
    failed: "The WhatsApp connection did not finish. Try again.",
    testSender: "Choose the clinic's real +964 WhatsApp Business number, not Meta's test number.",
    multiple: "Meta returned more than one real sender. Choose the clinic's existing WhatsApp Business number and try again.",
  },
  ku: {
    title: "پەیوەستکردنی واتسئاپ",
    help: "ژمارەی WhatsApp Business ـی ئێستای کلینیک پەیوەست بکە بەبێ لابردنی لە ئەپی مۆبایل. ناردنی خۆکار هەتا پشکنینی ژمارە و تێمپلەیتەکان ناچالاک دەمێنێتەوە.",
    connected: "پەیوەستە",
    connect: "ژمارەی ئێستای واتسئاپ پەیوەست بکە",
    connecting: "پەیوەست دەکرێت…",
    loading: "پەیوەندی واتسئاپ پشکنین دەکرێت…",
    notReady: "ڕێکخستنی Meta Coexistence هێشتا ئامادە نییە.",
    failed: "پەیوەستکردنی واتسئاپ تەواو نەبوو. دووبارە هەوڵ بدە.",
    testSender: "ژمارەی ڕاستەقینەی +964 ـی WhatsApp Business هەڵبژێرە، نەک ژمارەی تاقیکردنەوەی Meta.",
    multiple: "Meta زیاتر لە یەک ژمارەی ڕاستەقینە گەڕاندەوە. ژمارەی WhatsApp Business ـی کلینیک هەڵبژێرە و دووبارە هەوڵ بدە.",
  },
  bd: {
    title: "گرێدانا واتسئاپێ",
    help: "ژمارا WhatsApp Business یا کلینیکێ یا هەیی گرێبدە بێ کو ژ ئەپێ مۆبایلێ بهێتە لابردن. هنارتنا خودکار هەتا Atlas ژمارە و تێمپلەیتان پشتڕاست دکەت ناچالاک دمینیت.",
    connected: "گرێدایە",
    connect: "ژمارا واتسئاپا هەیی گرێبدە",
    connecting: "دهێتە گرێدان…",
    loading: "گرێدانا واتسئاپێ دهێتە پشکنین…",
    notReady: "ڕێکخستنا Meta Coexistence هێشتا ئامادە نینە.",
    failed: "گرێدانا واتسئاپێ تەمام نەبوو. دووبارە هەول بدە.",
    testSender: "ژمارا ڕاستەقینە یا +964 یا WhatsApp Business هەلبژێرە، نە ژمارا تاقیکرنێ یا Meta.",
    multiple: "Meta پتر ژ ژمارەکا ڕاستەقینە ڤەگەڕاند. ژمارا WhatsApp Business یا کلینیکێ هەلبژێرە و دووبارە هەول بدە.",
  },
  ar: {
    title: "ربط واتساب",
    help: "اربط رقم WhatsApp Business الحالي للعيادة من دون إزالته من تطبيق الهاتف. تبقى التذكيرات التلقائية متوقفة حتى يتحقق Atlas من الرقم والقوالب.",
    connected: "متصل",
    connect: "ربط رقم واتساب الحالي",
    connecting: "جارٍ الربط…",
    loading: "جارٍ التحقق من اتصال واتساب…",
    notReady: "إعداد Meta Coexistence غير جاهز بعد.",
    failed: "لم يكتمل ربط واتساب. حاول مرة أخرى.",
    testSender: "اختر رقم WhatsApp Business العراقي الحقيقي +964 للعيادة، وليس رقم Meta التجريبي.",
    multiple: "أعادت Meta أكثر من رقم حقيقي. اختر رقم WhatsApp Business الحالي للعيادة وحاول مرة أخرى.",
  },
} as const;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function facebookOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:"
      && (url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com"));
  } catch {
    return false;
  }
}

function parseSessionInfo(event: MessageEvent): SessionInfo | null {
  if (!facebookOrigin(event.origin)) return null;
  let payload: unknown = event.data;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload) as unknown; } catch { return null; }
  }
  const root = object(payload);
  if (
    root?.type !== "WA_EMBEDDED_SIGNUP"
    || String(root.version) !== "3"
    || (root.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" && root.event !== "FINISH")
  ) return null;

  const data = object(root.data);
  const wabaId = typeof data?.waba_id === "string" && idPattern.test(data.waba_id)
    ? data.waba_id
    : null;
  if (!wabaId) return null;
  const phoneNumberId = typeof data?.phone_number_id === "string" && idPattern.test(data.phone_number_id)
    ? data.phone_number_id
    : null;
  const businessId = typeof data?.business_id === "string" && idPattern.test(data.business_id)
    ? data.business_id
    : null;
  return { wabaId, phoneNumberId, businessId };
}

function loadFacebookSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("browser_required"));
  if (window.FB) return Promise.resolve();
  if (facebookSdkPromise) return facebookSdkPromise;

  facebookSdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("facebook-jssdk") as HTMLScriptElement | null;
    const done = () => window.FB ? resolve() : reject(new Error("facebook_sdk_missing"));
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("facebook_sdk_failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("facebook_sdk_failed")), { once: true });
    document.head.appendChild(script);
  });
  return facebookSdkPromise;
}

function errorCopy(code: string | null, locale: UiLocale) {
  if (code === "test_sender_number") return copy[locale].testSender;
  if (code === "phone_selection_required") return copy[locale].multiple;
  if (code === "embedded_signup_not_ready") return copy[locale].notReady;
  return copy[locale].failed;
}

export function WhatsAppCoexistencePanel({
  clinicId,
  locale,
  canManage,
}: {
  clinicId: string;
  locale: UiLocale;
  canManage: boolean;
}) {
  const t = copy[locale];
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const response = await fetch(`/api/whatsapp/onboarding/status?clinic_id=${encodeURIComponent(clinicId)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("status_failed");
    const value = await response.json() as OnboardingStatus;
    setStatus(value);
    return value;
  }, [clinicId]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void loadStatus().catch(() => {
      if (active) setError("status_failed");
    });
    return () => { active = false; };
  }, [canManage, loadStatus]);

  useEffect(() => {
    if (!status?.canStartEmbeddedSignup || !status.launch || status.connection?.status === "connected") return;
    let active = true;
    const launch = status.launch;
    void loadFacebookSdk().then(() => {
      if (!active || !window.FB) return;
      window.FB.init({ appId: launch.appId, xfbml: false, version: launch.graphApiVersion });
      setSdkReady(true);
    }).catch(() => {
      if (active) setError("facebook_sdk_failed");
    });
    return () => { active = false; };
  }, [status]);

  if (!canManage) return null;

  const launchSignup = () => {
    const launch = status?.launch;
    if (!launch || !sdkReady || !window.FB || busy) return;
    setBusy(true);
    setError(null);

    let code: string | null = null;
    let session: SessionInfo | null = null;
    let completing = false;
    let finished = false;
    let timeoutId = 0;

    const cleanup = () => {
      window.removeEventListener("message", sessionListener);
      if (timeoutId) window.clearTimeout(timeoutId);
    };

    const completeIfReady = async () => {
      if (finished || completing || !code || !session) return;
      completing = true;
      try {
        const response = await fetch("/api/whatsapp/onboarding/complete", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicId,
            code,
            wabaId: session.wabaId,
            phoneNumberId: session.phoneNumberId,
            businessId: session.businessId,
          }),
        });
        const result = await response.json().catch(() => null) as { error?: unknown } | null;
        if (!response.ok) {
          setError(typeof result?.error === "string" ? result.error : "connection_failed");
          return;
        }
        finished = true;
        await loadStatus();
      } catch {
        setError("connection_failed");
      } finally {
        completing = false;
        cleanup();
        setBusy(false);
      }
    };

    function sessionListener(event: MessageEvent) {
      const parsed = parseSessionInfo(event);
      if (!parsed) return;
      session = parsed;
      void completeIfReady();
    }

    window.addEventListener("message", sessionListener);
    timeoutId = window.setTimeout(() => {
      if (finished) return;
      cleanup();
      setBusy(false);
      setError("signup_incomplete");
    }, 10 * 60 * 1000);

    try {
      window.FB.login((response) => {
        const candidate = response.authResponse?.code?.trim() ?? "";
        if (!candidate) {
          cleanup();
          setBusy(false);
          setError("signup_cancelled");
          return;
        }
        code = candidate;
        void completeIfReady();
      }, {
        config_id: launch.configId,
        response_type: launch.responseType,
        override_default_response_type: launch.overrideDefaultResponseType,
        extras: launch.extras,
      });
    } catch {
      cleanup();
      setBusy(false);
      setError("signup_failed");
    }
  };

  const connected = status?.connection?.status === "connected";
  const displayPhone = typeof status?.connection?.displayPhoneNumber === "string"
    ? status.connection.displayPhoneNumber
    : "";
  const verifiedName = typeof status?.connection?.verifiedName === "string"
    ? status.connection.verifiedName
    : "";

  return (
    <div className="atlas-whatsapp-connect">
      <div>
        <strong>{t.title}</strong>
        <p>{t.help}</p>
      </div>

      {!status && !error ? <small>{t.loading}</small> : null}

      {connected ? (
        <div className="atlas-whatsapp-connected" role="status">
          <span>{t.connected}</span>
          <strong>{displayPhone || verifiedName}</strong>
        </div>
      ) : status && !status.canStartEmbeddedSignup ? (
        <p className="reminder-provider-note">{t.notReady}</p>
      ) : status ? (
        <button className="button button-secondary button-small" type="button" disabled={!sdkReady || busy} onClick={launchSignup}>
          {busy ? t.connecting : t.connect}
        </button>
      ) : null}

      {error ? <p className="notice notice-error" role="alert">{errorCopy(error, locale)}</p> : null}

      <style>{`
        .atlas-whatsapp-connect{display:grid;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
        .atlas-whatsapp-connect>div:first-child{display:grid;gap:4px}.atlas-whatsapp-connect p{margin:0}
        .atlas-whatsapp-connect>div:first-child p{color:var(--muted);font-size:11px;line-height:1.5}
        .atlas-whatsapp-connected{display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:11px;padding:9px 11px;background:var(--surface-soft);font-size:12px}
        .atlas-whatsapp-connected span{color:var(--muted)}
      `}</style>
    </div>
  );
}
