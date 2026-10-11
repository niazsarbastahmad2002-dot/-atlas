import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientDirectoryCard, type PublicDoctorCard } from "@/app/care/patient-directory-card";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { resolvePatientLocale } from "@/app/care/patient-locale";
import { uiLocaleMeta } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas Patient — fictional visual test", robots: { index: false, follow: false } };

const fictitious: PublicDoctorCard[] = [
  { clinic_slug: "fictional-example-a", doctor_slug: "fictional-doctor-a", doctor_name: "Dr. Example A", specialty: "Orthopedics", clinic_name: "Example Clinic A", city: "Example City", area: "Example District" },
  { clinic_slug: "fictional-example-b", doctor_slug: "fictional-doctor-b", doctor_name: "Dr. Example B", specialty: "Family medicine", clinic_name: "Example Clinic B", city: "Example City" },
  { clinic_slug: "fictional-example-c", doctor_slug: "fictional-doctor-c", doctor_name: "Dr. Example C", specialty: "Pediatrics", clinic_name: "Example Clinic C", city: "Example City" },
];

export default async function FictionalPatientPreview({ searchParams }: { searchParams: Promise<{lang?: string | string[]}> }) {
  // Never serve fabricated directory records on an actual production deployment.
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const locale = await resolvePatientLocale(query.lang);
  const meta = uiLocaleMeta[locale];
  const timestamp = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ar-IQ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baghdad" }).format(new Date(Date.now() + 48 * 60 * 60 * 1000));
  return (
    <main className="marketing-page atlas-care-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} />
      <div className="shell" style={{maxWidth: 1120, paddingBlock: 24}}>
        <div role="note" style={{padding:16,borderRadius:16,background:"var(--warning-bg)",color:"var(--ink)",border:"1px solid var(--line)",fontWeight:750}}>
          FICTIONAL VISUAL TEST — NOT REAL DOCTORS, CLINICS, APPOINTMENTS OR AVAILABILITY. Preview-only; actions are disabled.
        </div>
        <h1 style={{marginBlock:"26px 8px",color:"var(--ink)"}}>Atlas Patient · Marketplace preview</h1>
        <p style={{color:"var(--muted)",marginBottom:24}}>Visual check for populated, unavailable, tablet and mobile cards.</p>
        <div className="atlas-care-results" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:16}}>
          {fictitious.map((doctor, index) => (
            <PatientDirectoryCard key={doctor.doctor_slug} doctor={doctor} locale={locale} nextOpening={index === 1 ? null : timestamp} preview />
          ))}
        </div>
        <section style={{marginTop:28,padding:24,background:"var(--surface)",border:"1px solid var(--line)",borderRadius:24}}>
          <h2 style={{margin:0}}>Fictional availability layout</h2>
          <p style={{color:"var(--muted)"}}>Example only. No schedule or booking database is connected.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
            {[1,2,3].map(day => <div key={day} style={{border:"1px solid var(--line)",borderRadius:16,padding:16,background:"var(--surface-soft)"}}>
              <strong>Example day {day}</strong>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                {["09:00","10:30","13:00"].map(time => <span key={time} style={{display:"inline-flex",alignItems:"center",minHeight:48,padding:"8px 14px",borderRadius:12,border:"1px solid var(--line-strong)"}}>{time}</span>)}
              </div>
            </div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
