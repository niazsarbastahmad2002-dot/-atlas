import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("public clinic directions require a specific published address", () => {
  assert.match(page, /const directionsDestination = clinic\.address_text/);
  assert.match(page, /\[clinic\.address_text, clinic\.area, clinic\.city\]/);
  assert.match(page, /directionsUrl \?/);
  assert.doesNotMatch(page, /latitude|longitude/);
});

test("public clinic directions use a no-key Maps URL and safe external link", () => {
  assert.match(page, /https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(page, /new URLSearchParams\(\{ api: "1", destination: directionsDestination \}\)/);
  assert.doesNotMatch(page, /GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS|maps\/api\/js/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer"/);
});

test("public clinic directions keep a mobile-friendly touch target", () => {
  assert.match(page, /atlas-clinic-directions-link\{display:inline-flex;width:fit-content;min-height:48px/);
});
