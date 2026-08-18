"use client";

let pendingCount = 0;
let pending = Promise.resolve();
let freshNavigationRequired = false;

export function queueSettingWrite(work: () => Promise<void>) {
  pendingCount += 1;
  const run = pending.catch(() => {}).then(work);
  pending = run.then(() => {
    // Even after the database write finishes, Next may still hold a prefetched
    // Schedule/Settings response containing the old value. Keep this flag set
    // until the next real page load so navigation cannot resurrect stale data.
    freshNavigationRequired = true;
  }).finally(() => {
    pendingCount = Math.max(0, pendingCount - 1);
  });
  return run;
}

export function hasPendingSettingWrite() {
  return pendingCount > 0;
}

export function needsFreshSettingNavigation() {
  return freshNavigationRequired;
}

export async function flushSettingWrites() {
  await pending.catch(() => {});
}
