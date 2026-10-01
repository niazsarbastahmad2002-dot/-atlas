import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("receptionist invite sharing falls back safely when native share or clipboard fails", () => {
  const source = readFileSync(
    new URL("../app/dashboard/staff/invite-link-form.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const \[shareError, setShareError\] = useState\(""/);
  assert.match(source, /await navigator\.clipboard\.writeText\(currentInviteUrl\)/);
  assert.match(source, /setShareError\(t\.copyFailed\)/);
  assert.match(source, /await navigator\.clipboard\.writeText\(currentInviteUrl\);\s*setShareError\(""\);\s*setCopied\(true\)/);
  assert.match(source, /async function shareLink\(\) \{[\s\S]*?setCopied\(false\);[\s\S]*?setShareError\(""\);/);
  assert.match(source, /error instanceof DOMException && error\.name === "AbortError"/);
  assert.match(source, /await copyLink\(\)/);
  assert.match(source, /title: t\.shareTitle, text: t\.shareText, url: currentInviteUrl/);
  assert.match(source, /بانگهێشتی کلینیکی Atlas/);
  assert.match(source, /بانگهێشتا کلینیکا Atlas/);
  assert.match(source, /دعوة عيادة Atlas/);
  assert.match(source, /expires in 24 hours/);
  assert.match(source, /role="alert"/);
  assert.match(source, /بەستەرەکە کۆپی نەکرا/);
  assert.match(source, /تعذر نسخ الرابط/);
});

test("receptionist invite links stay bound to the doctor selected when they were created", () => {
  const form = readFileSync(
    new URL("../app/dashboard/staff/invite-link-form.tsx", import.meta.url),
    "utf8",
  );
  const actions = readFileSync(
    new URL("../app/dashboard/staff/invite-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actions, /assignedDoctorId\?: string/);
  assert.match(actions, /assignedDoctorId: doctorId/);
  assert.match(form, /const \[selectedDoctorId, setSelectedDoctorId\] = useState\(""\)/);
  assert.match(form, /const currentInviteUrl = !pending && state\.assignedDoctorId === selectedDoctorId \? state\.url : undefined/);
  assert.match(form, /value=\{selectedDoctorId\}/);
  assert.match(form, /disabled=\{pending \|\| doctors\.length === 0\}/);
  assert.match(form, /setSelectedDoctorId\(event\.target\.value\)/);
  assert.match(form, /state\.status !== "success" \|\| currentInviteUrl/);
  assert.doesNotMatch(form, /navigator\.clipboard\.writeText\(state\.url\)/);
  assert.doesNotMatch(form, /url: state\.url/);
});

