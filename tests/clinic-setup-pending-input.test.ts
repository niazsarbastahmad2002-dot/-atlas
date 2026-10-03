import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("first clinic name stays fixed while clinic creation is pending", () => {
  const page = read("app/dashboard/page.tsx");
  const input = read("app/dashboard/clinic-setup-name-input.tsx");

  assert.match(page, /import \{ ClinicSetupNameInput \} from "\.\/clinic-setup-name-input"/);
  assert.match(page, /<ClinicSetupNameInput id="name" name="name"/);
  assert.match(input, /useFormStatus\(\)/);
  assert.match(input, /disabled=\{disabled \|\| pending\}/);
  assert.match(input, /aria-busy=\{pending \|\| undefined\}/);
});
