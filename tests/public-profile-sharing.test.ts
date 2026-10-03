import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public profile sharing uses clean public URLs and native share with copy fallback", () => {
  const share = source("app/care/share-profile-button.tsx");

  assert.match(share, /window\.location\.origin/);
  assert.match(share, /window\.location\.pathname/);
  assert.doesNotMatch(share, /window\.location\.search/);
  assert.match(share, /navigator\.share/);
  assert.match(share, /navigator\.clipboard\?\.writeText/);
  assert.match(share, /document\.execCommand\("copy"\)/);
});

test("public profile sharing can hand the same clean link to WhatsApp without provider integration", () => {
  const share = source("app/care/share-profile-button.tsx");

  assert.match(share, /https:\/\/wa\.me\/\?text=/);
  assert.match(share, /encodeURIComponent\(message\)/);
  assert.match(share, /noopener,noreferrer/);
  assert.doesNotMatch(share, /WHATSAPP_ACCESS_TOKEN|WHATSAPP_PHONE_NUMBER_ID|graph\.facebook\.com/);
});

test("doctor sharing metadata is derived only from the published public profile RPC", () => {
  const page = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");

  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /get_public_doctor_profile/);
  assert.match(page, /profile\.doctor_name/);
  assert.match(page, /profile\.clinic_name/);
  assert.match(page, /openGraph/);
  assert.match(page, /twitter/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /<ShareProfileButton/);
});

test("clinic sharing metadata is derived only from the published public clinic RPC", () => {
  const page = source("app/care/[clinicSlug]/page.tsx");

  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /get_public_clinic_profile/);
  assert.match(page, /clinic\.display_name/);
  assert.match(page, /clinic\.description/);
  assert.match(page, /openGraph/);
  assert.match(page, /twitter/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /<ShareProfileButton/);
});

test("share controls are localized for Atlas public care languages", () => {
  const doctor = source("app/care/[clinicSlug]/[doctorSlug]/page.tsx");
  const clinic = source("app/care/[clinicSlug]/page.tsx");

  for (const page of [doctor, clinic]) {
    assert.match(page, /Share on WhatsApp/);
    assert.match(page, /لە WhatsApp/);
    assert.match(page, /ل WhatsApp/);
    assert.match(page, /مشاركة على WhatsApp/);
  }
});
