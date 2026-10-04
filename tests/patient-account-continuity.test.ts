import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/patient/[token]/page.tsx", import.meta.url),
  "utf8",
);

test("private appointment page links into My Appointments without leaking its token", () => {
  assert.match(
    page,
    /href=\{\`\/patient-account\?lang=\$\{locale\}\`\}/,
  );
  assert.doesNotMatch(
    page,
    /patient-account\?[^"'\`]*token|patient-account\/\$\{token\}/,
  );
});

test("patient account entry is translated across supported appointment locales", () => {
  assert.match(page, /myAppointments: "My appointments"/);
  assert.match(page, /myAppointments: "مەوعیدەکانم"/);
  assert.match(page, /myAppointments: "وادەیێن من"/);
  assert.match(page, /myAppointments: "مواعيدي"/);
});

test("patient account entry stays mobile-sized and preserves appointment privacy copy", () => {
  assert.match(page, /patient-account-entry/);
  assert.match(page, /min-height: 48px/);
  assert.match(page, /\{text\.privacy\}/);
});


test("My Appointments entry is shown only on verified self-booking continuity", () => {
  const finalize = readFileSync(
    new URL("../app/api/care/booking/finalize/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(finalize, /patientPath: \`\/patient\/\$\{patientToken\}\?lang=\$\{encodeURIComponent\(lang\)\}&account=1\`/);
  assert.match(page, /const accountOwned = query\.account === "1"/);
  assert.match(page, /\{accountOwned \? \([\s\S]*patient-account-entry/);
  assert.match(page, /patientLanguageHref\(token, option\.locale, reminderView, accountOwned\)/);
});
