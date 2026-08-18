import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const appointmentIntervals = new Set([5, 10, 15, 20, 30]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = typeof body === "object" && body ? body as Record<string, unknown> : {};
  const clinicId = String(payload.clinicId ?? "");
  const interval = Number(payload.appointmentIntervalMinutes);
  if (!isUuid(clinicId) || !appointmentIntervals.has(interval)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const [{ data: clinic }, { data: membership }] = await Promise.all([
    supabase.from("clinics").select("id, owner_id").eq("id", clinicId).maybeSingle(),
    supabase.from("clinic_members").select("role").eq("clinic_id", clinicId).eq("user_id", userData.user.id).maybeSingle(),
  ]);

  const canManage = clinic
    && (clinic.owner_id === userData.user.id || membership?.role === "owner" || membership?.role === "manager");
  if (!canManage) return NextResponse.json({ ok: false }, { status: 403 });

  const { data, error } = await supabase
    .from("clinics")
    .update({ appointment_interval_minutes: interval })
    .eq("id", clinicId)
    .select("appointment_interval_minutes")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ ok: false }, { status: 409 });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return NextResponse.json(
    { ok: true, appointmentIntervalMinutes: data.appointment_interval_minutes },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
