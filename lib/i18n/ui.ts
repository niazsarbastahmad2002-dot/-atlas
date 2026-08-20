export type UiLocale = "en" | "ku" | "bd" | "ar";

export const defaultUiLocale: UiLocale = "en";

export const uiLocaleMeta: Record<UiLocale, { language: string; direction: "ltr" | "rtl"; dateLocale: string; label: string; nativeLabel: string }> = {
  en: { language: "en", direction: "ltr", dateLocale: "en-IQ", label: "English", nativeLabel: "English" },
  ku: { language: "ckb", direction: "rtl", dateLocale: "ckb-IQ", label: "Kurdish (Sorani)", nativeLabel: "کوردی (سۆرانی)" },
  bd: { language: "ku", direction: "rtl", dateLocale: "ckb-IQ", label: "Kurdish (Badini)", nativeLabel: "کوردی (بادینی)" },
  ar: { language: "ar", direction: "rtl", dateLocale: "ar-IQ", label: "Arabic", nativeLabel: "العربية" },
};

export function isUiLocale(value: string | undefined | null): value is UiLocale {
  return value === "en" || value === "ku" || value === "bd" || value === "ar";
}

type UiText = {
  atlas: string;
  schedule: string;
  settings: string;
  add: string;
  today: string;
  todayAppointments: string;
  confirmed: string;
  remindersSent: string;
  newAppointment: string;
  patientName: string;
  iraqiMobile: string;
  phoneHelp: string;
  doctor: string;
  chooseDoctor: string;
  reminderLanguage: string;
  reminderConsent: string;
  reminderConsentHelp: string;
  saveAppointment: string;
  saving: string;
  reminderOff: string;
  reminderScheduled: string;
  appointments: string;
  active: string;
  noAppointments: string;
  noAppointmentsHelp: string;
  time: string;
  status: string;
  reminderQueued: string;
  reminderSending: string;
  reminderSent: string;
  reminderDelivered: string;
  reminderRead: string;
  reminderFailed: string;
  reminderCancelled: string;
  pending: string;
  cancelled: string;
  completed: string;
  noShow: string;
  reopen: string;
  confirm: string;
  cancel: string;
  complete: string;
  patientLink: string;
  archive: string;
  clinicWorkspace: string;
  switch: string;
  privacyNote: string;
  erbilTime: string;
  settingsTitle: string;
  settingsSubtitle: string;
  interface: string;
  interfaceLanguage: string;
  interfaceLanguageHelp: string;
  saveLanguage: string;
  clinic: string;
  doctorsScheduling: string;
  defaultInterval: string;
  intervalHelp: string;
  saveInterval: string;
  addDoctor: string;
  doctorName: string;
  saveName: string;
  moveUp: string;
  moveDown: string;
  restore: string;
  doctorAvailable: string;
  doctorArchived: string;
  communication: string;
  whatsappReminders: string;
  reminderSettings: string;
  reminderSettingsHelp: string;
  team: string;
  staff: string;
  staffHelp: string;
  manage: string;
  account: string;
  signedInAs: string;
  signOut: string;
  backToSchedule: string;
  openSettings: string;
  openSchedule: string;
  clinicSetup: string;
  firstSetup: string;
  createWorkspace: string;
  clinicName: string;
  useSynthetic: string;
  loginEyebrow: string;
  loginTitle: string;
  loginSubtitle: string;
  continueGoogle: string;
  googleHelp: string;
  emailFallback: string;
  workEmail: string;
  sendLink: string;
  sending: string;
  linkSent: string;
  tryLater: string;
  demoPrompt: string;
  openDemo: string;
  demoHelp: string;
  googleUnavailable: string;
  todayHeading: string;
  todaySubheading: string;
};

const en: UiText = {
  atlas: "Atlas",
  schedule: "Schedule",
  settings: "Settings",
  add: "Add",
  today: "Today",
  todayAppointments: "Today’s appointments",
  confirmed: "Confirmed",
  remindersSent: "Reminders sent",
  newAppointment: "New appointment",
  patientName: "Patient name",
  iraqiMobile: "Iraqi mobile number",
  phoneHelp: "Stored safely in +964 format for reminders.",
  doctor: "Doctor",
  chooseDoctor: "Choose doctor",
  reminderLanguage: "Patient reminder language",
  reminderConsent: "The patient agreed to receive a WhatsApp appointment reminder.",
  reminderConsentHelp: "A reminder is queued only after consent and clinic messaging approval.",
  saveAppointment: "Save appointment",
  saving: "Saving…",
  reminderOff: "Reminders off",
  reminderScheduled: "WhatsApp reminders are scheduled {minutes} minutes before each appointment.",
  appointments: "Appointments",
  active: "active",
  noAppointments: "No appointments yet.",
  noAppointmentsHelp: "Add the first appointment to start today’s schedule.",
  time: "Time",
  status: "Status",
  reminderQueued: "Reminder queued",
  reminderSending: "Sending reminder",
  reminderSent: "Reminder sent",
  reminderDelivered: "Reminder delivered",
  reminderRead: "Reminder read",
  reminderFailed: "Reminder failed",
  reminderCancelled: "Reminder cancelled",
  pending: "Pending",
  cancelled: "Cancelled",
  completed: "Completed",
  noShow: "No-show",
  reopen: "Reopen",
  confirm: "Confirm",
  cancel: "Cancel",
  complete: "Complete",
  patientLink: "Patient link",
  archive: "Archive",
  clinicWorkspace: "Clinic workspace",
  switch: "Switch",
  privacyNote: "Scheduling only — do not enter medical notes.",
  erbilTime: "Erbil time",
  settingsTitle: "Settings",
  settingsSubtitle: "Keep Atlas simple for the front desk and configure the clinic in one place.",
  interface: "App",
  interfaceLanguage: "Interface language",
  interfaceLanguageHelp: "Changes Atlas navigation and core workspace language on this browser.",
  saveLanguage: "Apply language",
  clinic: "Clinic",
  doctorsScheduling: "Doctors & scheduling",
  defaultInterval: "Default appointment interval",
  intervalHelp: "Used to build the quick slot list. Staff can still choose a custom time.",
  saveInterval: "Save interval",
  addDoctor: "Add doctor",
  doctorName: "Doctor name",
  saveName: "Save name",
  moveUp: "Move up",
  moveDown: "Move down",
  restore: "Restore",
  doctorAvailable: "Available for new appointments.",
  doctorArchived: "Archived; existing appointment history is preserved.",
  communication: "Communication",
  whatsappReminders: "WhatsApp reminders",
  reminderSettings: "Reminder settings",
  reminderSettingsHelp: "Lead time, patient language and provider activation.",
  team: "Team",
  staff: "Staff",
  staffHelp: "Owner-only access for managers and receptionists.",
  manage: "Manage",
  account: "Account",
  signedInAs: "Signed in as",
  signOut: "Sign out",
  backToSchedule: "Back to schedule",
  openSettings: "Open settings",
  openSchedule: "Open schedule",
  clinicSetup: "Clinic setup",
  firstSetup: "First setup",
  createWorkspace: "Create workspace",
  clinicName: "Clinic name",
  useSynthetic: "Use invented details during setup and product testing.",
  loginEyebrow: "Clinic access",
  loginTitle: "Open Atlas in one tap.",
  loginSubtitle: "Use your Google account once. Atlas keeps your clinic session on this device until you sign out.",
  continueGoogle: "Continue with Google",
  googleHelp: "Best for the everyday receptionist workflow.",
  emailFallback: "Use email link instead",
  workEmail: "Work email",
  sendLink: "Send sign-in link",
  sending: "Sending…",
  linkSent: "Link sent",
  tryLater: "Try again later",
  demoPrompt: "Want to try Atlas without a clinic account?",
  openDemo: "Open test workspace",
  demoHelp: "No email required. Test data stays separate from clinic records.",
  googleUnavailable: "Google sign-in still needs the clinic’s Google OAuth credentials. Use the email link for now.",
  todayHeading: "Front desk",
  todaySubheading: "Everything the receptionist needs for today, without the settings clutter.",
};

const ku: UiText = {
  atlas: "Atlas",
  schedule: "خشتەی وادەکان",
  settings: "ڕێکخستنەکان",
  add: "زیادکردن",
  today: "ئەمڕۆ",
  todayAppointments: "وادەکانی ئەمڕۆ",
  confirmed: "پشتڕاستکراوە",
  remindersSent: "بیرخستنەوە نێردراوەکان",
  newAppointment: "وادەی نوێ",
  patientName: "ناوی نەخۆش",
  iraqiMobile: "ژمارەی مۆبایلی عێراقی",
  phoneHelp: "بۆ بیرخستنەوە بە شێوەی +964 تۆمار دەکرێت.",
  doctor: "پزیشک",
  chooseDoctor: "پزیشک هەڵبژێرە",
  reminderLanguage: "زمانی بیرخستنەوەی نەخۆش",
  reminderConsent: "نەخۆش ڕازییە بیرخستنەوەی وادە لە واتسئاپ وەربگرێت.",
  reminderConsentHelp: "تەنها دوای ڕەزامەندی نەخۆش و پەسەندکردنی پەیام لەلایەن کلینیکەوە بیرخستنەوەکە ئامادە دەکرێت.",
  saveAppointment: "وادە دابنێ",
  saving: "چاوەڕێ بکە…",
  reminderOff: "بیرخستنەوەکان ناچالاکن",
  reminderScheduled: "بیرخستنەوەی واتسئاپ {minutes} خولەک پێش وادە نێردراو دەبێت.",
  appointments: "وادەکان",
  active: "چالاک",
  noAppointments: "هێشتا هیچ وادەیەک نییە.",
  noAppointmentsHelp: "یەکەم وادە زیاد بکە بۆ دەستپێکردنی خشتەی ئەمڕۆ.",
  time: "کات",
  status: "دۆخ",
  reminderQueued: "بیرخستنەوە چاوەڕوانە",
  reminderSending: "بیرخستنەوە دەنێردرێت",
  reminderSent: "بیرخستنەوە نێردرا",
  reminderDelivered: "بیرخستنەوە گەیشت",
  reminderRead: "بیرخستنەوە خوێندرایەوە",
  reminderFailed: "بیرخستنەوە سەرکەوتوو نەبوو",
  reminderCancelled: "بیرخستنەوە هەڵوەشێنرایەوە",
  pending: "چاوەڕوان",
  cancelled: "هەڵوەشێنراوە",
  completed: "تەواوبوو",
  noShow: "نەهات",
  reopen: "کردنەوە",
  confirm: "پشتڕاستکردنەوە",
  cancel: "هەڵوەشاندنەوە",
  complete: "تەواو",
  patientLink: "بەستەری نەخۆش",
  archive: "ئەرشیف",
  clinicWorkspace: "کلینیک",
  switch: "گۆڕین",
  privacyNote: "تەنها بۆ وادەدانان — تێبینی پزیشکی مەنووسە.",
  erbilTime: "کاتی هەولێر",
  settingsTitle: "ڕێکخستنەکان",
  settingsSubtitle: "Atlas بۆ ڕیسێپشن سادە بهێڵەوە و ڕێکخستنەکانی کلینیک لە یەک شوێن بەڕێوەببە.",
  interface: "ئەپ",
  interfaceLanguage: "زمانی ئەپ",
  interfaceLanguageHelp: "زمانی بەشە سەرەکییەکانی Atlas لەم وێبگەڕە دەگۆڕێت.",
  saveLanguage: "زمان بگۆڕە",
  clinic: "کلینیک",
  doctorsScheduling: "پزیشکان و وادەکان",
  defaultInterval: "ماوەی نێوان وادەکان",
  intervalHelp: "بۆ دروستکردنی کاتە خێراکانە؛ هەر کاتێک پێویست بێت دەتوانیت کاتی تایبەت هەڵبژێریت.",
  saveInterval: "ماوە بگۆڕە",
  addDoctor: "پزیشک زیاد بکە",
  doctorName: "ناوی پزیشک",
  saveName: "ناو بگۆڕە",
  moveUp: "بەرەو سەرەوە",
  moveDown: "بەرەو خوارەوە",
  restore: "گەڕاندنەوە",
  doctorAvailable: "بۆ وادەی نوێ بەردەستە.",
  doctorArchived: "ئەرشیف کراوە؛ مێژووی وادەکان پارێزراوە.",
  communication: "پەیوەندی",
  whatsappReminders: "بیرخستنەوەکانی واتسئاپ",
  reminderSettings: "ڕێکخستنی بیرخستنەوە",
  reminderSettingsHelp: "کاتی ناردن، زمانی نەخۆش و چالاککردنی واتسئاپ.",
  team: "تیم",
  staff: "ستاف",
  staffHelp: "خاوەن کلینیک دەتوانێت بەڕێوەبەر و ستافی ڕیسێپشن زیاد یان لاببات.",
  manage: "بەڕێوەبردن",
  account: "هەژمار",
  signedInAs: "چوویتە ژوورەوە وەک",
  signOut: "چوونەدەرەوە",
  backToSchedule: "گەڕانەوە بۆ وادەکان",
  openSettings: "ڕێکخستنەکان بکەرەوە",
  openSchedule: "وادەکان بکەرەوە",
  clinicSetup: "ڕێکخستنی کلینیک",
  firstSetup: "ڕێکخستنی یەکەم",
  createWorkspace: "کلینیک دروست بکە",
  clinicName: "ناوی کلینیک",
  useSynthetic: "لە تاقیکردنەوەدا تەنها زانیاری ساختە بەکاربهێنە.",
  loginEyebrow: "چوونەژوورەوەی کلینیک",
  loginTitle: "Atlas بە یەک دەستدان بکەرەوە.",
  loginSubtitle: "یەک جار هەژماری Google هەڵبژێرە. Atlas تا کاتی چوونەدەرەوە لەم ئامێرە چوونەژوورەوەکەت دەپارێزێت.",
  continueGoogle: "بە Google بەردەوام بە",
  googleHelp: "هەڵبژاردەی ئاسان بۆ کاری ڕۆژانەی ڕیسێپشن.",
  emailFallback: "بەستەری ئیمەیڵ بەکاربهێنە",
  workEmail: "ئیمەیڵی کار",
  sendLink: "بەستەری چوونەژوورەوە بنێرە",
  sending: "دەنێردرێت…",
  linkSent: "بەستەر نێردرا",
  tryLater: "دواتر هەوڵ بدەوە",
  demoPrompt: "دەتەوێت Atlas بێ هەژماری کلینیک تاقی بکەیتەوە؟",
  openDemo: "بەشی تاقیکردنەوە بکەرەوە",
  demoHelp: "ئیمەیڵ پێویست نییە. داتای تاقیکردنەوە لە داتای کلینیک جیا دەبێت.",
  googleUnavailable: "چوونەژوورەوە بە Google هێشتا پێویستی بە زانیاری OAuth ـی کلینیک هەیە. فعلاً بەستەری ئیمەیڵ بەکاربهێنە.",
  todayHeading: "ڕیسێپشن",
  todaySubheading: "هەموو ئەوەی ستافی ڕیسێپشن بۆ ئەمڕۆ پێویستی پێیە، بەبێ شڵەژانی ڕێکخستنەکان.",
};

const bd: UiText = {
  atlas: "Atlas",
  schedule: "خشتەیا وادەیان",
  settings: "ڕێکخستن",
  add: "زێدەکرن",
  today: "ئەڤرۆ",
  todayAppointments: "وادەیێن ئەڤرۆ",
  confirmed: "پشتڕاستکری",
  remindersSent: "بیرخستنەوە هاتنە هنارتن",
  newAppointment: "وادەیا نوو",
  patientName: "ناڤێ نەخۆشی",
  iraqiMobile: "ژمارا مۆبایلا عێراقی",
  phoneHelp: "ژمارە ب شێوەی +964 بۆ بیرخستنەوەیان دهێتە پاراستن.",
  doctor: "دکتۆر",
  chooseDoctor: "دکتۆر هەلبژێرە",
  reminderLanguage: "زمانێ بیرخستنەوەیا نەخۆشی",
  reminderConsent: "نەخۆش ڕازییە بیرخستنەوەیا وادەیێ ل واتسئاپێ وەربگریت.",
  reminderConsentHelp: "بیرخستنەوە پشتی ڕەزامەندیا نەخۆشی و پەسەندکرنا پەیاما کلینیکێ ئامادە دبیت.",
  saveAppointment: "وادەیێ پارێزە",
  saving: "دهێتە پاراستن…",
  reminderOff: "بیرخستنەوە نەچالاکن",
  reminderScheduled: "بیرخستنەوەیا واتسئاپێ {minutes} خولەک بەری وادەیێ دهێتە هنارتن.",
  appointments: "وادە",
  active: "چالاک",
  noAppointments: "هێشتا چ وادە نینن.",
  noAppointmentsHelp: "وادەیا ئێکێ زێدە بکە بۆ دەستپێکرنا خشتەیا ئەڤرۆ.",
  time: "کات",
  status: "بار",
  reminderQueued: "بیرخستنەوە چاڤەڕێیە",
  reminderSending: "بیرخستنەوە دهێتە هنارتن",
  reminderSent: "بیرخستنەوە هاتە هنارتن",
  reminderDelivered: "بیرخستنەوە گەهشت",
  reminderRead: "بیرخستنەوە هاتە خواندن",
  reminderFailed: "بیرخستنەوە سەرنەکەفت",
  reminderCancelled: "بیرخستنەوە هاتە هەلوەشاندن",
  pending: "چاڤەڕێ",
  cancelled: "هەلوەشاندی",
  completed: "تەمام",
  noShow: "نەهات",
  reopen: "دووبارە ڤەکە",
  confirm: "پشتڕاست بکە",
  cancel: "هەلوەشێنە",
  complete: "تەمام بکە",
  patientLink: "لینکێ نەخۆشی",
  archive: "ئەرشیڤ",
  clinicWorkspace: "کلینیک",
  switch: "بگۆڕە",
  privacyNote: "تەنێ بۆ وادەیانە — تێبینیێن پزیشکی ل ڤێرێ نەنووسە.",
  erbilTime: "دەمێ هەولێرێ",
  settingsTitle: "ڕێکخستن",
  settingsSubtitle: "Atlas بۆ ڕیسێپشنێ سادە بهێلە و ڕێکخستنێن کلینیکێ ل جهەکێ بەڕێڤە ببە.",
  interface: "ئەپ",
  interfaceLanguage: "زمانێ ئەپێ",
  interfaceLanguageHelp: "زمانێ بەشێن سەرەکی یێن Atlas ل ڤێ وێبگەڕێ دگۆڕیت.",
  saveLanguage: "زمان بگۆڕە",
  clinic: "کلینیک",
  doctorsScheduling: "دکتۆر و وادە",
  defaultInterval: "ماوەیا ناڤبەرا وادەیان",
  intervalHelp: "بۆ دروستکرنا کاتێن خێرا دهێتە بکارئینان؛ هەر دەم دکاریت کاتەکێ تایبەت هەلبژێریت.",
  saveInterval: "ماوە بپارێزە",
  addDoctor: "دکتۆر زێدە بکە",
  doctorName: "ناڤێ دکتۆری",
  saveName: "ناڤ بپارێزە",
  moveUp: "بۆ سەر",
  moveDown: "بۆ خوار",
  restore: "ڤەگەرینە",
  doctorAvailable: "بۆ وادەیێن نوو بەردەستە.",
  doctorArchived: "ئەرشیڤ کرییە؛ مێژوویا وادەیان پاراستییە.",
  communication: "پەیوەندی",
  whatsappReminders: "بیرخستنەوەیێن واتسئاپێ",
  reminderSettings: "ڕێکخستنا بیرخستنەوەیێ",
  reminderSettingsHelp: "دەمێ هنارتنێ، زمانێ نەخۆشی و چالاککرنا واتسئاپێ.",
  team: "تیم",
  staff: "ستاف",
  staffHelp: "خودانێ کلینیکێ دشێت بەڕێڤەبەر و ستافێ ڕیسێپشنێ زێدە یان کێم بکەت.",
  manage: "بەڕێڤەببە",
  account: "هەژمار",
  signedInAs: "تو چوویە ژوور وەک",
  signOut: "بچۆ دەرڤە",
  backToSchedule: "ڤەگەرە بۆ وادەیان",
  openSettings: "ڕێکخستن ڤەکە",
  openSchedule: "وادە ڤەکە",
  clinicSetup: "ڕێکخستنا کلینیکێ",
  firstSetup: "ڕێکخستنا ئێکێ",
  createWorkspace: "کلینیک دروست بکە",
  clinicName: "ناڤێ کلینیکێ",
  useSynthetic: "ل دەمێ تاقیکرنێ تەنێ زانیاریێن ساختە بکاربینە.",
  loginEyebrow: "چوونەژوورا کلینیکێ",
  loginTitle: "Atlas ب تەنێ ئێک دەستدانێ ڤەکە.",
  loginSubtitle: "ئێک جار هەژمارێ Google هەلبژێرە. Atlas تا دەمێ تو دەرکەڤی چوونەژوورا تە ل ڤێ ئامێرێ دپارێزیت.",
  continueGoogle: "ب Google بەردەوام بە",
  googleHelp: "هەلبژاردەیا ئاسان بۆ کارێ ڕۆژانە یێ ڕیسێپشنێ.",
  emailFallback: "لینکێ ئیمەیڵێ بکاربینە",
  workEmail: "ئیمەیلا کاری",
  sendLink: "لینکێ چوونەژوورێ بهنێرە",
  sending: "دهێتە هنارتن…",
  linkSent: "لینک هاتە هنارتن",
  tryLater: "پاشتر هەول بدە",
  demoPrompt: "دخوازیت Atlas بێ هەژمارێ کلینیکێ تاقی بکەیت؟",
  openDemo: "بەشێ تاقیکرنێ ڤەکە",
  demoHelp: "ئیمەیل پێدڤی نینە. داتایێن تاقیکرنێ ژ داتایێن کلینیکێ جودانە.",
  googleUnavailable: "چوونەژوور ب Google هێشتا پێدڤی ب زانیاریێن OAuth یێن کلینیکێ هەیە. نوکە لینکێ ئیمەیلێ بکاربینە.",
  todayHeading: "ڕیسێپشن",
  todaySubheading: "هەر تشتێ ستافێ ڕیسێپشنێ بۆ ئەڤرۆ پێدڤی پێ هەیە، بێ ئاڵۆزییا ڕێکخستنان.",
};

const ar: UiText = {
  atlas: "Atlas",
  schedule: "المواعيد",
  settings: "الإعدادات",
  add: "إضافة",
  today: "اليوم",
  todayAppointments: "مواعيد اليوم",
  confirmed: "مؤكدة",
  remindersSent: "التذكيرات المرسلة",
  newAppointment: "موعد جديد",
  patientName: "اسم المريض",
  iraqiMobile: "رقم الموبايل العراقي",
  phoneHelp: "يُحفظ بصيغة +964 لاستخدامه في التذكيرات.",
  doctor: "الطبيب",
  chooseDoctor: "اختر الطبيب",
  reminderLanguage: "لغة تذكير المريض",
  reminderConsent: "وافق المريض على استلام تذكير بالموعد عبر واتساب.",
  reminderConsentHelp: "يُدرج التذكير فقط بعد موافقة المريض واعتماد رسائل العيادة.",
  saveAppointment: "حفظ الموعد",
  saving: "جارٍ الحفظ…",
  reminderOff: "التذكيرات متوقفة",
  reminderScheduled: "يتم إرسال تذكير واتساب قبل الموعد بـ {minutes} دقيقة.",
  appointments: "المواعيد",
  active: "نشط",
  noAppointments: "لا توجد مواعيد بعد.",
  noAppointmentsHelp: "أضف أول موعد لبدء جدول اليوم.",
  time: "الوقت",
  status: "الحالة",
  reminderQueued: "التذكير في الانتظار",
  reminderSending: "جارٍ إرسال التذكير",
  reminderSent: "تم إرسال التذكير",
  reminderDelivered: "تم تسليم التذكير",
  reminderRead: "تمت قراءة التذكير",
  reminderFailed: "فشل التذكير",
  reminderCancelled: "تم إلغاء التذكير",
  pending: "قيد الانتظار",
  cancelled: "ملغي",
  completed: "مكتمل",
  noShow: "لم يحضر",
  reopen: "إعادة فتح",
  confirm: "تأكيد",
  cancel: "إلغاء",
  complete: "إكمال",
  patientLink: "رابط المريض",
  archive: "أرشفة",
  clinicWorkspace: "العيادة",
  switch: "تبديل",
  privacyNote: "للمواعيد فقط — لا تُدخل ملاحظات طبية.",
  erbilTime: "توقيت أربيل",
  settingsTitle: "الإعدادات",
  settingsSubtitle: "اجعل Atlas بسيطاً للاستقبال واضبط العيادة كلها من مكان واحد.",
  interface: "التطبيق",
  interfaceLanguage: "لغة الواجهة",
  interfaceLanguageHelp: "تغيّر لغة التنقل ومساحة العمل الأساسية في Atlas على هذا المتصفح.",
  saveLanguage: "تطبيق اللغة",
  clinic: "العيادة",
  doctorsScheduling: "الأطباء والجدولة",
  defaultInterval: "الفاصل الافتراضي بين المواعيد",
  intervalHelp: "يُستخدم لبناء قائمة الأوقات السريعة، مع بقاء الوقت المخصص متاحاً.",
  saveInterval: "حفظ الفاصل",
  addDoctor: "إضافة طبيب",
  doctorName: "اسم الطبيب",
  saveName: "حفظ الاسم",
  moveUp: "لأعلى",
  moveDown: "لأسفل",
  restore: "استعادة",
  doctorAvailable: "متاح للمواعيد الجديدة.",
  doctorArchived: "مؤرشف؛ تم الاحتفاظ بسجل المواعيد السابق.",
  communication: "التواصل",
  whatsappReminders: "تذكيرات واتساب",
  reminderSettings: "إعدادات التذكير",
  reminderSettingsHelp: "وقت الإرسال واللغة وتفعيل المزود.",
  team: "الفريق",
  staff: "الموظفون",
  staffHelp: "إدارة المديرين وموظفي الاستقبال بواسطة مالك العيادة فقط.",
  manage: "إدارة",
  account: "الحساب",
  signedInAs: "مسجل الدخول باسم",
  signOut: "تسجيل الخروج",
  backToSchedule: "العودة إلى المواعيد",
  openSettings: "فتح الإعدادات",
  openSchedule: "فتح المواعيد",
  clinicSetup: "إعداد العيادة",
  firstSetup: "الإعداد الأول",
  createWorkspace: "إنشاء العيادة",
  clinicName: "اسم العيادة",
  useSynthetic: "استخدم بيانات وهمية فقط أثناء الإعداد والاختبار.",
  loginEyebrow: "دخول العيادة",
  loginTitle: "افتح Atlas بلمسة واحدة.",
  loginSubtitle: "اختر حساب Google مرة واحدة. يحافظ Atlas على جلسة العيادة على هذا الجهاز حتى تسجل الخروج.",
  continueGoogle: "المتابعة باستخدام Google",
  googleHelp: "الخيار الأسرع لعمل الاستقبال اليومي.",
  emailFallback: "استخدام رابط البريد بدلاً من ذلك",
  workEmail: "بريد العمل",
  sendLink: "إرسال رابط الدخول",
  sending: "جارٍ الإرسال…",
  linkSent: "تم إرسال الرابط",
  tryLater: "حاول لاحقاً",
  demoPrompt: "هل تريد تجربة Atlas بدون حساب عيادة؟",
  openDemo: "فتح مساحة الاختبار",
  demoHelp: "لا يلزم بريد إلكتروني. تبقى بيانات الاختبار منفصلة عن سجلات العيادة.",
  googleUnavailable: "تسجيل الدخول عبر Google ما زال يحتاج بيانات OAuth الخاصة بالعيادة. استخدم رابط البريد حالياً.",
  todayHeading: "الاستقبال",
  todaySubheading: "كل ما يحتاجه موظف الاستقبال لليوم، بدون ازدحام الإعدادات.",
};

const copy: Record<UiLocale, UiText> = { en, ku, bd, ar };

export function uiText(locale: UiLocale) {
  return copy[locale];
}

function badiniNumericDate(date: Date, withWeekday: boolean) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: withWeekday ? "short" : undefined,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = ["یەکشەم", "دووشەم", "سێشەم", "چوارشەم", "پێنجشەم", "هەینی", "شەمبی"][date.getDay()] ?? "";
  const numeric = `${values.day}/${values.month}/${values.year}`.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  return withWeekday ? `${weekday}، ${numeric}` : numeric;
}

export function formatBaghdadDateTime(date: Date, locale: UiLocale) {
  if (locale === "bd") {
    const dateText = badiniNumericDate(date, false);
    const time = new Intl.DateTimeFormat("en-IQ", {
      timeZone: "Asia/Baghdad",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return `${dateText} · ${time}`;
  }
  return new Intl.DateTimeFormat(uiLocaleMeta[locale].dateLocale, {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBaghdadDay(date: Date, locale: UiLocale) {
  if (locale === "bd") return badiniNumericDate(date, true);
  return new Intl.DateTimeFormat(uiLocaleMeta[locale].dateLocale, {
    timeZone: "Asia/Baghdad",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
