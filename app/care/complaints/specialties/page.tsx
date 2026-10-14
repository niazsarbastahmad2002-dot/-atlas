import type { Metadata } from "next";
import { resolvePatientLocale } from "@/app/care/patient-locale";
import { ComplaintScreen } from "../complaint-screen";

export const metadata: Metadata = {
  title: "Possible specialties — Atlas Patient (clinical review pending)",
  robots: { index: false, follow: false },
};

export default async function ComplaintSpecialties({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const query = await searchParams;
  const locale = await resolvePatientLocale(query.lang);
  return <ComplaintScreen locale={locale} step="specialties" />;
}
