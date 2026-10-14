"use client";

import { useRouter } from "next/navigation";
import type { UiLocale } from "@/lib/i18n/ui";
import { guideCopy } from "./complaint-copy";
import { usePatientComplaintFlow } from "./flow-context";

// Page 04 owns this one-question step. No symptom is sent to the server,
// persisted, placed in a URL, or used to declare a patient clinically safe.
export function ShortSymptomQuestions({ locale, name, concern }: { locale: UiLocale; name: string; concern: string }) {
  const router = useRouter();
  const copy = guideCopy[locale];
  const flow = usePatientComplaintFlow();
  const warningReported = flow.emergencyAnswer === "yes" || flow.emergencyAnswer === "unsure";
  const answers = [
    { value: "yes" as const, label: copy.riskYes },
    { value: "no" as const, label: copy.riskNo },
    { value: "unsure" as const, label: copy.riskUnsure },
  ];

  return (
    <>
      <p className="atlas-complaint-selected"><bdi>{name}</bdi></p>
      <p className="atlas-complaint-emergency-short" role="note">{copy.globalDanger}</p>
      <div className="atlas-complaint-question">
        <h2>{copy.riskTitle}</h2>
        <p id="atlas-patient-risk-question">{concern}</p>
        <div className="atlas-complaint-answers" role="group" aria-labelledby="atlas-patient-risk-question">
          {answers.map((answer) => (
            <button
              key={answer.value}
              type="button"
              className={flow.emergencyAnswer === answer.value ? "is-selected" : ""}
              aria-pressed={flow.emergencyAnswer === answer.value}
              onClick={() => flow.answerEmergency(answer.value)}
            >
              {answer.label}
            </button>
          ))}
        </div>
      </div>
      {warningReported ? (
        <div className="atlas-complaint-alert" role="alert">
          <h2>{copy.emergencyTitle}</h2>
          <p>{copy.emergencyHelp}</p>
          <strong>{copy.emergencyAction}</strong>
        </div>
      ) : (
        <div className="atlas-complaint-next">
          {flow.emergencyAnswer === "no"
            ? <p className="atlas-complaint-no-clearance" role="note">{copy.riskNoWarning}</p>
            : <p>{copy.riskUnanswered}</p>}
          <button
            className="button atlas-complaint-main-action"
            type="button"
            disabled={flow.emergencyAnswer !== "no"}
            onClick={() => router.push(`/care/complaints/specialties?lang=${locale}`)}
          >
            {copy.next} <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
      <button
        className="atlas-complaint-text-button"
        type="button"
        onClick={() => { flow.reset(); router.push(`/care/complaints?lang=${locale}`); }}
      >
        {copy.breadcrumb[0]}
      </button>
    </>
  );
}
