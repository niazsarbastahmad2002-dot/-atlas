import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_IOS_BUNDLE_ID,
  appleApplicationIdentifier,
  buildAppleAppSiteAssociation,
} from "../lib/apple-associated-domains.ts";

test("builds the Atlas iOS application identifier only from a valid Apple prefix", () => {
  assert.equal(ATLAS_IOS_BUNDLE_ID, "com.atlasappointments.app");
  assert.equal(appleApplicationIdentifier("ABCDE12345"), "ABCDE12345.com.atlasappointments.app");
  assert.equal(appleApplicationIdentifier("bad-prefix"), null);
  assert.equal(appleApplicationIdentifier(undefined), null);
});

test("universal links are limited to secure receptionist invitation paths", () => {
  const association = buildAppleAppSiteAssociation("ABCDE12345.com.atlasappointments.app");
  assert.deepEqual(association.applinks.details[0]?.appIDs, ["ABCDE12345.com.atlasappointments.app"]);
  assert.deepEqual(association.applinks.details[0]?.components.map((item) => item["/"]), ["/join/*"]);
});
