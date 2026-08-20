import { NextResponse } from "next/server";
import { buildMetaCoexistenceLaunch } from "@/lib/reminders/meta-coexistence";
import { readMetaEmbeddedSignupReadiness } from "@/lib/reminders/meta-embedded-signup";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const providers = new Set(["meta", "infobip", "360dialog"]);

function currentProvider() {
  const candidate = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "meta";
  return providers.has(candidate) ? candidate : "unsupported";
}

function safeProviderConfiguration() {
  const provider = currentProvider();
  const dailyLimit = Number(process.env.WHATSAPP_GLOBAL_DAILY_LIMIT);
  const common = process.env.WHATSAPP_ENABLED === "true"
    && Number.isInteger(dailyLimit)
    && dailyLimit >= 1
    && dailyLimit <= 10_000;

  return {
    provider,
    enabled: process.env.WHATSAPP_ENABLED === "true",
    configured: provider === "meta"
      ? common
        && /^\d{5,32}$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "")
        && (process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "").length >= 32
      : provider === "infobip"
        ? common
          && (process.env.INFOBIP_API_KEY?.trim() ?? "").length >= 16
          && /^https:\/\/[a-z0-9.-]+\/?$/i.test(process.env.INFOBIP_BASE_URL?.trim() ?? "")
          && /^\+?\d{8,15}$/.test(process.env.INFOBIP_WHATSAPP_SENDER?.trim() ?? "")
        : provider === "360dialog"
          ? common && (process.env.D360_API_KEY?.trim() ?? "").length >= 16
          : false,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinic_id") ?? "";
  if (!uuidPattern.test(clinicId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabase as any;
  const [{ data: clinic }, { data: membership }] = await Promise.all([
    db.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    db.from("clinic_members").select("role").eq("clinic_id", clinicId).eq("user_id", userData.user.id).maybeSingle(),
  ]);

  if (!clinic) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const administrative = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  if (!administrative) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const embeddedSignup = readMetaEmbeddedSignupReadiness();
  const provider = safeProviderConfiguration();
  const launch = buildMetaCoexistenceLaunch(embeddedSignup);

  return NextResponse.json({
    provider,
    embeddedSignup: {
      configured: embeddedSignup.configured,
      enabled: embeddedSignup.enabled,
      mode: embeddedSignup.mode,
      appId: embeddedSignup.appId,
      configId: embeddedSignup.configId,
      graphApiVersion: embeddedSignup.graphApiVersion,
      blockers: embeddedSignup.blockers,
    },
    launch,
    canStartEmbeddedSignup: launch !== null,
  }, { headers: { "Cache-Control": "no-store" } });
}
