import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/care/[clinicSlug]/page.tsx", import.meta.url),
  "utf8",
);

test("public clinic visiting directions require the published exact address, not only city or area", () => {
  assert.match(page, /const directionsDestination = clinic\.address_text/);
  assert.match(page, /\[clinic\.address_text, clinic\.area, clinic\.city, clinic\.country_code\]/);
  assert.match(page, /const directionsUrl = directionsDestination/);
  assert.match(page, /directionsUrl \?/);
  assert.match(page, /clinic\.address_text \? <bdi>\{clinic\.address_text\}<\/bdi> :/);
  assert.match(page, /copy\.noAddress/);
});

test("public clinic directions never expose a potentially stale coordinate pin", () => {
  assert.doesNotMatch(page, /const hasMapPin/);
  assert.doesNotMatch(page, /const mapUrl/);
  assert.doesNotMatch(page, /https:\/\/www\.google\.com\/maps\/search\//);
  assert.doesNotMatch(page, /className="button button-ghost atlas-clinic-map-link"/);
});

test("address-based directions links remain encoded and safely opened in a new tab", () => {
  assert.match(page, /https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(page, /new URLSearchParams\(\{ api: "1", destination: directionsDestination \}\)/);
  assert.doesNotMatch(page, /GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS|maps\/api\/js/);
  assert.match(page, /target="_blank" rel="noreferrer"/);
  assert.match(page, /atlas-clinic-directions-link\{display:inline-flex;width:fit-content;min-height:48px/);
  assert.match(page, /@media\(max-width:560px\)\{[^\n]*atlas-care-clinic-visit-actions\{display:grid/);
});

test("clinic visit information stays on public published-profile RPCs, not private clinic tables", () => {
  assert.match(page, /supabase\.rpc\("get_public_clinic_profile"/);
  assert.match(page, /supabase\.rpc\("list_public_doctors"/);
  assert.match(page, /if \(clinicError \|\| doctorsError \|\| !clinic\) return <Unavailable/);
  assert.match(page, /doctors\.map\(\(doctor\) =>/);
  assert.doesNotMatch(page, /supabase\.from\("clinics"\)|supabase\.from\("doctors"\)/);
});

test("address, district, city, phone, and publication notice are present in all four languages", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) {
    assert.match(page, new RegExp(`\\b${locale}: \\{`));
  }
  for (const key of ["visit", "address", "area", "city", "noAddress", "locationNotice", "map", "call"]) {
    const matches = page.match(new RegExp(`^    ${key}: \"`, "gm")) ?? [];
    assert.equal(matches.length, 4, `Missing ${key} translation`);
  }
  assert.match(page, /lang=\{meta\.language\} dir=\{meta\.direction\}/);
  assert.match(page, /<bdi>\{clinic\.area\}<\/bdi>/);
  assert.match(page, /<bdi>\{clinic\.city\}<\/bdi>/);
});
