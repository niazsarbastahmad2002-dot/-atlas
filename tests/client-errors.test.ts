import assert from "node:assert/strict";
import test from "node:test";
import {
  createAtlasClientErrorGate,
  shouldTrackAtlasWindowError,
} from "../lib/analytics/client-errors.ts";

test("resource-load window errors are not counted as Atlas product failures", () => {
  assert.equal(shouldTrackAtlasWindowError({}), false);
  assert.equal(shouldTrackAtlasWindowError({ message: "" }), false);
  assert.equal(shouldTrackAtlasWindowError({ message: "Script error." }), false);
});

test("real JavaScript ErrorEvent diagnostics remain trackable", () => {
  assert.equal(shouldTrackAtlasWindowError({ message: "Unexpected failure", filename: "/_next/app.js" }), true);
  assert.equal(shouldTrackAtlasWindowError({ error: new Error("boom") }), true);
});

test("client error gate suppresses short duplicate storms without hiding later failures", () => {
  const allow = createAtlasClientErrorGate(5_000);
  assert.equal(allow("window", 10_000), true);
  assert.equal(allow("window", 12_000), false);
  assert.equal(allow("unhandled_rejection", 12_000), true);
  assert.equal(allow("window", 15_000), true);
});
