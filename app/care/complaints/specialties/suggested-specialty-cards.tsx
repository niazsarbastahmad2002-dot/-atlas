"use client";

import { useState } from "react";
import Link from "next/link";
import type { UiLocale } from "@/lib/i18n/ui";
import {
  matchingPublishedSpecialties,
  specialtyLabels,
  type SpecialtyKey,
} from "@/lib/patient/complaint-guide";
import { guideCopy } from "../complaint-copy";
import { specialtyPageCopy, specialtyScope } from "./specialty-copy";

type Props = {
  locale: UiLocale;
  specialtyKeys: readonly SpecialtyKey[];
  publishedSpecialties: readonly string[];
};

// Page 05 presentation only. The complaint catalog owns the mapping and the
// question page owns safety answers; this component never evaluates either.
// Provider links require exact specialty labels from the existing public RPC.
export function SuggestedSpecialtyCards({ locale, specialtyKeys, publishedSpecialties }: Props) {
  const [comparedKey, setComparedKey] = useState<SpecialtyKey | null>(null);
  const copy = guideCopy[locale];
  const page = specialtyPageCopy[locale];

  return (
    <>
      {specialtyKeys.length > 1 ? <p className="atlas-complaint-compare-intro">{page.compareIntro}</p> : null}
      <div className="atlas-complaint-specialties">
        {specialtyKeys.map((key, index) => {
          const matches = matchingPublishedSpecialties(key, publishedSpecialties);
          const other = specialtyKeys.find((candidate) => candidate !== key);
          return (
            <article className={`atlas-complaint-specialty${comparedKey === key ? " is-compared" : ""}`} key={key}>
              <span>{index === 0 ? copy.firstStep : page.anotherOption}</span>
              <h2><bdi>{specialtyLabels[key].name[locale]}</bdi></h2>
              <div className="atlas-complaint-reason">
                <strong>{page.whyRelevant}</strong>
                <p>{specialtyScope[key][locale]}</p>
              </div>
              {matches.length ? matches.map((name) => (
                <Link
                  className="button atlas-complaint-provider-link"
                  href={`/care?lang=${locale}&specialty=${encodeURIComponent(name)}`}
                  key={name}
                >
                  {copy.doctors}: <bdi>{name}</bdi> <span aria-hidden="true">↗</span>
                </Link>
              )) : (
                <>
                  <p className="atlas-complaint-provider-note">{copy.noPublishedMatch}</p>
                  <Link className="button button-ghost" href={`/care?lang=${locale}`}>{copy.directSearch}</Link>
                </>
              )}
              {other ? (
                <button
                  className="atlas-complaint-compare-button"
                  type="button"
                  aria-expanded={comparedKey === other}
                  aria-controls="atlas-complaint-comparison"
                  onClick={() => setComparedKey((current) => current === other ? null : other)}
                >
                  {page.compareWith} <bdi>{specialtyLabels[other].name[locale]}</bdi>
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {specialtyKeys.length > 1 ? (
        <section
          className="atlas-complaint-comparison"
          id="atlas-complaint-comparison"
          aria-label={page.comparisonTitle}
          hidden={!comparedKey}
        >
          {comparedKey ? (
            <>
              <strong>{page.comparisonTitle}: <bdi>{specialtyLabels[comparedKey].name[locale]}</bdi></strong>
              <p>{specialtyScope[comparedKey][locale]}</p>
              <small>{page.compareSummary}</small>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
