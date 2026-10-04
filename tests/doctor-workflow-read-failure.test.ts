import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/api/settings/doctor-workflow/route.ts", import.meta.url), "utf8");

test("doctor workflow does not turn failed settings reads into healthy defaults", () => {
  assert.match(source, /data: settings, error: settingsError/);
  assert.match(source, /data: provider, error: providerError/);
  assert.match(source, /if \(settingsError \|\| providerError\)/);
  assert.match(source, /status: 503/);
  assert.match(source, /error: "settings_unavailable"/);
  assert.ok(
    source.indexOf("if (settingsError || providerError)") < source.indexOf("messagingApproved: Boolean(provider?.messaging_approved_at)"),
    "read failures must stop before Atlas emits a false provider-approval state",
  );
});
