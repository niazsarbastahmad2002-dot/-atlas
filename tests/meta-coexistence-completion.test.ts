import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { completeMetaCoexistence } from "../lib/reminders/meta-coexistence-completion.ts";

const config = {
  appId: "123456789012345",
  appSecret: "meta-app-secret-long-enough-for-tests",
  graphApiVersion: "v25.0",
};

const input = {
  code: "AQD-test-embedded-signup-code-1234567890",
  wabaId: "1553173296558731",
  phoneNumberId: "987654321012345",
  businessId: "123456789012345",
};

test("Meta coexistence completion exchanges the code, verifies the number, and subscribes the app", async () => {
  const calls: string[] = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    const value = String(url);
    calls.push(`${init?.method ?? "GET"} ${value}`);
    if (value.includes("/oauth/access_token")) {
      return Response.json({ access_token: "EAAB-business-token-that-is-long-enough-1234567890" });
    }
    if (value.includes("/phone_numbers")) {
      return Response.json({ data: [{
        id: input.phoneNumberId,
        display_phone_number: "+964 751 896 1148",
        verified_name: "Atlas Clinic Platform",
        quality_rating: "GREEN",
        name_status: "APPROVED",
      }] });
    }
    if (value.endsWith(`/${input.wabaId}/subscribed_apps`)) {
      assert.equal(init?.method, "POST");
      return Response.json({ success: true });
    }
    return Response.json({ error: { code: 100 } }, { status: 400 });
  };

  const result = await completeMetaCoexistence(input, config, fakeFetch);
  assert.equal(result.connected, true);
  if (!result.connected) return;
  assert.equal(result.displayPhoneNumber, "+964 751 896 1148");
  assert.equal(result.verifiedName, "Atlas Clinic Platform");
  assert.equal(calls.length, 3);
  assert.match(calls[0], /oauth\/access_token/);
  assert.match(calls[1], /phone_numbers/);
  assert.match(calls[2], /subscribed_apps/);
});

test("Meta coexistence completion discovers the single real sender when session info omits the phone ID", async () => {
  const realPhoneId = "222222222222222";
  const fakeFetch: typeof fetch = async (url) => {
    const value = String(url);
    if (value.includes("/oauth/access_token")) {
      return Response.json({ access_token: "EAAB-business-token-that-is-long-enough-1234567890" });
    }
    if (value.includes("/phone_numbers")) {
      return Response.json({ data: [
        {
          id: "111111111111111",
          display_phone_number: "+1 (555) 376-1113",
          verified_name: "Atlas Test",
        },
        {
          id: realPhoneId,
          display_phone_number: "+964 751 896 1148",
        },
      ] });
    }
    if (value.endsWith(`/${input.wabaId}/subscribed_apps`)) {
      return Response.json({ success: true });
    }
    throw new Error("unexpected request");
  };

  const result = await completeMetaCoexistence({ ...input, phoneNumberId: null }, config, fakeFetch);
  assert.equal(result.connected, true);
  if (!result.connected) return;
  assert.equal(result.phoneNumberId, realPhoneId);
  assert.equal(result.displayPhoneNumber, "+964 751 896 1148");
  assert.equal(result.verifiedName, null);
});

test("Meta coexistence completion refuses ambiguous WABA-only sender discovery", async () => {
  const fakeFetch: typeof fetch = async (url) => {
    const value = String(url);
    if (value.includes("/oauth/access_token")) {
      return Response.json({ access_token: "EAAB-business-token-that-is-long-enough-1234567890" });
    }
    if (value.includes("/phone_numbers")) {
      return Response.json({ data: [
        { id: "111111111111111", display_phone_number: "+964 750 000 0001" },
        { id: "222222222222222", display_phone_number: "+964 750 000 0002" },
      ] });
    }
    throw new Error("subscribe must not be reached for ambiguous phones");
  };

  const result = await completeMetaCoexistence({ ...input, phoneNumberId: null }, config, fakeFetch);
  assert.deepEqual(result, { connected: false, errorCode: "phone_selection_required" });
});

test("Meta coexistence completion rejects the historical Meta sandbox sender", async () => {
  const fakeFetch: typeof fetch = async (url) => {
    const value = String(url);
    if (value.includes("/oauth/access_token")) {
      return Response.json({ access_token: "EAAB-business-token-that-is-long-enough-1234567890" });
    }
    if (value.includes("/phone_numbers")) {
      return Response.json({ data: [{
        id: input.phoneNumberId,
        display_phone_number: "+1 (555) 376-1113",
        verified_name: "Atlas Clinic Platform",
      }] });
    }
    throw new Error("subscribe must not be reached for a test sender");
  };

  const result = await completeMetaCoexistence(input, config, fakeFetch);
  assert.deepEqual(result, { connected: false, errorCode: "test_sender_number" });
});

test("Meta coexistence completion refuses mismatched WABA phone numbers", async () => {
  const fakeFetch: typeof fetch = async (url) => {
    const value = String(url);
    if (value.includes("/oauth/access_token")) {
      return Response.json({ access_token: "EAAB-business-token-that-is-long-enough-1234567890" });
    }
    if (value.includes("/phone_numbers")) {
      return Response.json({ data: [{ id: "111111111111111", display_phone_number: "+964 750 000 0000", verified_name: "Other" }] });
    }
    throw new Error("subscribe must not be reached for a mismatched phone");
  };

  const result = await completeMetaCoexistence(input, config, fakeFetch);
  assert.deepEqual(result, { connected: false, errorCode: "phone_not_in_waba" });
});

test("Completion endpoint stores the business token server-side and never returns it", () => {
  const route = readFileSync("app/api/whatsapp/onboarding/complete/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260820182148_store_meta_coexistence_connections.sql", "utf8");

  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /membership\?\.role === "owner"/);
  assert.match(route, /membership\?\.role === "manager"/);
  assert.match(route, /validOptionalId\(body\.phoneNumberId\)/);
  assert.match(route, /store_meta_whatsapp_connection/);
  assert.match(route, /p_access_token: completion\.accessToken/);
  assert.doesNotMatch(route, /accessToken: completion\.accessToken/);

  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /vault\.update_secret/);
  assert.match(migration, /vault\.decrypted_secrets/);
  assert.match(migration, /grant execute on function public\.store_meta_whatsapp_connection[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.store_meta_whatsapp_connection[\s\S]*authenticated/);
});
