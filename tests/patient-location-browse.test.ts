import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildPublishedLocationTree,
  normalizeLocationText,
  publishedCityLabel,
} from "../lib/patient-location-browse.ts";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const explore = read("app/explore/[kind]/page.tsx");
const locations = read("app/explore/patient-locations.tsx");
const library = read("lib/patient-location-browse.ts");

const published = [
  { city: "Erbil", area: "Ankawa", clinic_slug: "clinic-one", clinic_name: "Clinic One", doctor_slug: "dr-one", doctor_name: "Dr One" },
  { city: "Hawler", area: "Ankawa", clinic_slug: "clinic-one", clinic_name: "Clinic One", doctor_slug: "dr-two", doctor_name: "Dr Two" },
  { city: "Erbil", area: "Ankawa", clinic_slug: "clinic-one", clinic_name: "Clinic One", doctor_slug: "dr-one", doctor_name: "Dr One" },
  { city: "Erbil", area: null, clinic_slug: "clinic-two", clinic_name: "Clinic Two", doctor_slug: "dr-three", doctor_name: "Dr Three" },
  { city: "Duhok", area: "Center", clinic_slug: "clinic-three", clinic_name: "Clinic Three", doctor_slug: "dr-four", doctor_name: "Dr Four" },
];

test("city → published area → clinic → doctor comes exclusively from supplied public rows", () => {
  const cities = buildPublishedLocationTree(published);
  assert.equal(cities.length, 2);
  const erbil = cities.find((city) => city.key === "erbil");
  assert.ok(erbil);
  assert.equal(erbil.areas.length, 2);
  const area = erbil.areas.find((item) => item.name === "Ankawa");
  assert.ok(area);
  assert.equal(area.clinics.length, 1);
  assert.deepEqual(area.clinics[0].doctors.map((doctor) => doctor.slug), ["dr-one", "dr-two"]);
  assert.equal(erbil.areas.find((item) => item.name === null)?.clinics[0].slug, "clinic-two");
});

test("four-language city labels and conservative spelling variants do not invent city listings", () => {
  assert.equal(normalizeLocationText("  أَرْبِيل "), normalizeLocationText("اربيل"));
  assert.equal(normalizeLocationText("كركوك"), normalizeLocationText("کرکوک"));
  assert.equal(buildPublishedLocationTree([], "Hawler").length, 0);
  assert.equal(buildPublishedLocationTree(published, "هەولێر").length, 1);
  assert.equal(buildPublishedLocationTree(published, "Erbíl").length, 1);
  const erbil = buildPublishedLocationTree(published, "Arbil")[0];
  assert.equal(publishedCityLabel(erbil, "en"), "Erbil");
  assert.equal(publishedCityLabel(erbil, "ku"), "هەولێر");
  assert.equal(publishedCityLabel(erbil, "bd"), "هەولێر");
  assert.equal(publishedCityLabel(erbil, "ar"), "أربيل");
});

test("search stays within displayed public results and skips missing city or invalid profile URLs", () => {
  assert.equal(buildPublishedLocationTree(published, "Clinic Three")[0].key, "duhok");
  assert.equal(buildPublishedLocationTree(published, "No Real Match").length, 0);
  const unsafe = [
    { ...published[0], city: null },
    { ...published[0], clinic_slug: "../private" },
    { ...published[0], doctor_slug: "bad/id" },
  ];
  assert.deepEqual(buildPublishedLocationTree(unsafe), []);
});

test("page 17 uses the existing gated public search and keeps other explore pages", () => {
  assert.match(explore, /search_public_doctors_with_availability/);
  assert.match(explore, /p_limit: 30/);
  assert.match(explore, /kind === "locations" \? \(/);
  assert.match(explore, /<PatientLocationsExplore doctors=\{doctors\} locale=\{locale\}/);
  assert.match(explore, /kind === "clinics" \? clinics : kind === "specialties" \? specialties : cities/);
  assert.doesNotMatch(locations + library, /supabase|\.rpc\(|service_role|clinic_members|patient_phone/i);
});

test("location UI preserves language, clinic/doctor routes and accessible responsive affordances", () => {
  for (const name of ["en:", "ku:", "bd:", "ar:"]) assert.ok(locations.includes(name));
  assert.match(locations, /name="lang" value=\{locale\}/);
  assert.match(locations, /name="q" type="search"/);
  assert.match(locations, /patientLocaleHref\("\/explore\/locations", locale\)/);
  assert.match(locations, /patientLocaleHref\("\/care\/" \+ clinic\.slug, locale\)/);
  assert.match(locations, /patientLocaleHref\("\/care\/" \+ clinic\.slug \+ "\/" \+ doctor\.slug, locale\)/);
  assert.match(locations, /<bdi>\{publishedCityLabel\(city, locale\)\}<\/bdi>/);
  assert.match(locations, /<bdi>\{area\.name \?\? t\.unspecifiedArea\}<\/bdi>/);
  assert.match(locations, /@media\(max-width:700px\)/);
  assert.match(locations, /@media\(max-width:370px\)/);
  assert.match(locations, /focus-visible/);
  assert.match(locations, /min-height:48px/);
  assert.match(locations, /Atlas does not independently verify addresses/);
  assert.doesNotMatch(locations, /latitude|longitude|coordinates|maps\/dir|\/book|bookAppointment/i);
});
