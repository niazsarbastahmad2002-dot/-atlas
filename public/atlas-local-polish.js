"use strict";

// Atlas Local polish is loaded after the core and before the app starts.
// It keeps the local product focused, fixes RTL copy leaks, and hardens slot behavior.
Object.assign(KU, {
  installTip: "بۆ کارکردنی جێگیر بەبێ ئینتەرنێت، دوای دامەزراندن Atlas Local زیاد بکە بۆ شاشەی سەرەکی.",
  localData: "پاشەکەوت و داتای ئامێر",
  backupHelp: "پاشەکەوتێکی پارێزراو لە شوێنێکی سەلامەت هەڵبگرە. بە هەمان PIN دەتوانرێت بگەڕێندرێتەوە.",
  backup: "پاشەکەوتی پارێزراو دروست بکە",
  restore: "پاشەکەوتی پارێزراو بگەڕێنەوە",
  printDay: "خشتە چاپ بکە",
  backupFailed: "پاشەکەوتی پارێزراو دروست نەکرا.",
  restorePin: "PIN ـی ئەم پاشەکەوتە بنووسە.",
  restoreReplace: "ئەم پاشەکەوتە بگەڕێنرێتەوە و کلینیکی ناوخۆیی ئێستا بگۆڕدرێت؟",
  restoreDone: "پاشەکەوت گەڕێندرایەوە.",
  deleteConfirm: "کلینیکی ناوخۆیی و هەموو وادەکان لەم ئامێرە بسڕێتەوە؟ بەبێ پاشەکەوت ناگەڕێتەوە.",
  backupPinFormat: "PIN ـی پاشەکەوت دەبێت ٦–١٢ ژمارە بێت.",
});
Object.assign(BD, {
  installTip: "بۆ کارکرنا باش بێ ئینتەرنێت، پشتی دامەزراندنێ Atlas Local زیاد بکە بۆ شاشەیا سەرەکی.",
  localData: "پاراستن و داتای ئامێرێ",
  backupHelp: "فایلەکا پاراستی ل شوینەکێ سەلامەت هەلگرە. ب هەمان PIN دشیێت ڤەگەڕێنیت.",
  backup: "فایلێ پاراستی دروست بکە",
  restore: "فایلێ پاراستی ڤەگەڕێنە",
  printDay: "خشتە چاپ بکە",
  backupFailed: "فایلێ پاراستی نەهات دروستکرن.",
  restorePin: "PIN ـا فایلێ پاراستی بنووسە.",
  restoreReplace: "فایلێ پاراستی ڤەگەڕینە و کلینیکا ناوخۆیی یا نوکە بگوهۆڕە؟",
  restoreDone: "فایلێ پاراستی هات ڤەگەڕاندن.",
  deleteConfirm: "کلینیکا ناوخۆیی و هەمی مەوعیدان ژ ڤێ ئامێرێ ژێببە؟ بێ فایلەکا پاراستی ناگەڕێتەوە.",
  backupPinFormat: "PIN ـا فایلێ پاراستی دڤێت ٦–١٢ ژمارە بن.",
});
EN.printDay = "Print schedule";
AR.printDay = "طباعة الجدول";

function addMinutes(time, amount) {
  const match = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!match) return "";
  const total = Number(match[1]) * 60 + Number(match[2]) + amount;
  if (total < 0 || total >= 1440) return "";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
      if (ACTIVE.has(next) && duplicateAppointment(appointment.day, appointment.time, appointment.doctorId, appointment.id)) {
        status.value = previous;
        return showError("appointment-error", t("duplicate"));
      }
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
