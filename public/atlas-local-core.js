"use strict";
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function readRecord(id) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
function writeRecords(records) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    records.forEach((record) => store.put(record));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
const toArray = (buffer) => Array.from(new Uint8Array(buffer));
const toBytes = (value) => new Uint8Array(Array.isArray(value) ? value : []);
async function deriveKey(pin, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encryptState(localKey, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    localKey,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return { id: PAYLOAD_ID, iv: toArray(iv), ciphertext: toArray(ciphertext), savedAt: new Date().toISOString() };
}
async function decryptState(localKey, payload) {
  const bytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBytes(payload.iv) },
    localKey,
    toBytes(payload.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}
function newDoctor(name, specialty = "", interval = 15) {
  return {
    id: randomId(),
    name: String(name).slice(0, 120),
    specialty: String(specialty).slice(0, 120),
    intervalMinutes: INTERVALS.has(+interval) ? +interval : 15,
    active: true,
    order: 0,
  };
}
function upgradeState(value) {
  if (!value || typeof value !== "object") throw new Error("invalid_state");
  if (value.version === 1) {
    const doctor = newDoctor(value.doctorName || "Doctor", "", 15);
    return {
      version: 3,
      clinicName: String(value.clinicName || "Clinic").slice(0, 120),
      locale: copy[value.locale] ? value.locale : "en",
      createdAt: value.createdAt || new Date().toISOString(),
      updatedAt: value.updatedAt || new Date().toISOString(),
      autoLockMinutes: 15,
      doctors: [doctor],
      appointments: (value.appointments || []).map((appointment) => ({
        ...appointment,
        doctorId: doctor.id,
        status: STATUSES.includes(appointment.status) ? appointment.status : "pending",
        updatedAt: appointment.createdAt || new Date().toISOString(),
      })),
      history: [],
    };
  }
  if (value.version === 2) {
    return {
      version: 3,
      clinicName: value.clinicName,
      locale: value.locale,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      autoLockMinutes: value.autoLockMinutes,
      doctors: value.doctors,
      appointments: value.appointments,
      history: value.history,
    };
  }
  if (value.version !== 3) throw new Error("invalid_state");
  return value;
}
function sanitizeState(value) {
  const clean = upgradeState(value);
  clean.clinicName = String(clean.clinicName || "Clinic").slice(0, 120);
  clean.locale = copy[clean.locale] ? clean.locale : "en";
  clean.autoLockMinutes = AUTO_LOCKS.has(+clean.autoLockMinutes) ? +clean.autoLockMinutes : 15;
  clean.doctors = Array.isArray(clean.doctors)
    ? clean.doctors.slice(0, 100).map((doctor, index) => ({
      id: String(doctor.id || randomId()),
      name: String(doctor.name || "Doctor").slice(0, 120),
      specialty: String(doctor.specialty || "").slice(0, 120),
      intervalMinutes: INTERVALS.has(+doctor.intervalMinutes) ? +doctor.intervalMinutes : 15,
      active: doctor.active !== false,
      order: Number.isFinite(+doctor.order) ? +doctor.order : index,
    }))
    : [];
  if (!clean.doctors.length) clean.doctors = [newDoctor("Doctor")];
  if (!clean.doctors.some((doctor) => doctor.active)) clean.doctors[0].active = true;
  const validDoctor = new Set(clean.doctors.map((doctor) => doctor.id));
  clean.appointments = (Array.isArray(clean.appointments) ? clean.appointments : [])
    .slice(0, MAX_APPOINTMENTS)
    .filter((appointment) =>
      appointment &&
      typeof appointment.id === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(appointment.day || "") &&
      /^\d{2}:\d{2}$/.test(appointment.time || "") &&
      typeof appointment.patientName === "string")
    .map((appointment) => ({
      ...appointment,
      patientName: String(appointment.patientName).slice(0, 120),
      phone: String(appointment.phone || "").slice(0, 30),
      doctorId: validDoctor.has(appointment.doctorId) ? appointment.doctorId : clean.doctors[0].id,
      status: STATUSES.includes(appointment.status) ? appointment.status : "pending",
      createdAt: String(appointment.createdAt || new Date().toISOString()),
      updatedAt: String(appointment.updatedAt || appointment.createdAt || new Date().toISOString()),
    }));
  clean.history = (Array.isArray(clean.history) ? clean.history : [])
    .slice(-MAX_HISTORY)
    .filter((entry) => entry && typeof entry === "object" && entry.action !== "timingUpdated")
    .map((entry) => ({
      id: String(entry.id || randomId()),
      at: String(entry.at || new Date().toISOString()),
      action: entry.action === "created" && !entry.appointmentId ? "clinicCreated" : String(entry.action || "settingsUpdated"),
      detail: String(entry.detail || "").slice(0, 240),
      appointmentId: String(entry.appointmentId || ""),
    }));
  return clean;
}
function addHistory(action, detail, appointmentId = "") {
  state.history.push({
    id: randomId(),
    at: new Date().toISOString(),
    action,
    detail: String(detail || "").slice(0, 240),
    appointmentId,
  });
  if (state.history.length > MAX_HISTORY) state.history = state.history.slice(-MAX_HISTORY);
}
async function saveState() {
  state.updatedAt = new Date().toISOString();
  meta.updatedAt = state.updatedAt;
  meta.locale = state.locale;
  meta.version = 3;
  await writeRecords([meta, await encryptState(key, state)]);
}
async function saveMutation(mutator, errorId) {
  const before = clone(state);
  try {
    mutator();
    await saveState();
    renderWorkspace();
    touchActivity();
    return true;
  } catch {
    state = before;
    renderWorkspace();
    showError(errorId, t("saveFailed"));
    return false;
  }
}
function activeDoctors() {
  return state.doctors.filter((doctor) => doctor.active).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
function doctorById(id) {
  return state.doctors.find((doctor) => doctor.id === id) || state.doctors[0];
}
function doctorLabel(doctor) {
  return doctor.specialty ? `${doctor.name} · ${doctor.specialty}` : doctor.name;
}
function fillDoctorSelect(select, includeAll = false, includeArchived = false) {
  const current = select.value;
  select.replaceChildren();
  if (includeAll) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("allDoctors");
    select.append(option);
  }
  const doctors = includeArchived
    ? [...state.doctors].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    : activeDoctors();
  doctors.forEach((doctor) => {
    const option = document.createElement("option");
    option.value = doctor.id;
    option.textContent = doctorLabel(doctor);
    select.append(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}
function fillStatusSelect(select, includeAll = false) {
  const current = select.value;
  select.replaceChildren();
  if (includeAll) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("allStatuses");
    select.append(option);
  }
  STATUSES.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = t(status);
    select.append(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}
function duplicateAppointment(day, time, doctorId, ignoreId = "") {
  return state.appointments.some((appointment) =>
    appointment.id !== ignoreId &&
    appointment.day === day &&
    appointment.time === time &&
    appointment.doctorId === doctorId &&
    ACTIVE.has(appointment.status));
}
function queueMap(rows) {
  const map = new Map();
  rows
    .filter((appointment) => ACTIVE.has(appointment.status))
    .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
    .forEach((appointment, index) => map.set(appointment.id, index + 1));
  return map;
}
function renderWorkspace() {
  if (!state) return;
  applyLocale(state.locale);
  el("clinic-title").textContent = state.clinicName;
  el("doctor-summary").textContent = activeDoctors().map(doctorLabel).join(" · ");
  el("selected-day").value = selectedDay;
  el("settings-clinic").value = state.clinicName;
  el("settings-language").value = state.locale;
  el("settings-lock").value = String(state.autoLockMinutes);
  fillDoctorSelect(el("appointment-doctor"));
  fillDoctorSelect(el("doctor-filter"), true, true);
  fillDoctorSelect(el("edit-doctor"), false, true);
  fillStatusSelect(el("status-filter"), true);
  fillStatusSelect(el("edit-status"));
  renderSchedule();
  renderDoctors();
  renderHistory();
  el("setup-screen").classList.add("hidden");
  el("unlock-screen").classList.add("hidden");
  el("workspace").classList.add("show");
  el("lock-button").classList.remove("hidden");
  updateDeviceStatus();
}
function filteredDayRows() {
  const query = el("schedule-search").value.trim().toLowerCase();
  const doctor = el("doctor-filter").value;
  const status = el("status-filter").value;
  return state.appointments
    .filter((appointment) => appointment.day === selectedDay)
    .filter((appointment) => !doctor || appointment.doctorId === doctor)
    .filter((appointment) => !status || appointment.status === status)
    .filter((appointment) =>
      !query ||
      appointment.patientName.toLowerCase().includes(query) ||
      appointment.phone.toLowerCase().includes(query))
    .sort((a, b) =>
      a.time.localeCompare(b.time) ||
      doctorById(a.doctorId).order - doctorById(b.doctorId).order ||
      a.createdAt.localeCompare(b.createdAt));
}
function renderSchedule() {
  const all = state.appointments.filter((appointment) => appointment.day === selectedDay);
  const rows = filteredDayRows();
  const queue = queueMap(all);
  el("stat-total").textContent = all.length;
  el("stat-pending").textContent = all.filter((appointment) => appointment.status === "pending").length;
  el("stat-confirmed").textContent = all.filter((appointment) => appointment.status === "confirmed").length;
  el("stat-completed").textContent = all.filter((appointment) => appointment.status === "completed").length;
  el("stat-waiting").textContent = all.filter((appointment) => appointment.status === "waiting").length;
  el("appointment-count").textContent = `${rows.length} ${t("count")}`;
  const list = el("appointment-list");
  list.replaceChildren();

  rows.forEach((appointment) => {
    const card = document.createElement("article");
    card.className = "card appointment";
    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTime(appointment.time);
    const queueNumber = document.createElement("div");
    queueNumber.className = "queue";
    queueNumber.textContent = queue.get(appointment.id) || "·";
    const main = document.createElement("div");
    const patient = document.createElement("div");
    patient.className = "patient";
    patient.textContent = appointment.patientName;
    const metaLine = document.createElement("div");
    metaLine.className = "meta";
    const doctor = doctorById(appointment.doctorId);
    metaLine.textContent = [doctorLabel(doctor), appointment.phone].filter(Boolean).join(" · ");
    main.append(patient, metaLine);

    const status = document.createElement("select");
    status.className = "status-select";
    status.setAttribute("aria-label", t("status"));
    fillStatusSelect(status);
    status.value = appointment.status;
    status.onchange = async () => {
      const next = status.value;
      const previous = appointment.status;
      const ok = await saveMutation(() => {
        appointment.status = next;
        appointment.updatedAt = new Date().toISOString();
        addHistory("statusChanged", `${appointment.patientName}: ${t(previous)} → ${t(next)}`, appointment.id);
      }, "appointment-error");
      if (!ok) status.value = previous;
    };

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary small";
    edit.textContent = t("edit");
    edit.onclick = () => openEdit(appointment.id);
    actions.append(edit);
    card.append(time, queueNumber, main, status, actions);
    list.append(card);
  });

  el("empty-state").classList.toggle("hidden", rows.length !== 0);
}
function renderDoctors() {
  const root = el("doctor-settings-list");
  root.replaceChildren();
  state.doctors
    .sort((a, b) => a.order - b.order)
    .forEach((doctor) => {
      const row = document.createElement("div");
      row.className = `doctor-row${doctor.active ? "" : " archived"}`;

      const nameField = document.createElement("div");
      nameField.className = "field";
      const nameLabel = document.createElement("label");
      nameLabel.textContent = t("doctorName");
      const name = document.createElement("input");
      name.maxLength = 120;
      name.value = doctor.name;
      nameField.append(nameLabel, name);

      const specialtyField = document.createElement("div");
      specialtyField.className = "field";
      const specialtyLabel = document.createElement("label");
      specialtyLabel.textContent = t("specialtyOptional");
      const specialty = document.createElement("input");
      specialty.maxLength = 120;
      specialty.value = doctor.specialty;
      specialtyField.append(specialtyLabel, specialty);

      const intervalField = document.createElement("div");
      intervalField.className = "field";
      const intervalLabel = document.createElement("label");
      intervalLabel.textContent = t("interval");
      const interval = document.createElement("select");
      [5, 10, 15, 20, 30].forEach((value) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = minuteLabel(value);
        interval.append(option);
      });
      interval.value = String(doctor.intervalMinutes);
      intervalField.append(intervalLabel, interval);

      const actions = document.createElement("div");
      actions.className = "row-actions";
      const save = document.createElement("button");
      save.type = "button";
      save.className = "button secondary small";
      save.textContent = t("saveChanges");
      save.onclick = async () => {
        const nextName = name.value.trim();
        if (!nextName) return showError("settings-error", t("doctorRequired"));
        await saveMutation(() => {
          doctor.name = nextName.slice(0, 120);
          doctor.specialty = specialty.value.trim().slice(0, 120);
          doctor.intervalMinutes = +interval.value;
          addHistory("doctorUpdated", doctorLabel(doctor));
        }, "settings-error");
      };

      const archive = document.createElement("button");
      archive.type = "button";
      archive.className = `button ${doctor.active ? "danger" : "secondary"} small`;
      archive.textContent = doctor.active ? t("archive") : t("restoreDoctor");
      archive.onclick = async () => {
        if (doctor.active && activeDoctors().length <= 1) return showError("settings-error", t("lastDoctor"));
        await saveMutation(() => {
          doctor.active = !doctor.active;
          addHistory(doctor.active ? "doctorRestored" : "doctorArchived", doctorLabel(doctor));
        }, "settings-error");
      };

      actions.append(save, archive);
      row.append(nameField, specialtyField, intervalField, actions);
      root.append(row);
    });
}
function renderHistory() {
  const query = el("history-search").value.trim().toLowerCase();
  const filterValue = el("history-filter").value;
  const actions = [...new Set(state.history.map((entry) => entry.action))].sort();
  const filter = el("history-filter");
  const current = filter.value;
  filter.replaceChildren();

  const all = document.createElement("option");
  all.value = "";
  all.textContent = t("allActivity");
  filter.append(all);
  actions.forEach((action) => {
    const option = document.createElement("option");
    option.value = action;
    option.textContent = t(action);
    filter.append(option);
  });
  if (actions.includes(current)) filter.value = current;

  const rows = [...state.history]
    .reverse()
    .filter((entry) => !filterValue || entry.action === filterValue)
    .filter((entry) =>
      !query ||
      entry.detail.toLowerCase().includes(query) ||
      t(entry.action).toLowerCase().includes(query));

  el("history-count").textContent = String(rows.length);
  const root = el("history-list");
  root.replaceChildren();
  rows.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "card history-row";
    const at = document.createElement("div");
    at.className = "history-time";
    at.textContent = formatDateTime(entry.at);
    const action = document.createElement("div");
    action.className = "history-action";
    action.textContent = t(entry.action);
    const detail = document.createElement("div");
    detail.className = "history-detail";
    detail.textContent = entry.detail;
    row.append(at, action, detail);
    root.append(row);
  });
  el("history-empty").classList.toggle("hidden", rows.length !== 0);
}
function switchPanel(name) {
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.panel === name));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${name}`));
  touchActivity();
}
