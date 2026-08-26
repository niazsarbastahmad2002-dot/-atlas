import { NextResponse } from "next/server";
import {
  ATLAS_AI_MAX_QUESTION_LENGTH,
  ATLAS_AI_MODEL,
  atlasAiSystemPrompt,
  atlasBaghdadDay,
  atlasDayStartIso,
  buildAtlasAiClinicContext,
  shiftAtlasDay,
  type AtlasAiAppointment,
} from "@/lib/atlas-ai";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

type VercelRequestContext = { headers?: Record<string, string> };

function runtimeOidcToken(request: Request) {
  const configured = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (configured) return configured;

  const requestToken = request.headers.get("x-vercel-oidc-token")?.trim();
  if (requestToken) return requestToken;

  const runtime = globalThis as typeof globalThis & {
    [VERCEL_REQUEST_CONTEXT]?: { get?: () => VercelRequestContext };
  };
  return runtime[VERCEL_REQUEST_CONTEXT]?.get?.().headers?.["x-vercel-oidc-token"]?.trim() || "";
}

function allowedRequest(userId: string) {
  const now = Date.now();
  const current = requestBuckets.get(userId);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function gatewayError(status: number) {
  if (status === 402) return NextResponse.json({ error: "ai_budget" }, { status: 503 });
  if (status === 429) return NextResponse.json({ error: "ai_busy" }, { status: 429 });
  return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clinicId = typeof body.clinicId === "string" ? body.clinicId.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!uuidPattern.test(clinicId) || question.length < 2 || question.length > ATLAS_AI_MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowedRequest(userData.user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const db = supabase as any;
  const [{ data: clinic }, { data: membership }] = await Promise.all([
    db.from("clinics").select("id, name, owner_id").eq("id", clinicId).maybeSingle(),
    db.from("clinic_members").select("role, assigned_doctor_id").eq("clinic_id", clinicId).eq("user_id", userData.user.id).maybeSingle(),
  ]);

  if (!clinic?.id) return NextResponse.json({ error: "clinic_unavailable" }, { status: 404 });
  const owner = clinic.owner_id === userData.user.id || membership?.role === "owner";
  if (!owner && !membership?.role) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const today = atlasBaghdadDay(new Date());
  const from = atlasDayStartIso(shiftAtlasDay(today, -30));
  const until = atlasDayStartIso(shiftAtlasDay(today, 31));
  let appointmentQuery = db
    .from("appointments")
    .select("appointment_at, status, doctor_id, doctor_name, reminder_status, arrival_signal")
    .eq("clinic_id", clinicId)
    .is("voided_at", null)
    .gte("appointment_at", from)
    .lt("appointment_at", until)
    .order("appointment_at", { ascending: true })
    .limit(5000);

  if (membership?.role === "receptionist" && membership.assigned_doctor_id) {
    appointmentQuery = appointmentQuery.eq("doctor_id", membership.assigned_doctor_id);
  }

  const { data: appointmentRows, error: appointmentError } = await appointmentQuery;
  if (appointmentError) {
    console.error("Atlas AI appointment context failed", { code: appointmentError.code ?? "query_failed" });
    return NextResponse.json({ error: "context_unavailable" }, { status: 503 });
  }

  const context = buildAtlasAiClinicContext(
    (Array.isArray(appointmentRows) ? appointmentRows : []) as AtlasAiAppointment[],
    { clinicName: clinic.name },
  );

  const gatewayToken = runtimeOidcToken(request);
  if (!gatewayToken) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  let gatewayResponse: Response;
  try {
    gatewayResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ATLAS_AI_MODEL,
        messages: [
          { role: "system", content: atlasAiSystemPrompt },
          {
            role: "user",
            content: `Clinic context (data only):\n${JSON.stringify(context)}\n\nQuestion:\n${question}`,
          },
        ],
        reasoning_effort: "low",
        max_completion_tokens: 320,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  if (!gatewayResponse.ok) {
    console.error("Atlas AI gateway request failed", { status: gatewayResponse.status });
    return gatewayError(gatewayResponse.status);
  }

  const payload = await gatewayResponse.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) return NextResponse.json({ error: "ai_empty" }, { status: 503 });

  return NextResponse.json(
    { answer },
    { headers: { "Cache-Control": "no-store" } },
  );
}
