import { NextResponse } from "next/server";
import { baghdadDate } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const allowedDelays = new Set([-15, 0, 15, 30, 45, 60, 90, 120]);

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return baghdadDate.format(date);
}

async function flowContext(clinicId: string | null, requestedDoctorId: string | null) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const db = supabase as any;

  let clinicQuery = db.from("clinics").select("id, owner_id").order("created_at", { ascending: true }).limit(1);
  if (clinicId) clinicQuery = db.from("clinics").select("id, owner_id").eq("id", clinicId).limit(1);
  const { data: clinics } = await clinicQuery;
  const clinic = Array.isArray(clinics) ? clinics[0] : clinics;
  if (!clinic?.id) return null;

  const [{ data: membership }, { data: doctors }] = await Promise.all([
    db.from("clinic_members").select("role, assigned_doctor_id").eq("clinic_id", clinic.id).eq("user_id", userData.user.id).maybeSingle(),
    db.from("doctors").select("id, name, active, display_order").eq("clinic_id", clinic.id).eq("active", true).order("display_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  if (!Array.isArray(doctors) || !doctors.length) return null;

  const administrative = clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager";
  const assignedDoctorId = membership?.role === "receptionist" ? membership.assigned_doctor_id : null;
  const doctorId = administrative && requestedDoctorId && doctors.some((doctor: any) => doctor.id === requestedDoctorId)
    ? requestedDoctorId
    : assignedDoctorId && doctors.some((doctor: any) => doctor.id === assignedDoctorId)
      ? assignedDoctorId
      : doctors[0].id;
  const doctor = doctors.find((item: any) => item.id === doctorId) ?? doctors[0];
  return { supabase, db, userId: userData.user.id, clinicId: clinic.id as string, doctor };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clinicId = url.searchParams.get("clinic_id");
  const doctorId = url.searchParams.get("doctor_id");
  const requestedDay = url.searchParams.get("day");
  if ((clinicId && !uuidPattern.test(clinicId)) || (doctorId && !uuidPattern.test(doctorId))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const today = baghdadDate.format(new Date());
  const day = requestedDay && dayPattern.test(requestedDay) ? requestedDay : today;
  const context = await flowContext(clinicId, doctorId);
  if (!context) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  if (day !== today) {
    return NextResponse.json({
      clinicId: context.clinicId,
      doctorId: context.doctor.id,
      doctorName: context.doctor.name,
      day,
      isToday: false,
      delayMinutes: null,
      signals: [],
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const dayStart = new Date(`${day}T00:00:00+03:00`).toISOString();
  const dayEnd = new Date(`${shiftDay(day, 1)}T00:00:00+03:00`).toISOString();
  const [{ data: flow }, { data: signals }] = await Promise.all([
    context.db.from("doctor_day_flow")
      .select("delay_minutes, updated_at")
      .eq("clinic_id", context.clinicId)
      .eq("doctor_id", context.doctor.id)
      .eq("service_day", day)
      .maybeSingle(),
    context.db.from("appointments")
      .select("id, patient_name, arrival_signal, arrival_signal_at")
      .eq("clinic_id", context.clinicId)
      .eq("doctor_id", context.doctor.id)
      .is("voided_at", null)
      .in("status", ["pending", "confirmed"])
      .not("arrival_signal", "is", null)
      .gte("appointment_at", dayStart)
      .lt("appointment_at", dayEnd)
      .order("appointment_at", { ascending: true })
      .limit(100),
  ]);

  return NextResponse.json({
    clinicId: context.clinicId,
    doctorId: context.doctor.id,
    doctorName: context.doctor.name,
    day,
    isToday: true,
    delayMinutes: flow?.delay_minutes ?? null,
    timingUpdatedAt: flow?.updated_at ?? null,
    signals: Array.isArray(signals) ? signals.map((row: any) => ({
      appointmentId: row.id,
      patientName: row.patient_name,
      signal: row.arrival_signal,
      updatedAt: row.arrival_signal_at,
    })) : [],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const clinicId = typeof body.clinicId === "string" ? body.clinicId : null;
  const doctorId = typeof body.doctorId === "string" ? body.doctorId : null;
  const delayMinutes = Number(body.delayMinutes);
  if ((clinicId && !uuidPattern.test(clinicId)) || (doctorId && !uuidPattern.test(doctorId)) || !allowedDelays.has(delayMinutes)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const context = await flowContext(clinicId, doctorId);
  if (!context) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  if (doctorId && doctorId !== context.doctor.id) return NextResponse.json({ error: "doctor_forbidden" }, { status: 403 });

  const today = baghdadDate.format(new Date());
  const { data, error } = await context.db.from("doctor_day_flow")
    .upsert({
      clinic_id: context.clinicId,
      doctor_id: context.doctor.id,
      service_day: today,
      delay_minutes: delayMinutes,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id,doctor_id,service_day" })
    .select("delay_minutes, updated_at")
    .maybeSingle();
  if (error || !data) {
    console.error("Atlas clinic timing update failed", { code: error?.code ?? "not_saved" });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({
    clinicId: context.clinicId,
    doctorId: context.doctor.id,
    delayMinutes: data.delay_minutes,
    timingUpdatedAt: data.updated_at,
  }, { headers: { "Cache-Control": "no-store" } });
}
