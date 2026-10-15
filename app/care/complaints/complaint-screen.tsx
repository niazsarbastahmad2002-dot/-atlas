"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/lib/i18n/ui";
import { uiLocaleMeta } from "@/lib/i18n/ui";
import { complaintCategories, findComplaint, searchComplaints, type ComplaintId } from "@/lib/patient/complaint-guide";
import { AtlasPatientNav } from "@/app/care/patient-nav";
import { guideCopy } from "./complaint-copy";
import { ShortSymptomQuestions } from "./short-symptom-questions";
import { usePatientComplaintFlow } from "./flow-context";
import { SuggestedSpecialtyCards } from "./specialties/suggested-specialty-cards";
import "./complaint-screen.css";

type Step = "choose" | "questions" | "specialties";

function href(path: string, locale: UiLocale) {
  return `${path}?lang=${locale}`;
}

export function ComplaintScreen({ locale, step, publishedSpecialties = [] }: { locale: UiLocale; step: Step; publishedSpecialties?: readonly string[] }) {
  const router = useRouter();
  const copy = guideCopy[locale];
  const meta = uiLocaleMeta[locale];
  const flow = usePatientComplaintFlow();
  const [term, setTerm] = useState("");
  const selected = flow.complaint ? findComplaint(flow.complaint) : null;
  const match = searchComplaints(term, locale);
  const currentIndex = step === "choose" ? 0 : step === "questions" ? 1 : 2;

  const showRecovery = step !== "choose" && !selected;
  const riskPositive = flow.emergencyAnswer === "yes" || flow.emergencyAnswer === "unsure";
  const notCleared = step === "specialties" && flow.emergencyAnswer !== "no";
  const title = step === "choose" ? copy.chooseTitle : step === "questions" ? copy.questionsTitle : copy.specialtyTitle;
  const help = step === "choose" ? copy.chooseHelp : step === "questions" ? copy.questionHelp : copy.specialtyHelp;

  function select(id: ComplaintId) {
    flow.chooseComplaint(id);
    router.push(href("/care/complaints/questions", locale));
  }

  return (
    <main className="marketing-page atlas-complaint-page" lang={meta.language} dir={meta.direction}>
      <AtlasPatientNav locale={locale} myAppointments={copy.appointments} />
      <div className="shell atlas-complaint-shell">
        <div className="atlas-complaint-toplinks">
          <Link href={href("/care", locale)}>{copy.back}</Link>
          <Link href={href("/care", locale)}>{copy.directSearch} <span aria-hidden="true">↗</span></Link>
        </div>
        <section className="atlas-complaint-panel" aria-labelledby="atlas-complaint-heading">
          <nav className="atlas-complaint-steps" aria-label="Discovery steps">
            {copy.breadcrumb.map((label, index) => (
              <span key={label} className={index === currentIndex ? "is-current" : ""} aria-current={index === currentIndex ? "step" : undefined}>
                <small>{index + 1}</small>{label}
              </span>
            ))}
          </nav>
          <div className="atlas-complaint-intro">
            <span className="eyebrow">Atlas Patient</span>
            <h1 id="atlas-complaint-heading">{showRecovery ? copy.notFound : title}</h1>
            {!showRecovery ? <p>{help}</p> : null}
          </div>

          {step === "choose" ? (
            <>
              <label className="atlas-complaint-search">
                <span>{copy.searchLabel}</span>
                <input type="search" dir="auto" value={term} onChange={(event) => setTerm(event.target.value)} placeholder={copy.searchPlaceholder} autoComplete="off" maxLength={80} />
              </label>
              <p className="atlas-complaint-emergency-short" role="note">{copy.globalDanger}</p>
              {match.length ? (
                <div className="atlas-complaint-groups">
                  {complaintCategories.map((category) => {
                    const choices = match.filter((entry) => entry.category === category.id);
                    if (!choices.length) return null;
                    return (
                      <section className="atlas-complaint-group" key={category.id} aria-labelledby={`atlas-complaint-category-${category.id}`}>
                        <h2 id={`atlas-complaint-category-${category.id}`}>{category.name[locale]}</h2>
                        <div className="atlas-complaint-grid">
                          {choices.map((entry) => (
                            <button className="atlas-complaint-choice" key={entry.id} type="button" onClick={() => select(entry.id)}>
                              <strong><bdi>{entry.name[locale]}</bdi></strong>
                              <span aria-hidden="true">›</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : <p className="atlas-complaint-empty" role="status">{copy.noMatch}</p>}
            </>
          ) : showRecovery ? (
            <Link className="button atlas-complaint-main-action" href={href("/care/complaints", locale)}>{copy.breadcrumb[0]}</Link>
          ) : step === "questions" && selected ? (
            <ShortSymptomQuestions locale={locale} name={selected.name[locale]} concern={selected.concern[locale]} />
          ) : notCleared ? (
            <>
              {riskPositive ? <div className="atlas-complaint-alert" role="alert"><h2>{copy.emergencyTitle}</h2><p>{copy.emergencyHelp}</p></div> : null}
              <Link className="button atlas-complaint-main-action" href={href("/care/complaints/questions", locale)}>{copy.breadcrumb[1]}</Link>
            </>
          ) : selected ? (
            <>
              <p className="atlas-complaint-selected"><bdi>{selected.name[locale]}</bdi></p>
              <p className="atlas-complaint-emergency-short" role="note">{copy.globalDanger}</p>
              <SuggestedSpecialtyCards
                locale={locale}
                specialtyKeys={selected.specialties}
                publishedSpecialties={publishedSpecialties}
              />
              <button className="atlas-complaint-text-button" type="button" onClick={() => { flow.reset(); router.push(href("/care/complaints", locale)); }}>{copy.breadcrumb[0]}</button>
            </>
          ) : null}
        </section>
        <aside className="atlas-complaint-safety">
          <strong>{copy.noDiagnosis}</strong>
          <p>{copy.emergencyHelp}</p>
          <p>{copy.reviewNote}</p>
        </aside>
        <Link className="atlas-complaint-bottom-link" href={href("/care", locale)}>{copy.directSearch}</Link>
      </div>
    </main>
  );
}
