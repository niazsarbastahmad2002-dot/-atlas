import assert from "node:assert/strict";
import test from "node:test";
import { readSupabaseSendSmsHookValues } from "../lib/auth/send-sms-hook.ts";

test("hosted Supabase Send SMS Hook phone digits normalize back to E.164", () => {
  assert.deepEqual(readSupabaseSendSmsHookValues({
    user: { phone: "9647518961148" },
    sms: { otp: "561166", phone: "9647518961148" },
  }), {
    phone: "+9647518961148",
    otp: "561166",
  });
});
