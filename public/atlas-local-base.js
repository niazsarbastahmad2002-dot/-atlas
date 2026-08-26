"use strict";
const copy = { en: EN, ku: KU, bd: BD, ar: AR };
const el = (id) => document.getElementById(id);
const clone = (value) => JSON.parse(JSON.stringify(value));
let locale = "en";
let db = null;
let meta = null;
let key = null;
let state = null;
let selectedDay = baghdadDay();
let editingId = null;
let autoLockTimer = null;
let lastActivity = Date.now();

function t(k) {
  return (copy[locale] && copy[locale][k]) || EN[k] || k;
}
function showError(id, msg) {
  const node = el(id);
  node.textContent = msg;
  node.classList.remove("hidden");
}
function clearError(id) {
  const node = el(id);
  node.textContent = "";
  node.classList.add("hidden");
}
function baghdadDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function shiftDay(day, amount) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return baghdadDay(date);
}
function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
}
function localeTag() {
  return locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : locale === "bd" ? "ckb-IQ" : "en-IQ";
}
function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return value || "—";
  const date = new Date(`2000-01-01T${value}:00+03:00`);
  return new Intl.DateTimeFormat(localeTag(), {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat(localeTag(), {
      timeZone: "Asia/Baghdad",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
function minuteLabel(value) {
  return `${value} ${t("minutes")}`;
}
function addMinutes(time, amount) {
  const match = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!match) return "";
  const total = ((Number(match[1]) * 60 + Number(match[2]) + amount) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function applyLocale(nextLocale) {
  locale = copy[nextLocale] ? nextLocale : "en";
  document.documentElement.lang = locale === "ku" ? "ckb" : locale === "bd" ? "ku" : locale;
  document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
  document.querySelectorAll("[data-t]").forEach((node) => {
    const value = t(node.dataset.t);
    if (value) node.textContent = value;
  });
  el("schedule-search").placeholder = t("search");
  el("history-search").placeholder = t("searchActivity");
  renderStaticOptions();
  renderLanguageButtons();
  updateDeviceStatus();
}
function renderStaticOptions() {
  const lock = el("settings-lock");
  const currentLock = lock.value;
  lock.replaceChildren();
  [0, 5, 15, 30, 60].forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = value === 0 ? t("never") : minuteLabel(value);
    lock.append(option);
  });
  if ([...lock.options].some((option) => option.value === currentLock)) lock.value = currentLock;

  ["new-doctor-interval"].forEach((id) => {
    const select = el(id);
    const current = select.value || "15";
    select.replaceChildren();
    [5, 10, 15, 20, 30].forEach((value) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = minuteLabel(value);
      select.append(option);
    });
    select.value = current;
  });
}
function renderLanguageButtons() {
  const languages = [["en", "English"], ["ku", "کوردی (سۆرانی)"], ["bd", "کوردی (بادینی)"], ["ar", "العربية"]];
  document.querySelectorAll("[data-language-buttons]").forEach((root) => {
    root.replaceChildren();
    languages.forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (value === locale) button.classList.add("active");
      button.onclick = () => applyLocale(value);
      root.append(button);
    });
  });
}
function updateDeviceStatus() {
  el("device-status").textContent = t("device");
}
