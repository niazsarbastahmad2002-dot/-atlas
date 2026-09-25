import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pg_net follows Supabase's documented non-relocatable extension move", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260925133000_move_pg_net_extension_metadata.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /create schema if not exists extensions/);
  assert.match(migration, /drop extension if exists pg_net/);
  assert.match(migration, /create extension pg_net with schema extensions/);
  assert.doesNotMatch(migration, /alter extension pg_net set schema/i);
  assert.doesNotMatch(migration, /cascade/i);
});
