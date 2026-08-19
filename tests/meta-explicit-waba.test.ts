import assert from "node:assert/strict";
import test from "node:test";
import { withExplicitMetaWabaCandidate } from "../lib/reminders/meta-explicit-waba.ts";

const wabaId = "1553173296558731";

function debugFetch(scopes: string[]) {
  return (async () => Response.json({
    data: {
      is_valid: true,
      scopes,
      granular_scopes: [],
    },
  })) as typeof fetch;
}

test("explicit WABA is added only as a candidate when WhatsApp management scope is genuinely present", async () => {
  const wrapped = withExplicitMetaWabaCandidate(
    wabaId,
    debugFetch(["whatsapp_business_management", "whatsapp_business_messaging"]),
  );
  const response = await wrapped("https://graph.facebook.com/v23.0/debug_token");
  const body = await response.json() as any;

  assert.deepEqual(body.data.granular_scopes, [{
    scope: "whatsapp_business_management",
    target_ids: [wabaId],
  }]);
});

test("explicit WABA cannot manufacture a missing WhatsApp management permission", async () => {
  const wrapped = withExplicitMetaWabaCandidate(
    wabaId,
    debugFetch(["whatsapp_business_messaging"]),
  );
  const response = await wrapped("https://graph.facebook.com/v23.0/debug_token");
  const body = await response.json() as any;

  assert.deepEqual(body.data.granular_scopes, []);
});

test("invalid WABA identifiers are ignored", async () => {
  const original = debugFetch(["whatsapp_business_management"]);
  assert.equal(withExplicitMetaWabaCandidate("not-an-id", original), original);
});
