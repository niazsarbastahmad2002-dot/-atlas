import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Atlas Local uses explicit receptionist status language instead of ambiguous waiting words", () => {
  const polish = source("public/atlas-local-polish.js");
  assert.match(polish, /Attendance not confirmed/);
  assert.match(polish, /Attendance confirmed/);
  assert.match(polish, /Arrived — waiting at clinic/);
  assert.match(polish, /هێشتا هاتن پشتڕاست نەکراوە/);
  assert.match(polish, /هاتن پشتڕاستکراوە/);
  assert.match(polish, /گەیشتووە کلینیک، چاوەڕوانە/);
  assert.match(polish, /الحضور غير مؤكد بعد/);
  assert.match(polish, /وصل للعيادة وينتظر/);
});

test("Atlas Local queue numbers only patients physically waiting at the clinic", () => {
  const polish = source("public/atlas-local-polish.js");
  assert.match(polish, /function queueMap\(rows\)/);
  assert.match(polish, /appointment\.status === "waiting"/);
  assert.doesNotMatch(polish, /\.filter\(\(appointment\) => ACTIVE\.has\(appointment\.status\)\)/);
  assert.match(polish, /queueNumber\.classList\.add\("queue-empty"\)/);
});

test("Atlas Local supports manual phone confirmation without adding automatic online messaging", () => {
  const polish = source("public/atlas-local-polish.js");
  const local = [
    source("public/atlas-local-copy.js"),
    source("public/atlas-local-base.js"),
    source("public/atlas-local-core.js"),
    polish,
    source("public/atlas-local-app.js"),
    source("public/atlas-local-after.js"),
  ].join("\n");
  assert.match(polish, /function localPhoneHref\(value\)/);
  assert.match(polish, /return `tel:\$\{normalized\}`/);
  assert.match(polish, /callPatientTitle/);
  assert.doesNotMatch(local, /sms:|whatsapp|graph\.facebook|sendMessage|sendSms/i);
  assert.doesNotMatch(local, /fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test("Atlas Local workflow upgrade refreshes installed offline copies", () => {
  const worker = source("public/atlas-sw.js");
  assert.match(worker, /const ATLAS_OFFLINE_CACHE = "atlas-offline-shell-v11"/);
  assert.match(worker, /"\/atlas-local-polish\.js"/);
  assert.match(worker, /"\/atlas-local-responsive\.js"/);
});
