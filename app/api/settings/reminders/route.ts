import { NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedLeadMinutes = new Set([30, 60, 120, 240, 360, 720, 1440, 2880, 10080]);
const reminderLanguages = new Set(["ku", "ar", "en"]);

async function context(clinicId: string) {
  if (!isUuid(clinicId)) return null;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

  if (!clinic) return null;
  const canManage = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";

  return { supabase, canManage };
}

export async function GET(request: Request) {
  const clinicId = new URL(request.url).searchParams.get("clinic") ?? "";
  const ctx = await context(clinicId);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("clinic_reminder_settings")
    .select("enabled, lead_minutes, second_lead_minutes, default_reminder_language, messaging_approved_at, template_name, template_language, daily_message_limit")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.json({
    enabled: data.enabled,
    leadMinutes: data.lead_minutes,
    secondLeadMinutes: data.second_lead_minutes,
    defaultLanguage: data.default_reminder_language,
    approved: Boolean(data.messaging_approved_at),
    canManage: ctx.canManage,
    templateName: data.template_name,
    templateLanguage: data.template_language,
    dailyMessageLimit: data.daily_message_limit,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: {
    clinicId?: unknown;
    enabled?: unknown;
    leadMinutes?: unknown;
    secondLeadMinutes?: unknown;
    defaultLanguage?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const clinicId = typeof body.clinicId === "string" ? body.clinicId : "";
  const ctx = await context(clinicId);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ctx.canManage) return NextResponse.json({ error: "manager_required" }, { status: 403 });

  const enabled = body.enabled === true;
  const leadMinutes = Number(body.leadMinutes);
  const secondLeadMinutes = body.secondLeadMinutes === null ? null : Number(body.secondLeadMinutes);
  const defaultLanguage = typeof body.defaultLanguage === "string" ? body.defaultLanguage : "";

  if (
    !allowedLeadMinutes.has(leadMinutes)
    || (secondLeadMinutes !== null && !allowedLeadMinutes.has(secondLeadMinutes))
    || secondLeadMinutes === leadMinutes
    || !reminderLanguages.has(defaultLanguage)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { data: current, error: readError } = await ctx.supabase
    .from("clinic_reminder_settings")
    .select("messaging_approved_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (readError || !current) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (enabled && !current.messaging_approved_at) {
    return NextResponse.json({ error: "approval_required" }, { status: 409 });
  }

  const { data, error } = await ctx.supabase
    .from("clinic_reminder_settings")
    .update({
      enabled,
      lead_minutes: leadMinutes,
      second_lead_minutes: secondLeadMinutes,
      default_reminder_language: defaultLanguage,
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId)
    .select("lead_minutes, second_lead_minutes, default_reminder_language, enabled")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    enabled: data.enabled,
    leadMinutes: data.lead_minutes,
    secondLeadMinutes: data.second_lead_minutes,
    defaultLanguage: data.default_reminder_language,
  }, { headers: { "Cache-Control": "no-store" } });
}
