import assert from "node:assert/strict";
import test from "node:test";
import { safeAuthDestination } from "../lib/navigation";

const token = "A".repeat(43);

test("allows dashboard and exact receptionist invite finish paths", () => {
  assert.equal(safeAuthDestination("/dashboard"), "/dashboard");
  assert.equal(safeAuthDestination(`/join/${token}/finish`), `/join/${token}/finish`);
});

test("rejects external and malformed auth destinations", () => {
  assert.equal(safeAuthDestination("https://evil.example"), "/dashboard");
  assert.equal(safeAuthDestination(`//evil.example/join/${token}/finish`), "/dashboard");
  assert.equal(safeAuthDestination(`/join/${"A".repeat(42)}/finish`), "/dashboard");
  assert.equal(safeAuthDestination(`/join/${token}/finish/extra`), "/dashboard");
  assert.equal(safeAuthDestination(null), "/dashboard");
});
