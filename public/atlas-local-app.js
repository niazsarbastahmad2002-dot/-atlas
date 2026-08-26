"use strict";
function openEdit(id) {
  const appointment = state.appointments.find((item) => item.id === id);
  if (!appointment) return;
  editingId = id;
  fillDoctorSelect(el("edit-doctor"), false, true);
  fillStatusSelect(el("edit-status"));
  el("edit-name").value = appointment.patientName;
  el("edit-phone").value = appointment.phone;
  el("edit-doctor").value = appointment.doctorId;
  el("edit-day").value = appointment.day;
  el("edit-time").value = appointment.time;
  el("edit-status").value = appointment.status;
  clearError("edit-error");
  el("edit-dialog").showModal();
}
async function saveEdit(event) {
  event.preventDefault();
  const appointment = state.appointments.find((item) => item.id === editingId);
  if (!appointment) return;
  const name = el("edit-name").value.trim();
  const doctorId = el("edit-doctor").value;
  const day = el("edit-day").value;
  const time = el("edit-time").value;
  const status = el("edit-status").value;
  if (!name || !doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
    return showError("edit-error", t("patientRequired"));
  }
  if (ACTIVE.has(status) && duplicateAppointment(day, time, doctorId, appointment.id)) {
    return showError("edit-error", t("duplicate"));
  }
  const ok = await saveMutation(() => {
    Object.assign(appointment, {
      patientName: name.slice(0, 120),
      phone: el("edit-phone").value.trim().slice(0, 30),
      doctorId,
      day,
      time,
      status,
      updatedAt: new Date().toISOString(),
    });
    addHistory("edited", `${appointment.patientName} · ${day} ${time}`, appointment.id);
  }, "edit-error");
  if (ok) {
    el("edit-dialog").close();
    editingId = null;
    selectedDay = day;
    renderWorkspace();
  }
}
async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch {}
}
async function createClinic(event) {
  event.preventDefault();
  clearError("setup-error");
  const clinic = el("setup-clinic").value.trim();
  const doctorName = el("setup-doctor").value.trim();
  const pin = el("setup-pin").value;
  const confirmPin = el("setup-pin-confirm").value;
  if (!/^\d{6,12}$/.test(pin)) return showError("setup-error", t("pinFormat"));
  if (pin !== confirmPin) return showError("setup-error", t("pinMismatch"));
  if (!clinic || !doctorName) return showError("setup-error", t("doctorRequired"));

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await deriveKey(pin, salt, ITERATIONS);
    const now = new Date().toISOString();
    const doctor = newDoctor(doctorName);
    const next = {
      version: 3,
      clinicName: clinic.slice(0, 120),
      locale,
      createdAt: now,
      updatedAt: now,
      autoLockMinutes: 15,
      doctors: [doctor],
      appointments: [],
      history: [],
    };
    const nextMeta = {
      id: META_ID,
      version: 3,
      locale,
      salt: toArray(salt),
      iterations: ITERATIONS,
      createdAt: now,
      updatedAt: now,
    };
    state = next;
    meta = nextMeta;
    key = derived;
    addHistory("clinicCreated", clinic);
    await writeRecords([nextMeta, await encryptState(derived, state)]);
    await requestPersistentStorage();
    renderWorkspace();
    touchActivity();
  } catch {
    state = null;
    meta = null;
    key = null;
    showError("setup-error", t("setupFailed"));
  }
}
async function unlockClinic(event) {
  event.preventDefault();
  clearError("unlock-error");
  const pin = el("unlock-pin").value;
  if (!/^\d{6,12}$/.test(pin)) return showError("unlock-error", t("pinFormat"));
  try {
    const payload = await readRecord(PAYLOAD_ID);
    const derived = await deriveKey(pin, toBytes(meta.salt), Number(meta.iterations) || ITERATIONS);
    let next;
    try {
      next = await decryptState(derived, payload);
    } catch {
      return showError("unlock-error", t("wrongPin"));
    }
    state = sanitizeState(next);
    key = derived;
    selectedDay = baghdadDay();
    if (meta.version !== 3 || next.version !== 3) {
      meta.version = 3;
      await saveState();
    }
    await requestPersistentStorage();
    renderWorkspace();
    touchActivity();
  } catch {
    showError("unlock-error", t("unlockFailed"));
  }
}
async function addAppointment(event) {
  event.preventDefault();
  clearError("appointment-error");
  const name = el("patient-name").value.trim();
  const phone = el("patient-phone").value.trim();
  const doctorId = el("appointment-doctor").value;
  const time = el("appointment-time").value;
  if (!name || !doctorId || !/^\d{2}:\d{2}$/.test(time)) return showError("appointment-error", t("patientRequired"));
  if (state.appointments.length >= MAX_APPOINTMENTS) return showError("appointment-error", t("maxAppointments"));
  if (duplicateAppointment(selectedDay, time, doctorId)) return showError("appointment-error", t("duplicate"));

  const appointment = {
    id: randomId(),
    day: selectedDay,
    patientName: name.slice(0, 120),
    phone: phone.slice(0, 30),
    doctorId,
    time,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ok = await saveMutation(() => {
    state.appointments.push(appointment);
    addHistory("created", `${appointment.patientName} · ${doctorLabel(doctorById(doctorId))} · ${selectedDay} ${time}`, appointment.id);
  }, "appointment-error");
  if (!ok) return;

  el("patient-name").value = "";
  el("patient-phone").value = "";
  el("appointment-time").value = addMinutes(time, doctorById(doctorId).intervalMinutes);
  el("appointment-time").setAttribute("title", t("nextSuggested"));
  el("patient-name").focus();
}
async function saveClinicSettings() {
  clearError("settings-error");
  const clinic = el("settings-clinic").value.trim();
  if (!clinic) return showError("settings-error", t("saveFailed"));
  const nextLocale = el("settings-language").value;
  const nextLock = +el("settings-lock").value;
  await saveMutation(() => {
    state.clinicName = clinic.slice(0, 120);
    state.locale = copy[nextLocale] ? nextLocale : "en";
    state.autoLockMinutes = AUTO_LOCKS.has(nextLock) ? nextLock : 15;
    addHistory("settingsUpdated", state.clinicName);
  }, "settings-error");
}
async function addDoctor() {
  clearError("settings-error");
  const name = el("new-doctor-name").value.trim();
  if (!name) return showError("settings-error", t("doctorRequired"));
  const doctor = newDoctor(name, el("new-doctor-specialty").value.trim(), +el("new-doctor-interval").value);
  doctor.order = Math.max(-1, ...state.doctors.map((item) => item.order)) + 1;
  const ok = await saveMutation(() => {
    state.doctors.push(doctor);
    addHistory("doctorAdded", doctorLabel(doctor));
  }, "settings-error");
  if (ok) {
    el("new-doctor-name").value = "";
    el("new-doctor-specialty").value = "";
  }
}
async function backup() {
  clearError("settings-error");
  try {
    const currentMeta = await readRecord(META_ID);
    const payload = await readRecord(PAYLOAD_ID);
    if (!currentMeta || !payload) throw new Error("missing_local_data");
    const blob = new Blob([
      JSON.stringify({ marker: BACKUP_MARKER, version: 3, meta: currentMeta, payload }),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atlas-local-backup-${baghdadDay()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch {
    showError("settings-error", t("backupFailed"));
  }
}
function validBackup(value) {
  return !!(
    value &&
    value.marker === BACKUP_MARKER &&
    [1, 2, 3].includes(value.version) &&
    value.meta &&
    Array.isArray(value.meta.salt) &&
    value.meta.salt.length === 16 &&
    Number(value.meta.iterations) >= 100000 &&
    Number(value.meta.iterations) <= 1000000 &&
    value.payload &&
    Array.isArray(value.payload.iv) &&
    value.payload.iv.length === 12 &&
    Array.isArray(value.payload.ciphertext) &&
    value.payload.ciphertext.length > 16 &&
    value.payload.ciphertext.length < 12 * 1024 * 1024
  );
}
async function restoreBackup(file) {
  clearError("settings-error");
  try {
    if (!file || file.size > 12 * 1024 * 1024) throw new Error("invalid_file");
    const value = JSON.parse(await file.text());
    if (!validBackup(value)) throw new Error("invalid_backup");
    const pin = window.prompt(t("restorePin")) || "";
    if (!/^\d{6,12}$/.test(pin)) return showError("settings-error", t("backupPinFormat"));
    const restoredKey = await deriveKey(pin, toBytes(value.meta.salt), Number(value.meta.iterations));
    let restoredState;
    try {
      restoredState = sanitizeState(await decryptState(restoredKey, value.payload));
    } catch {
      return showError("settings-error", t("wrongPin"));
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
    renderWorkspace();
    touchActivity();
    window.alert(t("restoreDone"));
  } catch {
    showError("settings-error", t("restoreFailed"));
  }
}
async function deleteLocalClinic() {
  if (!window.confirm(t("deleteConfirm"))) return;
  try {
    if (db) db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("blocked"));
    });
    location.reload();
  } catch {
    showError("settings-error", t("saveFailed"));
  }
}
function lockClinic() {
  state = null;
  key = null;
  editingId = null;
  clearTimeout(autoLockTimer);
  el("workspace").classList.remove("show");
  el("setup-screen").classList.add("hidden");
  el("unlock-screen").classList.remove("hidden");
  el("lock-button").classList.add("hidden");
  el("unlock-pin").value = "";
  updateDeviceStatus();
}
function scheduleAutoLock() {
  clearTimeout(autoLockTimer);
  if (!state || !state.autoLockMinutes) return;
  const delay = Math.max(1000, state.autoLockMinutes * 60000 - (Date.now() - lastActivity));
  autoLockTimer = setTimeout(() => {
    if (state && Date.now() - lastActivity >= state.autoLockMinutes * 60000) lockClinic();
    else scheduleAutoLock();
  }, delay);
}
function touchActivity() {
  lastActivity = Date.now();
  scheduleAutoLock();
}
function bindEvents() {
  el("setup-form").addEventListener("submit", createClinic);
  el("unlock-form").addEventListener("submit", unlockClinic);
  el("appointment-form").addEventListener("submit", addAppointment);
  el("edit-form").addEventListener("submit", saveEdit);
  el("edit-close").onclick = () => el("edit-dialog").close();
  el("edit-delete").onclick = async () => {
    const appointment = state.appointments.find((item) => item.id === editingId);
    if (!appointment || !window.confirm(t("deleteAppointmentConfirm"))) return;
    const ok = await saveMutation(() => {
      state.appointments = state.appointments.filter((item) => item.id !== appointment.id);
      addHistory("deleted", appointment.patientName, appointment.id);
    }, "edit-error");
    if (ok) {
      el("edit-dialog").close();
      editingId = null;
    }
  };
  el("lock-button").onclick = lockClinic;
  document.querySelectorAll(".tab").forEach((button) => {
    button.onclick = () => switchPanel(button.dataset.panel);
  });
  el("previous-day").onclick = () => {
    selectedDay = shiftDay(selectedDay, -1);
    el("selected-day").value = selectedDay;
    renderSchedule();
  };
  el("today-day").onclick = () => {
    selectedDay = baghdadDay();
    el("selected-day").value = selectedDay;
    renderSchedule();
  };
  el("next-day").onclick = () => {
    selectedDay = shiftDay(selectedDay, 1);
    el("selected-day").value = selectedDay;
    renderSchedule();
  };
  el("selected-day").onchange = () => {
    const value = el("selected-day").value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      selectedDay = value;
      renderSchedule();
    }
  };
  ["schedule-search", "doctor-filter", "status-filter"].forEach((id) => {
    el(id).addEventListener(id === "schedule-search" ? "input" : "change", renderSchedule);
  });
  ["history-search", "history-filter"].forEach((id) => {
    el(id).addEventListener(id === "history-search" ? "input" : "change", renderHistory);
  });
  el("save-clinic-settings").onclick = saveClinicSettings;
  el("add-doctor").onclick = addDoctor;
  el("backup-button").onclick = backup;
  el("restore-button").onclick = () => el("restore-file").click();
  el("restore-file").onchange = () => {
    const file = el("restore-file").files && el("restore-file").files[0];
    if (file) void restoreBackup(file);
    el("restore-file").value = "";
  };
  el("print-button").onclick = () => window.print();
  el("delete-local").onclick = deleteLocalClinic;
  el("clear-history").onclick = async () => {
    if (!window.confirm(t("clearHistoryConfirm"))) return;
    await saveMutation(() => {
      state.history = [];
    }, "history-error");
  };
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, touchActivity, { passive: true });
  });
}
async function init() {
  bindEvents();
  renderStaticOptions();
  renderLanguageButtons();
  updateDeviceStatus();
  if (!("indexedDB" in window) || !crypto.subtle) {
    return showError("setup-error", t("modernBrowser"));
  }
  try {
    db = await openDb();
    meta = await readRecord(META_ID);
    if (meta) {
      applyLocale(meta.locale || "en");
      el("setup-screen").classList.add("hidden");
      el("unlock-screen").classList.remove("hidden");
    } else {
      el("setup-screen").classList.remove("hidden");
      el("unlock-screen").classList.add("hidden");
    }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/atlas-sw.js").catch(() => undefined);
  } catch {
    showError("setup-error", t("setupFailed"));
  }
}
init();
