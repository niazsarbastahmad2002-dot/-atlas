"use client";

let pendingCount = 0;
let pending = Promise.resolve();

export function queueSettingWrite(work: () => Promise<void>) {
  pendingCount += 1;
  const run = pending.catch(() => {}).then(work);
  pending = run.finally(() => {
    pendingCount = Math.max(0, pendingCount - 1);
  });
  return run;
}

export function hasPendingSettingWrite() {
  return pendingCount > 0;
}

export async function flushSettingWrites() {
  await pending.catch(() => {});
}
