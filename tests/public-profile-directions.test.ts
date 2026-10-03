import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of [
  "app/care/[clinicSlug]/page.tsx",
  "app/care/[clinicSlug]/[doctorSlug]/page.tsx",
]) {
  test(`${path} offers free directions only from a specific published address`, () => {
    const page = source(path);

    assert.match(page, /address_text/);
    assert.match(page, /https:\/\/www\.google\.com\/maps\/dir\//);
    assert.match(page, /new URLSearchParams\(\{ api: "1", destination: directionsDestination \}\)/);
    assert.match(page, /target="_blank"/);
    assert.match(page, /rel="noreferrer"/);
    assert.match(page, /atlas-care-directions\{min-height:48px/);
    assert.doesNotMatch(page, /GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS|maps\/api\/js/);
    assert.doesNotMatch(page, /navigator\.geolocation|geolocation/);
  });
}

test("city-only public profiles do not get a directions destination", () => {
  const clinic = source("app/care/[clinicSlug]/page.tsx");
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(clinic, /const directionsDestination = clinic\.address_text/);
  assert.match(doctor, /const directionsDestination = profile\.address_text/);
});
