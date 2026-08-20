import { NextResponse } from "next/server";
import { cleanDisplayName, isValidDisplayName, normalizeIraqiMobile } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const intervals = new Set([5, 10, 15, 20, 30]);
const languages = new Set(["ku", "bd", "ar", "en"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validLead(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 30 && Number(value) <= 10080;
}

function optionalSpecialty(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return null;
  if (!isValidDisplayName(raw)) return false;
  return cleanDisplayName(raw);
}

function optionalPhone(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return null;
  return normalizeIraqiMobile(raw) ?? false;
}

async function context(clinicId: string, requestedDoctorId?: string | null) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const db = supabase as any;
  const [{ data: clinic }, { data: membership }, { data: doctors }] = await Promise.all([
    db.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    db.from("clinic_members").select("role, assigned_doctor_id").eq("clinic_id", clinicId).eq("user_id", userData.user.id).maybeSingle(),
    db.from("doctors").select("id, name, specialty, receptionist_phone, active, display_order").eq("clinic_id", clinicId).eq("active", true).order("display_order", { ascending: true }).order("name", { ascending: true }),
  ]);

  if (!clinic || !Array.isArray(doctors) || doctors.length === 0) return null;
  const administrative = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  const assignedDoctorId = membership?.role === "receptionist" ? membership.assigned_doctor_id : null;
  const wanted = administrative && requestedDoctorId && doctors.some((doctor: any) => doctor.id === requestedDoctorId)
    ? requestedDoctorId
    : assignedDoctorId && doctors.some((doctor: any) => doctor.id === assignedDoctorId)
      ? assignedDoctorId
      : doctors[0].id;
  const doctor = doctors.find((item: any) => item.id === wanted) ?? doctors[0];

  return { supabase, db, user: userData.user, clinic, membership, administrative, doctors, doctor };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinic_id") ?? "";
  const doctorId = url.searchParams.get("doctor_id");
  if (!uuidPattern.test(clinicId) || (doctorId && !uuidPattern.test(doctorId))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ctx = await context(clinicId, doctorId);
  if (!ctx) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  const [{ data: settings }, { data: provider }] = await Promise.all([
    ctx.db.from("doctor_workflow_settings")
      .select("appointment_interval_minutes, reminders_enabled, reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", ctx.doctor.id)
      .maybeSingle(),
    ctx.db.from("clinic_reminder_settings")
      .select("messaging_approved_at")
      .eq("clinic_id", clinicId)
      .maybeSingle(),
  ]);

  if (!settings) return NextResponse.json({ error: "settings_unavailable" }, { status: 404 });

  return NextResponse.json({
    role: ctx.administrative ? "admin" : "receptionist",
    doctorId: ctx.doctor.id,
    doctorName: ctx.doctor.name,
    doctorSpecialty: ctx.doctor.specialty ?? "",
    receptionPhone: ctx.doctor.receptionist_phone ?? "",
    doctors: ctx.administrative ? ctx.doctors.map((doctor: any) => ({ id: doctor.id, name: doctor.name })) : [{ id: ctx.doctor.id, name: ctx.doctor.name }],
    appointmentIntervalMinutes: settings.appointment_interval_minutes,
    remindersEnabled: settings.reminders_enabled,
    reminderLeadMinutes: settings.reminder_lead_minutes,
    reminderSecondLeadMinutes: settings.reminder_second_lead_minutes,
    defaultReminderLanguage: settings.default_reminder_language,
    messagingApproved: Boolean(provider?.messaging_approved_at),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clinicId = typeof body.clinicId === "string" ? body.clinicId : "";
  const requestedDoctorId = typeof body.doctorId === "string" ? body.doctorId : null;
  if (!uuidPattern.test(clinicId) || (requestedDoctorId && !uuidPattern.test(requestedDoctorId))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ctx = await context(clinicId, requestedDoctorId);
  if (!ctx) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  if (requestedDoctorId && requestedDoctorId !== ctx.doctor.id) {
    return NextResponse.json({ error: "doctor_forbidden" }, { status: 403 });
  }

  const specialty = optionalSpecialty(body.doctorSpecialty);
  if (specialty === false) return NextResponse.json({ error: "specialty_invalid" }, { status: 400 });
  if (specialty !== undefined && !ctx.administrative) {
    return NextResponse.json({ error: "specialty_forbidden" }, { status: 403 });
  }
  const receptionPhone = optionalPhone(body.receptionPhone);
  if (receptionPhone === false) return NextResponse.json({ error: "phone_invalid" }, { status: 400 });

  const { data: current, error: readError } = await ctx.db.from("doctor_workflow_settings")
    .select("appointment_interval_minutes, reminders_enabled, reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", ctx.doctor.id)
    .maybeSingle();
  if (readError || !current) return NextResponse.json({ error: "settings_unavailable" }, { status: 404 });

  const next = {
    appointment_interval_minutes: current.appointment_interval_minutes,
    reminders_enabled: current.reminders_enabled,
    reminder_lead_minutes: current.reminder_lead_minutes,
    reminder_second_lead_minutes: current.reminder_second_lead_minutes,
    default_reminder_language: current.default_reminder_language,
    updated_by: ctx.user.id,
  };

  let workflowChanged = false;
  if (body.appointmentIntervalMinutes !== undefined) {
    const value = Number(body.appointmentIntervalMinutes);
    if (!intervals.has(value)) return NextResponse.json({ error: "interval_invalid" }, { status: 400 });
    next.appointment_interval_minutes = value;
    workflowChanged = true;
  }
  if (body.remindersEnabled !== undefined) {
    if (typeof body.remindersEnabled !== "boolean") return NextResponse.json({ error: "reminders_invalid" }, { status: 400 });
    next.reminders_enabled = body.remindersEnabled;
    workflowChanged = true;
  }
  if (body.reminderLeadMinutes !== undefined) {
    const value = Number(body.reminderLeadMinutes);
    if (!validLead(value)) return NextResponse.json({ error: "lead_invalid" }, { status: 400 });
    next.reminder_lead_minutes = value;
    workflowChanged = true;
  }
  if (body.reminderSecondLeadMinutes !== undefined) {
    if (body.reminderSecondLeadMinutes === null || body.reminderSecondLeadMinutes === "") {
      next.reminder_second_lead_minutes = null;
    } else {
      const value = Number(body.reminderSecondLeadMinutes);
      if (!validLead(value)) return NextResponse.json({ error: "second_lead_invalid" }, { status: 400 });
      next.reminder_second_lead_minutes = value;
    }
    workflowChanged = true;
  }
  if (body.defaultReminderLanguage !== undefined) {
    const value = String(body.defaultReminderLanguage);
    if (!languages.has(value)) return NextResponse.json({ error: "language_invalid" }, { status: 400 });
    next.default_reminder_language = value;
    workflowChanged = true;
  }
  if (next.reminder_second_lead_minutes === next.reminder_lead_minutes) next.reminder_second_lead_minutes = null;

  let saved = current;
  if (workflowChanged) {
    const result = await ctx.db.from("doctor_workflow_settings")
      .update(next)
      .eq("clinic_id", clinicId)
      .eq("doctor_id", ctx.doctor.id)
      .select("appointment_interval_minutes, reminders_enabled, reminder_lead_minutes, reminder_second_lead_minutes, default_reminder_language")
      .maybeSingle();
    if (result.error || !result.data) {
      console.error("Atlas doctor workflow settings update failed", { code: result.error?.code ?? "not_found" });
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    saved = result.data;
  }

  let savedSpecialty = ctx.doctor.specialty ?? "";
  let savedReceptionPhone = ctx.doctor.receptionist_phone ?? "";
  if (specialty !== undefined || receptionPhone !== undefined) {
    let admin;
    try {
      admin = createAdminClient() as any;
    } catch {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    const doctorPatch: Record<string, string | null> = {};
    if (specialty !== undefined) doctorPatch.specialty = specialty;
    if (receptionPhone !== undefined) doctorPatch.receptionist_phone = receptionPhone;
    const { data: savedDoctor, error: doctorError } = await admin.from("doctors")
      .update(doctorPatch)
      .eq("clinic_id", clinicId)
      .eq("id", ctx.doctor.id)
      .select("specialty, receptionist_phone")
      .maybeSingle();
    if (doctorError || !savedDoctor) {
      console.error("Atlas patient-facing doctor details update failed", { code: doctorError?.code ?? "not_found" });
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    savedSpecialty = savedDoctor.specialty ?? "";
    savedReceptionPhone = savedDoctor.receptionist_phone ?? "";
  }

  return NextResponse.json({
    doctorId: ctx.doctor.id,
    doctorName: ctx.doctor.name,
    doctorSpecialty: savedSpecialty,
    receptionPhone: savedReceptionPhone,
    appointmentIntervalMinutes: saved.appointment_interval_minutes,
    remindersEnabled: saved.reminders_enabled,
    reminderLeadMinutes: saved.reminder_lead_minutes,
    reminderSecondLeadMinutes: saved.reminder_second_lead_minutes,
    defaultReminderLanguage: saved.default_reminder_language,
  }, { headers: { "Cache-Control": "no-store" } });
}
