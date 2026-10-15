import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolvePatientLocale } from "@/app/care/patient-locale";
import { ComplaintScreen } from "./complaint-screen";

export const metadata: Metadata = {
  title: "Search by concern — Atlas Patient (clinical review pending)",
  robots: { index: false, follow: false },
};

export default async function ComplaintSelection({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  if (process.env.ATLAS_PATIENT_COMPLAINT_GUIDE_ENABLED !== "true") notFound();
  const query = await searchParams;
  const locale = await resolvePatientLocale(query.lang);
  return <ComplaintScreen locale={locale} step="choose" />;
}
