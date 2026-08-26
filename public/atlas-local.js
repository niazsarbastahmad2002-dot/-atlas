(() => {
  "use strict";

  const DB_NAME = "atlas-local-v1";
  const STORE = "vault";
  const META_ID = "meta";
  const PAYLOAD_ID = "payload";
  const BACKUP_MARKER = "atlas-local-backup-v1";
  const ITERATIONS = 310000;
  const MAX_APPOINTMENTS = 5000;
  const ACTIVE_STATUSES = new Set(["pending", "confirmed"]);

  const copy = {
    en: {
      offlineClinic: "Offline clinic",
      setupTitle: "Create Atlas Local on this device.",
      setupHelp: "This clinic stays separate from Atlas Online. It works without internet and never syncs automatically.",
      privacyHelp: "Appointments are encrypted on this device. Atlas Local stores scheduling details only — no clinical notes.",
      clinicName: "Clinic name",
      doctorOptional: "Doctor name (optional)",
      createPin: "Create a 6–12 digit clinic PIN",
      confirmPin: "Confirm PIN",
      createLocal: "Create local clinic",
      unlockTitle: "Open this clinic.",
      unlockHelp: "Enter the clinic PIN. Nothing is sent to Atlas servers.",
      clinicPin: "Clinic PIN",
      openClinic: "Open clinic",
      installTip: "On iPhone or iPad, open this page once while online and use Share → Add to Home Screen. After that, Atlas Local can open without internet.",
      separation: "Local mode is separate: these appointments stay on this device and are never merged into Atlas Online automatically.",
      previous: "Previous",
      today: "Today",
      next: "Next",
      patientName: "Patient name",
      phoneOptional: "Phone (optional)",
      time: "Time",
      addAppointment: "Add appointment",
      appointments: "Appointments",
      noAppointments: "No appointments on this day.",
      noAppointmentsHelp: "Add the first patient above.",
      localSettings: "Local settings",
      saveSettings: "Save settings",
      backup: "Encrypted backup",
      restore: "Restore backup",
      backupHelp: "Because this clinic is not stored in the cloud, keep an encrypted backup somewhere safe. The backup can only be opened with the same clinic PIN.",
      openOnline: "Open Atlas Online",
      deleteLocal: "Delete local clinic from this device",
      deleteHelp: "Deleting Atlas Local removes local appointments from this device. It does not affect Atlas Online.",
      footer: "Atlas Local is scheduling-only. Keep clinical notes in the clinic's approved medical record system.",
      doctor: "Doctor",
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed",
      no_show: "No show",
      cancelled: "Cancelled",
      count: "appointments",
      device: "THIS DEVICE",
      online: "LOCAL · INTERNET AVAILABLE",
      offline: "LOCAL · OFFLINE",
      pinMismatch: "The two PINs do not match.",
      pinFormat: "Use 6–12 digits for the clinic PIN.",
      setupFailed: "Atlas Local could not be created on this device.",
      wrongPin: "That PIN did not open this clinic.",
      unlockFailed: "Atlas Local could not open the local clinic.",
      duplicate: "That time already has an active appointment.",
      saveFailed: "The appointment could not be saved locally.",
      backupFailed: "The encrypted backup could not be created.",
      restoreFailed: "That file is not a valid Atlas Local backup.",
      restoreDone: "Backup restored. Enter its clinic PIN to open it.",
      deleteConfirm: "Delete every Atlas Local appointment from this device? This cannot be undone unless you have a backup.",
      patientRequired: "Enter a patient name and appointment time.",
      settingsSaved: "Settings saved."
    },
    ku: {
      offlineClinic: "کلینیکی ئۆفلاین",
      setupTitle: "Atlas Local لەم ئامێرە دروست بکە.",
      setupHelp: "ئەم کلینیکە لە Atlas Online جیاوازە. بەبێ ئینتەرنێت کار دەکات و خۆکارانە هاوکات نابێت.",
      privacyHelp: "مەوعیدەکان لەم ئامێرە بە پاراستی هەڵدەگیرێن. تەنها زانیاری خشتەی کار — نە نۆتی پزیشکی.",
      clinicName: "ناوی کلینیک",
      doctorOptional: "ناوی دکتۆر (ئارەزوومەندانە)",
      createPin: "PIN ـێکی ٦–١٢ ژمارەیی دروست بکە",
      confirmPin: "PIN دووبارە بکە",
      createLocal: "کلینیکی ناوخۆیی دروست بکە",
      unlockTitle: "ئەم کلینیکە بکەرەوە.",
      unlockHelp: "PIN ـی کلینیک بنووسە. هیچ شتێک بۆ سێرڤەری Atlas نەنێردرێت.",
      clinicPin: "PIN ـی کلینیک",
      openClinic: "کردنەوەی کلینیک",
      installTip: "لە iPhone یان iPad، یەکجار بە ئینتەرنێت ئەم پەڕەیە بکەرەوە و Share → Add to Home Screen بکە. پاشان بەبێ ئینتەرنێتیش دەکرێتەوە.",
      separation: "Local جیاوازە: ئەم مەوعیدانە تەنها لەم ئامێرەن و خۆکارانە ناخرێنە Atlas Online.",
      previous: "پێشوو",
      today: "ئەمڕۆ",
      next: "داهاتوو",
      patientName: "ناوی نەخۆش",
      phoneOptional: "ژمارەی مۆبایل (ئارەزوومەندانە)",
      time: "کات",
      addAppointment: "مەوعید زیاد بکە",
      appointments: "مەوعیدەکان",
      noAppointments: "لەم ڕۆژە هیچ مەوعیدێک نییە.",
      noAppointmentsHelp: "یەکەم نەخۆش لە سەرەوە زیاد بکە.",
      localSettings: "ڕێکخستنە ناوخۆییەکان",
      saveSettings: "ڕێکخستنەکان هەڵبگرە",
      backup: "Backup ـی پارێزراو",
      restore: "گەڕاندنەوەی backup",
      backupHelp: "چونکە ئەم کلینیکە لە کلاود نییە، backup ـێکی کۆدکراو لە شوێنێکی پارێزراو هەڵبگرە. تەنها بە هەمان PIN دەکرێتەوە.",
      openOnline: "کردنەوەی Atlas Online",
      deleteLocal: "سڕینەوەی کلینیکی Local لەم ئامێرە",
      deleteHelp: "سڕینەوەی Atlas Local مەوعیدە ناوخۆییەکان لەم ئامێرە دەسڕێتەوە و کاریگەری لە Atlas Online نییە.",
      footer: "Atlas Local تەنها بۆ خشتە و مەوعیدە. نۆتی پزیشکی لە سیستەمی پەسەندکراوی کلینیکدا هەڵبگرە.",
      doctor: "دکتۆر",
      pending: "چاوەڕوان",
      confirmed: "پشتڕاستکراو",
      completed: "تەواو",
      no_show: "نەهات",
      cancelled: "هەڵوەشاوە",
      count: "مەوعید",
      device: "ئەم ئامێرە",
      online: "LOCAL · ئینتەرنێت هەیە",
      offline: "LOCAL · ئۆفلاین",
      pinMismatch: "دوو PIN ـەکە وەک یەک نین.",
      pinFormat: "PIN دەبێت ٦–١٢ ژمارە بێت.",
      setupFailed: "Atlas Local لەم ئامێرە دروست نەکرا.",
      wrongPin: "ئەم PIN ـە کلینیکەکەی نەکردەوە.",
      unlockFailed: "Atlas Local نەیتوانی کلینیکەکە بکاتەوە.",
      duplicate: "لەم کاتەدا پێشتر مەوعیدێکی چالاک هەیە.",
      saveFailed: "مەوعیدەکە بە ناوخۆیی هەڵنەگیرا.",
      backupFailed: "Backup دروست نەکرا.",
      restoreFailed: "ئەم فایلە backup ـی دروستی Atlas Local نییە.",
      restoreDone: "Backup گەڕێندرایەوە. PIN ـی کلینیک بنووسە بۆ کردنەوە.",
      deleteConfirm: "هەموو مەوعیدەکانی Atlas Local لەم ئامێرە بسڕدرێنەوە؟ ئەگەر backup نەبێت ناگەڕێنرێنەوە.",
      patientRequired: "ناوی نەخۆش و کاتی مەوعید بنووسە.",
      settingsSaved: "ڕێکخستنەکان هەڵگیران."
    },
    bd: {
      offlineClinic: "کلینیکا ئۆفلاین",
      setupTitle: "Atlas Local ل سەر ڤێ ئامێرێ دروست بکە.",
      setupHelp: "ئەم کلینیکە ژ Atlas Online جودایە. بێ ئینتەرنێت کار دکەت و خودکار هاوکات نابیت.",
      privacyHelp: "مەوعید ل سەر ڤێ ئامێرێ ب پاراستی دهێن هەلگرتن. تەنێ زانیارییا خشتەی کار — نە تێبینیێن پزیشکی.",
      clinicName: "ناڤێ کلینیکێ",
      doctorOptional: "ناڤێ دکتۆری (ئارەزوومەندانە)",
      createPin: "PIN ـەکا ٦–١٢ ژمارەیی دروست بکە",
      confirmPin: "PIN دووبارە بکە",
      createLocal: "کلینیکا ناوخۆیی دروست بکە",
      unlockTitle: "ڤێ کلینیکێ ڤەکە.",
      unlockHelp: "PIN ـا کلینیکێ بنڤیسە. چ تشت بۆ سێرڤەرێن Atlas ناهێتە هنارتن.",
      clinicPin: "PIN ـا کلینیکێ",
      openClinic: "کلینیکێ ڤەکە",
      installTip: "ل iPhone یان iPad، جارەکێ ب ئینتەرنێت ڤێ پەڕێ ڤەکە و Share → Add to Home Screen بکە. پاشی بێ ئینتەرنێت ژی دڤەبیت.",
      separation: "Local جودایە: ئەم مەوعید تەنێ ل سەر ڤێ ئامێرێن و خودکار ناچنە Atlas Online.",
      previous: "بەرێ",
      today: "ئەڤرۆ",
      next: "پاش",
      patientName: "ناڤێ نەخۆشی",
      phoneOptional: "ژمارا موبایلێ (ئارەزوومەندانە)",
      time: "دەم",
      addAppointment: "مەوعید زێدە بکە",
      appointments: "مەوعید",
      noAppointments: "ل ڤێ ڕۆژێ چ مەوعید نینن.",
      noAppointmentsHelp: "نەخۆشێ ئێکێ ل سەرێ زێدە بکە.",
      localSettings: "ڕێکخستنێن Local",
      saveSettings: "ڕێکخستنان هەلگرە",
      backup: "Backup ـا پاراستی",
      restore: "ڤەگەراندنا backup",
      backupHelp: "ژبەر کو ئەم کلینیکە ل کلاودێ نینە، backup ـەکا کۆدکری ل جهەکێ پاراستی هەلگرە. تەنێ ب هەمان PIN دهێتە ڤەکرن.",
      openOnline: "Atlas Online ڤەکە",
      deleteLocal: "کلینیکا Local ژ ڤێ ئامێرێ ژێببە",
      deleteHelp: "ژێبرنا Atlas Local مەوعیدێن ناوخۆیی ژ ڤێ ئامێرێ دژبریت و کاریگەری ل Atlas Online نینە.",
      footer: "Atlas Local تەنێ بۆ خشتە و مەوعیدانە. تێبینیێن پزیشکی د سیستەمێ پەسەندکریێ کلینیکێ دا هەلگرە.",
      doctor: "دکتۆر",
      pending: "چاوەڕێ",
      confirmed: "پشتڕاستکری",
      completed: "تەواو",
      no_show: "نەهات",
      cancelled: "هەلوەشاندی",
      count: "مەوعید",
      device: "ڤێ ئامێرێ",
      online: "LOCAL · ئینتەرنێت هەیە",
      offline: "LOCAL · ئۆفلاین",
      pinMismatch: "هەردوو PIN وەک هەڤ نینن.",
      pinFormat: "PIN دبێت ٦–١٢ ژمارە بیت.",
      setupFailed: "Atlas Local ل سەر ڤێ ئامێرێ نەهات دروستکرن.",
      wrongPin: "ڤێ PIN ـێ کلینیک نەڤەکر.",
      unlockFailed: "Atlas Local نەشیا کلینیکێ ڤەکەت.",
      duplicate: "ل ڤی دەمی مەوعیدەکا چالاک هەیە.",
      saveFailed: "مەوعید نەهات هەلگرتن.",
      backupFailed: "Backup نەهات دروستکرن.",
      restoreFailed: "ئەم فایل backup ـا دروست یا Atlas Local نینە.",
      restoreDone: "Backup هات ڤەگەراندن. PIN ـا کلینیکێ بنڤیسە.",
      deleteConfirm: "هەمی مەوعیدێن Atlas Local ژ ڤێ ئامێرێ بهێن ژێبرن؟ بێ backup ناگەڕنەوە.",
      patientRequired: "ناڤێ نەخۆشی و دەمێ مەوعیدی بنڤیسە.",
      settingsSaved: "ڕێکخستن هاتن هەلگرتن."
    },
    ar: {
      offlineClinic: "عيادة بدون إنترنت",
      setupTitle: "أنشئ Atlas Local على هذا الجهاز.",
      setupHelp: "هذه العيادة منفصلة عن Atlas Online. تعمل بدون إنترنت ولا تتزامن تلقائياً.",
      privacyHelp: "المواعيد مشفرة على هذا الجهاز. Atlas Local يحفظ معلومات الجدول فقط — بدون ملاحظات طبية.",
      clinicName: "اسم العيادة",
      doctorOptional: "اسم الطبيب (اختياري)",
      createPin: "أنشئ PIN من 6–12 رقم",
      confirmPin: "أكد الـ PIN",
      createLocal: "إنشاء عيادة محلية",
      unlockTitle: "افتح هذه العيادة.",
      unlockHelp: "أدخل PIN العيادة. لا يتم إرسال أي شيء إلى خوادم Atlas.",
      clinicPin: "PIN العيادة",
      openClinic: "فتح العيادة",
      installTip: "على iPhone أو iPad افتح هذه الصفحة مرة واحدة بالإنترنت ثم Share → Add to Home Screen. بعدها تفتح بدون إنترنت.",
      separation: "الوضع المحلي منفصل: هذه المواعيد تبقى على هذا الجهاز ولا تندمج تلقائياً مع Atlas Online.",
      previous: "السابق",
      today: "اليوم",
      next: "التالي",
      patientName: "اسم المريض",
      phoneOptional: "الهاتف (اختياري)",
      time: "الوقت",
      addAppointment: "إضافة موعد",
      appointments: "المواعيد",
      noAppointments: "ماكو مواعيد بهذا اليوم.",
      noAppointmentsHelp: "ضيف أول مريض من فوق.",
      localSettings: "الإعدادات المحلية",
      saveSettings: "حفظ الإعدادات",
      backup: "نسخة مشفرة",
      restore: "استعادة نسخة",
      backupHelp: "لأن هذه العيادة ليست محفوظة بالسحابة، احتفظ بنسخة احتياطية مشفرة بمكان آمن. لا تُفتح إلا بنفس PIN العيادة.",
      openOnline: "فتح Atlas Online",
      deleteLocal: "حذف العيادة المحلية من الجهاز",
      deleteHelp: "حذف Atlas Local يمسح المواعيد المحلية من هذا الجهاز ولا يؤثر على Atlas Online.",
      footer: "Atlas Local للمواعيد والتنظيم فقط. خلي الملاحظات الطبية بنظام السجل الطبي المعتمد بالعيادة.",
      doctor: "الطبيب",
      pending: "انتظار",
      confirmed: "مؤكد",
      completed: "مكتمل",
      no_show: "لم يحضر",
      cancelled: "ملغي",
      count: "موعد",
      device: "هذا الجهاز",
      online: "LOCAL · الإنترنت متوفر",
      offline: "LOCAL · بدون إنترنت",
      pinMismatch: "الـ PIN غير متطابق.",
      pinFormat: "استخدم 6–12 رقم للـ PIN.",
      setupFailed: "تعذر إنشاء Atlas Local على هذا الجهاز.",
      wrongPin: "هذا الـ PIN لم يفتح العيادة.",
      unlockFailed: "تعذر فتح العيادة المحلية.",
      duplicate: "هذا الوقت عنده موعد فعال بالفعل.",
      saveFailed: "تعذر حفظ الموعد محلياً.",
      backupFailed: "تعذر إنشاء النسخة المشفرة.",
      restoreFailed: "هذا الملف ليس نسخة Atlas Local صالحة.",
      restoreDone: "تمت استعادة النسخة. أدخل PIN العيادة لفتحها.",
      deleteConfirm: "تحذف كل مواعيد Atlas Local من هذا الجهاز؟ ما تگدر ترجعها بدون نسخة احتياطية.",
      patientRequired: "أدخل اسم المريض ووقت الموعد.",
      settingsSaved: "تم حفظ الإعدادات."
    }
  };

  const el = (id) => document.getElementById(id);
  let locale = "en";
  let db = null;
  let meta = null;
  let key = null;
  let state = null;
  let selectedDay = baghdadDay();

  function t(name) {
    return (copy[locale] && copy[locale][name]) || copy.en[name] || name;
  }

  function showError(id, message) {
    const node = el(id);
    node.textContent = message;
    node.classList.remove("hidden");
  }

  function clearError(id) {
    const node = el(id);
    node.textContent = "";
    node.classList.add("hidden");
  }

  function baghdadDay(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function shiftDay(day, amount) {
    const date = new Date(`${day}T12:00:00+03:00`);
    date.setUTCDate(date.getUTCDate() + amount);
    return baghdadDay(date);
  }

  function formatTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return value || "—";
    const date = new Date(`2000-01-01T${value}:00+03:00`);
    const dateLocale = locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : locale === "bd" ? "ku-IQ" : "en";
    return new Intl.DateTimeFormat(dateLocale, {
      timeZone: "Asia/Baghdad",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function applyLocale(nextLocale) {
    locale = copy[nextLocale] ? nextLocale : "en";
    document.documentElement.lang = locale === "ku" ? "ckb" : locale === "bd" ? "ku" : locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-t]").forEach((node) => {
      const value = t(node.dataset.t);
      if (value) node.textContent = value;
    });
    renderLanguageButtons();
    updateConnectionStatus();
  }

  function renderLanguageButtons() {
    const languages = [["en", "EN"], ["ku", "کوردی"], ["bd", "بادینی"], ["ar", "عربي"]];
    document.querySelectorAll("[data-language-buttons]").forEach((root) => {
      root.replaceChildren();
      languages.forEach(([value, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        if (value === locale) button.classList.add("active");
        button.addEventListener("click", () => applyLocale(value));
        root.append(button);
      });
    });
  }

  function updateConnectionStatus() {
    const online = navigator.onLine !== false;
    el("connection-status").textContent = state ? (online ? t("online") : t("offline")) : t("device");
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("db_unavailable"));
    });
  }

  function readRecord(id) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("read_failed"));
    });
  }

  function writeRecords(records) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      records.forEach((record) => store.put(record));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("write_failed"));
      transaction.onabort = () => reject(transaction.error || new Error("write_aborted"));
    });
  }

  function toArray(bytes) {
    return Array.from(new Uint8Array(bytes));
  }

  function toBytes(values) {
    return new Uint8Array(Array.isArray(values) ? values : []);
  }

  async function deriveKey(pin, salt, iterations) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptState(cryptoKey, value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      new TextEncoder().encode(JSON.stringify(value))
    );
    return {
      id: PAYLOAD_ID,
      iv: toArray(iv),
      ciphertext: toArray(ciphertext),
      savedAt: new Date().toISOString()
    };
  }

  async function decryptState(cryptoKey, payload) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBytes(payload.iv) },
      cryptoKey,
      toBytes(payload.ciphertext)
    );
    const value = JSON.parse(new TextDecoder().decode(plain));
    if (!value || value.version !== 1 || !Array.isArray(value.appointments) || value.appointments.length > MAX_APPOINTMENTS) {
      throw new Error("invalid_state");
    }
    return value;
  }

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
  }

  function validatePin(pin) {
    return /^\d{6,12}$/.test(pin);
  }

  function sanitizeState(value) {
    value.clinicName = String(value.clinicName || "").slice(0, 120);
    value.doctorName = String(value.doctorName || "").slice(0, 120);
    value.locale = copy[value.locale] ? value.locale : "en";
    value.appointments = value.appointments.slice(0, MAX_APPOINTMENTS).filter((item) => (
      item &&
      typeof item.id === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.day || "") &&
      /^\d{2}:\d{2}$/.test(item.time || "") &&
      typeof item.patientName === "string"
    ));
    return value;
  }

  async function saveState() {
    state.updatedAt = new Date().toISOString();
    meta.updatedAt = state.updatedAt;
    meta.locale = state.locale;
    const payload = await encryptState(key, state);
    await writeRecords([meta, payload]);
  }

  function buildStatusSelect(item) {
    const select = document.createElement("select");
    select.className = "status-select";
    const statuses = ["pending", "confirmed", "completed", "no_show", "cancelled"];
    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = t(status);
      option.selected = status === item.status;
      select.append(option);
    });
    select.addEventListener("change", async () => {
      const previous = item.status;
      item.status = select.value;
      try {
        await saveState();
        renderWorkspace();
      } catch {
        item.status = previous;
        showError("appointment-error", t("saveFailed"));
      }
    });
    return select;
  }

  function renderWorkspace() {
    if (!state) return;
    applyLocale(state.locale || locale);
    el("clinic-title").textContent = state.clinicName || "Atlas Local";
    el("doctor-line").textContent = state.doctorName ? `${t("doctor")}: ${state.doctorName}` : "";
    el("selected-day").value = selectedDay;
    el("settings-clinic").value = state.clinicName || "";
    el("settings-doctor").value = state.doctorName || "";

    const rows = state.appointments
      .filter((item) => item.day === selectedDay)
      .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt));

    const list = el("appointment-list");
    list.replaceChildren();
    rows.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card appointment";

      const time = document.createElement("div");
      time.className = "time";
      time.textContent = formatTime(item.time);

      const main = document.createElement("div");
      const patient = document.createElement("div");
      patient.className = "patient";
      patient.textContent = String(item.patientName).slice(0, 120);
      const detail = document.createElement("div");
      detail.className = "meta";
      detail.textContent = item.phone ? String(item.phone).slice(0, 30) : (state.doctorName || "");
      main.append(patient, detail);

      card.append(time, main, buildStatusSelect(item));
      list.append(card);
    });

    el("appointment-count").textContent = `${rows.length} ${t("count")}`;
    el("empty-state").classList.toggle("hidden", rows.length !== 0);
    el("setup-screen").classList.add("hidden");
    el("unlock-screen").classList.add("hidden");
    el("workspace").classList.add("show");
    el("lock-button").classList.remove("hidden");
    updateConnectionStatus();
  }

  function lockClinic() {
    state = null;
    key = null;
    selectedDay = baghdadDay();
    el("workspace").classList.remove("show");
    el("setup-screen").classList.add("hidden");
    el("unlock-screen").classList.remove("hidden");
    el("lock-button").classList.add("hidden");
    el("unlock-pin").value = "";
    clearError("unlock-error");
    updateConnectionStatus();
  }

  async function createClinic(event) {
    event.preventDefault();
    clearError("setup-error");
    const clinicName = el("setup-clinic").value.trim();
    const doctorName = el("setup-doctor").value.trim();
    const pin = el("setup-pin").value;
    const confirmPin = el("setup-pin-confirm").value;

    if (!validatePin(pin)) return showError("setup-error", t("pinFormat"));
    if (pin !== confirmPin) return showError("setup-error", t("pinMismatch"));

    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const derived = await deriveKey(pin, salt, ITERATIONS);
      const now = new Date().toISOString();
      const nextState = {
        version: 1,
        clinicName: clinicName.slice(0, 120),
        doctorName: doctorName.slice(0, 120),
        locale,
        createdAt: now,
        updatedAt: now,
        appointments: []
      };
      const nextMeta = {
        id: META_ID,
        version: 1,
        locale,
        salt: toArray(salt),
        iterations: ITERATIONS,
        createdAt: now,
        updatedAt: now
      };
      const payload = await encryptState(derived, nextState);
      await writeRecords([nextMeta, payload]);
      meta = nextMeta;
      state = nextState;
      key = derived;
      selectedDay = baghdadDay();
      el("setup-pin").value = "";
      el("setup-pin-confirm").value = "";
      renderWorkspace();
    } catch {
      showError("setup-error", t("setupFailed"));
    }
  }

  async function unlockClinic(event) {
    event.preventDefault();
    clearError("unlock-error");
    const pin = el("unlock-pin").value;
    if (!validatePin(pin)) return showError("unlock-error", t("pinFormat"));

    try {
      const payload = await readRecord(PAYLOAD_ID);
      if (!meta || !payload) throw new Error("missing_vault");
      const derived = await deriveKey(pin, toBytes(meta.salt), Number(meta.iterations) || ITERATIONS);
      let nextState;
      try {
        nextState = await decryptState(derived, payload);
      } catch {
        return showError("unlock-error", t("wrongPin"));
      }
      state = sanitizeState(nextState);
      key = derived;
      selectedDay = baghdadDay();
      el("unlock-pin").value = "";
      renderWorkspace();
    } catch {
      showError("unlock-error", t("unlockFailed"));
    }
  }

  async function addAppointment(event) {
    event.preventDefault();
    clearError("appointment-error");
    const patientName = el("patient-name").value.trim();
    const phone = el("patient-phone").value.trim();
    const time = el("appointment-time").value;

    if (!patientName || !/^\d{2}:\d{2}$/.test(time)) return showError("appointment-error", t("patientRequired"));
    if (state.appointments.length >= MAX_APPOINTMENTS) return showError("appointment-error", t("saveFailed"));

    const duplicate = state.appointments.some((item) => (
      item.day === selectedDay && item.time === time && ACTIVE_STATUSES.has(item.status)
    ));
    if (duplicate) return showError("appointment-error", t("duplicate"));

    const appointment = {
      id: randomId(),
      day: selectedDay,
      patientName: patientName.slice(0, 120),
      phone: phone.slice(0, 30),
      time,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    state.appointments.push(appointment);

    try {
      await saveState();
      el("patient-name").value = "";
      el("patient-phone").value = "";
      el("appointment-time").value = "";
      renderWorkspace();
      el("patient-name").focus();
    } catch {
      state.appointments = state.appointments.filter((item) => item.id !== appointment.id);
      showError("appointment-error", t("saveFailed"));
    }
  }

  async function saveSettings() {
    clearError("settings-error");
    const previous = { clinicName: state.clinicName, doctorName: state.doctorName };
    state.clinicName = el("settings-clinic").value.trim().slice(0, 120);
    state.doctorName = el("settings-doctor").value.trim().slice(0, 120);
    try {
      await saveState();
      renderWorkspace();
      showError("settings-error", t("settingsSaved"));
      el("settings-error").classList.remove("error");
      el("settings-error").classList.add("safe");
      setTimeout(() => {
        el("settings-error").classList.add("hidden");
        el("settings-error").classList.remove("safe");
        el("settings-error").classList.add("error");
      }, 1800);
    } catch {
      Object.assign(state, previous);
      showError("settings-error", t("saveFailed"));
    }
  }

  async function backup() {
    clearError("settings-error");
    try {
      const currentMeta = await readRecord(META_ID);
      const payload = await readRecord(PAYLOAD_ID);
      if (!currentMeta || !payload) throw new Error("missing_backup_data");
      const backupValue = { marker: BACKUP_MARKER, version: 1, meta: currentMeta, payload };
      const blob = new Blob([JSON.stringify(backupValue)], { type: "application/json" });
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
    return Boolean(
      value &&
      value.marker === BACKUP_MARKER &&
      value.version === 1 &&
      value.meta &&
      value.meta.id === META_ID &&
      value.meta.version === 1 &&
      Array.isArray(value.meta.salt) &&
      Number(value.meta.iterations) >= 100000 &&
      value.payload &&
      value.payload.id === PAYLOAD_ID &&
      Array.isArray(value.payload.iv) &&
      Array.isArray(value.payload.ciphertext) &&
      value.payload.ciphertext.length > 16
    );
  }

  async function restoreBackup(file) {
    clearError("settings-error");
    try {
      if (!file || file.size > 8 * 1024 * 1024) throw new Error("invalid_file");
      const value = JSON.parse(await file.text());
      if (!validBackup(value)) throw new Error("invalid_backup");
      await writeRecords([value.meta, value.payload]);
      meta = value.meta;
      applyLocale(meta.locale || "en");
      state = null;
      key = null;
      lockClinic();
      showError("unlock-error", t("restoreDone"));
    } catch {
      showError("settings-error", t("restoreFailed"));
    }
  }

  async function deleteLocalClinic() {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      if (db) db.close();
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("delete_failed"));
        request.onblocked = () => reject(new Error("delete_blocked"));
      });
      location.reload();
    } catch {
      showError("settings-error", t("saveFailed"));
    }
  }

  function bindEvents() {
    el("setup-form").addEventListener("submit", createClinic);
    el("unlock-form").addEventListener("submit", unlockClinic);
    el("appointment-form").addEventListener("submit", addAppointment);
    el("lock-button").addEventListener("click", lockClinic);
    el("save-settings").addEventListener("click", saveSettings);
    el("backup-button").addEventListener("click", backup);
    el("restore-button").addEventListener("click", () => el("restore-file").click());
    el("restore-file").addEventListener("change", () => {
      const file = el("restore-file").files && el("restore-file").files[0];
      if (file) void restoreBackup(file);
      el("restore-file").value = "";
    });
    el("delete-local").addEventListener("click", deleteLocalClinic);
    el("previous-day").addEventListener("click", () => { selectedDay = shiftDay(selectedDay, -1); renderWorkspace(); });
    el("today-day").addEventListener("click", () => { selectedDay = baghdadDay(); renderWorkspace(); });
    el("next-day").addEventListener("click", () => { selectedDay = shiftDay(selectedDay, 1); renderWorkspace(); });
    el("selected-day").addEventListener("change", () => {
      const value = el("selected-day").value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        selectedDay = value;
        renderWorkspace();
      }
    });
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);
  }

  async function init() {
    bindEvents();
    renderLanguageButtons();
    updateConnectionStatus();

    if (!("indexedDB" in window) || !crypto.subtle) {
      showError("setup-error", "Atlas Local needs a modern secure browser on this device.");
      return;
    }

    try {
      db = await openDb();
      meta = await readRecord(META_ID);
      if (meta && meta.version === 1) {
        applyLocale(meta.locale || "en");
        el("setup-screen").classList.add("hidden");
        el("unlock-screen").classList.remove("hidden");
      } else {
        el("setup-screen").classList.remove("hidden");
        el("unlock-screen").classList.add("hidden");
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/atlas-sw.js").catch(() => undefined);
      }
    } catch {
      showError("setup-error", t("setupFailed"));
    }
  }

  init();
})();
