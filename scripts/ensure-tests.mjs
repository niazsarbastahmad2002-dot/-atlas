import { readdirSync } from "node:fs";

let files = [];
try {
  files = readdirSync("tests");
} catch {
  // Handled by the explicit failure below.
}

const tests = files.filter((file) => file.endsWith(".test.ts"));
if (tests.length === 0) {
  console.error("Atlas test guard failed: no tests/*.test.ts files were found.");
  process.exit(1);
}

console.log(`Atlas test guard: ${tests.length} test file(s) found.`);
