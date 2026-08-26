"use strict";

// Final Atlas Local hardening layer. It runs only after the local app has initialized.
// Everything here stays device-only; no network APIs or Atlas Online data are used.

// Keep archived doctors visible for old appointments, but prevent assigning new work to them.
const atlasLocalFillDoctorSelect = fillDoctorSelect;
fillDoctorSelect = function(select, includeAll = false, includeArchived = false) {
  atlasLocalFillDoctorSelect(select, includeAll, includeArchived);
  if (!includeArchived || !state) return;
  const inactive = new Set(state.doctors.filter((doctor) => !doctor.active).map((doctor) => doctor.id));
  [...select.options].forEach((option) => {
    if (inactive.has(option.value)) option.disabled = true;
  });
};

// iOS can suspend timers while the app is in the background. Re-check elapsed time
// before accepting the first tap after resume so auto-lock cannot be bypassed.
const atlasLocalLegacyTouchActivity = touchActivity;
["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  document.removeEventListener(eventName, atlasLocalLegacyTouchActivity);
});
function atlasLocalInactivityExpired() {
  return !!(state && state.autoLockMinutes && Date.now() - lastActivity >= state.autoLockMinutes * 60000);
}
function atlasLocalEnforceAutoLock() {
  if (!atlasLocalInactivityExpired()) return false;
  lockClinic();
  return true;
}
touchActivity = function() {
  if (atlasLocalEnforceAutoLock()) return;
  lastActivity = Date.now();
  scheduleAutoLock();
};
["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  document.addEventListener(eventName, touchActivity, { passive: true });
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !atlasLocalEnforceAutoLock()) scheduleAutoLock();
});
window.addEventListener("pageshow", () => {
  if (!atlasLocalEnforceAutoLock()) scheduleAutoLock();
});

// Force date controls to stay readable even when the surrounding Kurdish/Arabic UI is RTL.
["selected-day", "edit-day"].forEach((id) => {
  const input = el(id);
  if (!input) return;
  input.lang = "en-IQ";
  input.dir = "ltr";
});

// Build an in-app masked restore dialog. This replaces the browser prompt used by the
// legacy v2 implementation, so a clinic PIN is never typed into a plain-text prompt.
if (!el("restore-dialog")) {
  const dialog = document.createElement("dialog");
  dialog.id = "restore-dialog";
  dialog.innerHTML = `
    <form class="modal" id="restore-form">
      <div class="modal-head">
        <h2 data-t="restore"></h2>
        <button class="button secondary small" type="button" id="restore-close" aria-label="Close">×</button>
      </div>
      <p class="muted" data-t="restoreReplace"></p>
      <div class="field">
        <label data-t="restorePin" for="restore-pin"></label>
        <input id="restore-pin" type="password" inputmode="numeric" minlength="6" maxlength="12" pattern="[0-9]{6,12}" required autocomplete="off" />
      </div>
      <p class="notice error hidden" id="restore-error" role="alert"></p>
      <div class="settings-actions">
        <button class="button" type="submit" data-t="restore"></button>
      </div>
    </form>`;
  document.body.append(dialog);
}

let pendingRestoreFile = null;
async function openSafeRestore(file) {
  clearError("settings-error");
  clearError("restore-error");
  try {
    if (!file || file.size > 12 * 1024 * 1024) throw new Error("invalid_file");
    const value = JSON.parse(await file.text());
    if (!validBackup(value)) throw new Error("invalid_backup");
    pendingRestoreFile = value;
    el("restore-pin").value = "";
    applyLocale(locale);
    el("restore-dialog").showModal();
    setTimeout(() => el("restore-pin").focus(), 0);
  } catch {
    pendingRestoreFile = null;
    showError("settings-error", t("restoreFailed"));
  }
}
async function confirmSafeRestore(event) {
  event.preventDefault();
  clearError("restore-error");
  if (!pendingRestoreFile) return;
  const value = pendingRestoreFile;
  const pin = el("restore-pin").value;
  if (!/^\d{6,12}$/.test(pin)) return showError("restore-error", t("backupPinFormat"));
  try {
    const restoredKey = await deriveKey(pin, toBytes(value.meta.salt), Number(value.meta.iterations));
    let restoredState;
    try {
      restoredState = sanitizeState(await decryptState(restoredKey, value.payload));
    } catch {
      return showError("restore-error", t("wrongPin"));
    }
    if (!window.confirm(t("restoreReplace"))) return;
    const restoredMeta = {
      ...value.meta,
      id: META_ID,
      version: 3,
      locale: restoredState.locale,
      iterations: Number(value.meta.iterations),
      updatedAt: new Date().toISOString(),
    };
    const restoredPayload = await encryptState(restoredKey, restoredState);
    await writeRecords([restoredMeta, restoredPayload]);
    meta = restoredMeta;
    key = restoredKey;
    state = restoredState;
    locale = restoredState.locale;
    selectedDay = baghdadDay();
    pendingRestoreFile = null;
    el("restore-dialog").close();
    renderWorkspace();
    touchActivity();
    window.alert(t("restoreDone"));
  } catch {
    showError("restore-error", t("restoreFailed"));
  }
}
function cancelSafeRestore() {
  pendingRestoreFile = null;
  clearError("restore-error");
  el("restore-pin").value = "";
  if (el("restore-dialog").open) el("restore-dialog").close();
}

// Override the old restore handler immediately. The backup format remains encrypted and unchanged.
el("restore-file").onchange = () => {
  const file = el("restore-file").files && el("restore-file").files[0];
  if (file) void openSafeRestore(file);
  el("restore-file").value = "";
};
el("restore-form").addEventListener("submit", confirmSafeRestore);
el("restore-close").onclick = cancelSafeRestore;
