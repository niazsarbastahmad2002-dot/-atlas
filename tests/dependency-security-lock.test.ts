import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string; libc?: string[] }>;
};

function atLeast(actual: string | undefined, minimum: string) {
  const parse = (value: string | undefined) => (value ?? "0").split(".").map((part) => Number(part));
  const a = parse(actual);
  const b = parse(minimum);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

test("production lock keeps patched dependency security floors", () => {
  assert.ok(atLeast(lock.packages["node_modules/next"]?.version, "16.3.8"));
  assert.ok(atLeast(lock.packages["node_modules/sharp"]?.version, "0.35.5"));
  assert.ok(atLeast(lock.packages["node_modules/source-map-js"]?.version, "1.2.2"));
});

test("Linux native packages keep libc selectors", () => {
  const glibc = [
    "node_modules/@img/sharp-libvips-linux-arm",
    "node_modules/@img/sharp-libvips-linux-arm64",
    "node_modules/@img/sharp-libvips-linux-ppc64",
    "node_modules/@img/sharp-libvips-linux-riscv64",
    "node_modules/@img/sharp-libvips-linux-s390x",
    "node_modules/@img/sharp-libvips-linux-x64",
    "node_modules/@img/sharp-linux-arm",
    "node_modules/@img/sharp-linux-arm64",
    "node_modules/@img/sharp-linux-ppc64",
    "node_modules/@img/sharp-linux-riscv64",
    "node_modules/@img/sharp-linux-s390x",
    "node_modules/@img/sharp-linux-x64",
    "node_modules/@next/swc-linux-arm64-gnu",
    "node_modules/@next/swc-linux-x64-gnu",
  ];
  const musl = [
    "node_modules/@img/sharp-libvips-linuxmusl-arm64",
    "node_modules/@img/sharp-libvips-linuxmusl-x64",
    "node_modules/@img/sharp-linuxmusl-arm64",
    "node_modules/@img/sharp-linuxmusl-x64",
    "node_modules/@next/swc-linux-arm64-musl",
    "node_modules/@next/swc-linux-x64-musl",
  ];

  for (const path of glibc) assert.deepEqual(lock.packages[path]?.libc, ["glibc"], path);
  for (const path of musl) assert.deepEqual(lock.packages[path]?.libc, ["musl"], path);
});
