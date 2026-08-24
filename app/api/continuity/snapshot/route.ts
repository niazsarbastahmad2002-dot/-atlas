import { NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import { baghdadDate } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
const snapshotStatuses = new Set<SnapshotStatus>(["pending", "confirmed", "cancelled", "completed", "no_show"]);

function shiftBaghdadDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return baghdadDate.format(date);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ clear: true }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, owner_id")
    .order("created_at", { ascending: true });
  if (clinicsError) {
    return NextResponse.json({ error: "snapshot_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!clinics?.length) {
    return NextResponse.json({ clear: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  const requestedClinicId = url.searchParams.get("clinic");
  const requestedDoctorId = url.searchParams.get("doctor");
  const clinic = requestedClinicId && isUuid(requestedClinicId)
    ? clinics.find((candidate) => candidate.id === requestedClinicId) ?? clinics[0]
    : clinics[0];

  const now = new Date();
  const today = baghdadDate.format(now);
  const dayStart = new Date(`${today}T00:00:00+03:00`).toISOString();
  const dayEnd = new Date(`${shiftBaghdadDay(today, 1)}T00:00:00+03:00`).toISOString();

  const [
    { data: membership, error: membershipError },
    { data: appointments, error: appointmentError },
    { data: doctors, error: doctorsError },
  ] = await Promise.all([
    supabase.from("clinic_members")
      .select("role, assigned_doctor_id")
      .eq("clinic_id", clinic.id)
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase.from("appointments")
      .select("id, patient_name, doctor_id, doctor_name, appointment_at, created_at, status")
      .eq("clinic_id", clinic.id)
      .is("voided_at", null)
      .gte("appointment_at", dayStart)
      .lt("appointment_at", dayEnd)
      .order("appointment_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(500),
    supabase.from("doctors")
      .select("id, name, active, display_order")
      .eq("clinic_id", clinic.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (membershipError || appointmentError || doctorsError) {
    return NextResponse.json({ error: "snapshot_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const rows = appointments ?? [];
  const activeDoctors = (doctors ?? []).filter((doctor) => doctor.active);
  const canMonitorDoctors = clinic.owner_id === userData.user.id
    || membership?.role === "owner"
    || membership?.role === "manager";
  const multiDoctor = canMonitorDoctors && activeDoctors.length > 1;
  const selectedDoctor = multiDoctor
    ? activeDoctors.find((doctor) => doctor.id === requestedDoctorId && isUuid(requestedDoctorId ?? ""))
      ?? activeDoctors.find((doctor) => rows.some((row) => row.doctor_id === doctor.id))
      ?? activeDoctors[0]
    : activeDoctors[0] ?? null;
  const visibleRows = multiDoctor && selectedDoctor
    ? rows.filter((row) => row.doctor_id === selectedDoctor.id)
    : rows;

  let queueOrder = 0;
  const appointmentsForSnapshot = visibleRows.flatMap((appointment) => {
    if (!snapshotStatuses.has(appointment.status as SnapshotStatus)) return [];
    const active = appointment.status === "pending" || appointment.status === "confirmed";
    if (active) queueOrder += 1;
    return [{
      id: appointment.id,
      patientName: appointment.patient_name,
      appointmentAt: appointment.appointment_at,
      doctorName: appointment.doctor_name,
      status: appointment.status as SnapshotStatus,
      queueOrder: active ? queueOrder : null,
    }];
  });

  return NextResponse.json({
    clear: false,
    snapshot: {
      version: 1 as const,
      userId: userData.user.id,
      clinicId: clinic.id,
      clinicName: clinic.name,
      day: today,
      doctorId: selectedDoctor?.id ?? null,
      doctorName: selectedDoctor?.name ?? null,
      syncedAt: now.toISOString(),
      appointments: appointmentsForSnapshot,
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
