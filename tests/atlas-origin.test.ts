import assert from "node:assert/strict";
import test from "node:test";
import { ATLAS_CANONICAL_ORIGIN, atlasPublicOrigin } from "../lib/atlas-origin.ts";

test("production Atlas links always use the canonical clinic domain", () => {
  assert.equal(
    atlasPublicOrigin({
      VERCEL_ENV: "production",
      SITE_URL: "https://atlasdemofixed.vercel.app/",
      VERCEL_PROJECT_PRODUCTION_URL: "atlasdemofixed.vercel.app",
    }),
    ATLAS_CANONICAL_ORIGIN,
  );
  assert.equal(ATLAS_CANONICAL_ORIGIN, "https://atlasclinic.dpdns.org");
});

test("non-production Atlas links keep explicit local or preview origins", () => {
  assert.equal(
    atlasPublicOrigin({ VERCEL_ENV: "preview", SITE_URL: "https://preview.example/" }),
    "https://preview.example",
  );
  assert.equal(
    atlasPublicOrigin({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "atlas-preview.vercel.app/" }),
    "https://atlas-preview.vercel.app",
  );
  assert.equal(atlasPublicOrigin({}), "http://localhost:3000");
});
