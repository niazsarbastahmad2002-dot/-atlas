import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfig = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");

test("Meta test preview auto-enables the WhatsApp OTP client UI without weakening production gates", () => {
  assert.match(nextConfig, /ATLAS_WHATSAPP_MODE === "meta_test"/);
  assert.match(nextConfig, /VERCEL_ENV !== "production"/);
  assert.match(nextConfig, /NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED: "true"/);
  assert.match(nextConfig, /NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED: "true"/);
  assert.match(nextConfig, /metaTestPreview \? \{/);
});
