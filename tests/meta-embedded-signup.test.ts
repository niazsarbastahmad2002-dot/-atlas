import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readMetaEmbeddedSignupReadiness } from "../lib/reminders/meta-embedded-signup.ts";

test("Meta Embedded Signup stays blocked until every coexistence prerequisite is configured", () => {
  const readiness = readMetaEmbeddedSignupReadiness({});
  assert.equal(readiness.configured, false);
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.mode, "coexistence");
  assert.ok(readiness.blockers.includes("embedded_signup_disabled"));
  assert.ok(readiness.blockers.includes("meta_app_id_missing"));
  assert.ok(readiness.blockers.includes("embedded_signup_config_missing"));
  assert.ok(readiness.blockers.includes("graph_api_version_missing"));
  assert.ok(readiness.blockers.includes("meta_app_secret_missing"));
});

test("Meta Embedded Signup readiness returns only safe browser configuration", () => {
  const secret = "meta-app-secret-never-return-this";
  const readiness = readMetaEmbeddedSignupReadiness({
    META_EMBEDDED_SIGNUP_ENABLED: "true",
    META_APP_ID: "123456789012345",
    META_EMBEDDED_SIGNUP_CONFIG_ID: "987654321098765",
    WHATSAPP_GRAPH_API_VERSION: "v25.0",
    WHATSAPP_APP_SECRET: secret,
  });

  assert.equal(readiness.configured, true);
  assert.equal(readiness.enabled, true);
  assert.equal(readiness.appId, "123456789012345");
  assert.equal(readiness.configId, "987654321098765");
  assert.equal(readiness.graphApiVersion, "v25.0");
  assert.deepEqual(readiness.blockers, []);
  assert.equal(JSON.stringify(readiness).includes(secret), false);
});

test("WhatsApp onboarding status is restricted to authenticated clinic administrators", () => {
  const source = readFileSync("app/api/whatsapp/onboarding/status/route.ts", "utf8");
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /membership\?\.role === "owner"/);
  assert.match(source, /membership\?\.role === "manager"/);
  assert.match(source, /return NextResponse\.json\(\{ error: "forbidden" \}, \{ status: 403 \}\)/);
  assert.doesNotMatch(source, /WHATSAPP_APP_SECRET.*NextResponse/);
  assert.doesNotMatch(source, /INFOBIP_API_KEY.*NextResponse/);
  assert.doesNotMatch(source, /D360_API_KEY.*NextResponse/);
});
