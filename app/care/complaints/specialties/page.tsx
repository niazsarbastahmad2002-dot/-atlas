import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePatientLocale } from "@/app/care/patient-locale";
import { ComplaintScreen } from "../complaint-screen";

export const metadata: Metadata = {
  title: "Possible specialties — Atlas Patient (clinical review pending)",
  robots: { index: false, follow: false },
};

export default async function ComplaintSpecialties({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  if (process.env.ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED !== "true") notFound();
  const query = await searchParams;
  const locale = await resolvePatientLocale(query.lang);
  // Look up public, published-doctor specialty labels only. No complaint,
  // answer, identity, or private medical data is sent to the server.
  // This bounded sample is not an exhaustive provider catalogue.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_public_doctors_with_availability", {
    p_query: null,
    p_city: null,
    p_specialty: null,
    p_limit: 30,
    p_sort: "name",
  });
  const publishedSpecialties = error ? [] : Array.from(new Set(
    (data ?? []).map((doctor) => doctor.specialty?.trim()).filter((name): name is string => Boolean(name)),
  ));
  return <ComplaintScreen locale={locale} step="specialties" publishedSpecialties={publishedSpecialties} />;
}
