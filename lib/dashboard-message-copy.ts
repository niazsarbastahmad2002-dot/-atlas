import type { UiLocale } from "./i18n/ui.ts";
import { dashboardMessages, type DashboardMessageCode } from "./messages.ts";

type DashboardMessageMap = Record<DashboardMessageCode, string>;

const ku: DashboardMessageMap = {
  clinic_invalid: "ناوی کلینیک دەبێت لە نێوان ٢ تا ١٢٠ پیت بێت.",
  clinic_create_failed: "دروستکردنی کلینیک سەرکەوتوو نەبوو. دووبارە هەوڵ بدە.",
  clinic_created: "کلینیک دروست کرا.",
  clinic_unavailable: "ئەم کلینیکە بەردەست نییە یان دەسەڵاتی چوونەژوورت نییە.",
  clinic_settings_invalid: "ڕێکخستنێکی دروست هەڵبژێرە و دووبارە هەوڵ بدە.",
  clinic_settings_update_failed: "ڕێکخستنەکانی کلینیک نوێ نەکرانەوە. دووبارە هەوڵ بدە.",
  clinic_settings_updated: "ڕێکخستنەکانی کلینیک نوێکرانەوە.",
  doctor_invalid: "زانیاری پزیشک بپشکنە و دووبارە هەوڵ بدە.",
  doctor_create_failed: "زیادکردنی پزیشک سەرکەوتوو نەبوو. دەسەڵاتەکانی کلینیک بپشکنە و دووبارە هەوڵ بدە.",
  doctor_created: "پزیشک زیاد کرا.",
  doctor_update_failed: "نوێکردنەوەی پزیشک سەرکەوتوو نەبوو. دەسەڵاتەکانی کلینیک بپشکنە و دووبارە هەوڵ بدە.",
  doctor_updated: "زانیاری پزیشک نوێکرایەوە.",
  doctor_archived: "پزیشک ئەرشیف کرا. وادە کۆنەکان مێژووی پزیشکەکە دەپارێزن.",
  doctor_restored: "پزیشک گەڕێندرایەوە.",
  appointment_invalid: "زانیاری وادەکە بپشکنە و دووبارە هەوڵ بدە.",
  appointment_phone_invalid: "ژمارەی مۆبایلی عێراقی دروست بنووسە، وەک 0750 000 0000.",
  appointment_time_invalid: "ڕێکەوت و کاتێکی داهاتووی دروست بە کاتی هەولێر هەڵبژێرە.",
  appointment_create_failed: "وادەکە پاشەکەوت نەکرا. دووبارە هەوڵ بدە.",
  appointment_created: "وادەکە پاشەکەوت کرا.",
  appointment_duplicate: "ئەم وادەیە پێشتر پاشەکەوت کراوە.",
  appointment_slot_taken: "ئەم پزیشکە لەم کاتەدا وادەیەکی تری هەیە. کاتێکی تر هەڵبژێرە.",
  appointment_status_invalid: "ئەم گۆڕینی دۆخی وادەیە ئێستا ڕێگەپێدراو نییە.",
  appointment_update_busy: "وادەکە هێشتا خەریکی نوێکردنەوەی بیرخستنەوەیە. کەمێک دواتر دووبارە هەوڵ بدە.",
  appointment_update_failed: "وادەکە نوێ نەکرایەوە. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.",
  appointment_updated: "دۆخی وادەکە نوێکرایەوە.",
  appointment_archive_failed: "وادەکە ئەرشیف نەکرا. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.",
  appointment_archived: "وادەکە ئەرشیف کرا و مێژووەکەی پارێزرا.",
  workspace_load_failed: "کلینیک بار نەبوو. پەڕەکە نوێ بکەرەوە و پەیوەندییەکە بپشکنە.",
};

const bd: DashboardMessageMap = {
  clinic_invalid: "ناڤێ کلینیکێ دبێت د ناڤبەرا ٢ تا ١٢٠ پیتان دا بیت.",
  clinic_create_failed: "دروستکرنا کلینیکێ سەرکەفتی نەبوو. دووبارە هەول بدە.",
  clinic_created: "کلینیک هاتە دروستکرن.",
  clinic_unavailable: "ڤێ کلینیکێ بەردەست نینە یان دەسەڵاتا چوونێ ژ بۆ تە نینە.",
  clinic_settings_invalid: "ڕێکخستنەکا دروست هەلبژێرە و دووبارە هەول بدە.",
  clinic_settings_update_failed: "ڕێکخستنێن کلینیکێ نەهاتنە نوێکرن. دووبارە هەول بدە.",
  clinic_settings_updated: "ڕێکخستنێن کلینیکێ هاتنە نوێکرن.",
  doctor_invalid: "زانیاریێن دکتۆری بپشکنە و دووبارە هەول بدە.",
  doctor_create_failed: "زێدەکرنا دکتۆری سەرکەفتی نەبوو. دەسەڵاتێن کلینیکێ بپشکنە و دووبارە هەول بدە.",
  doctor_created: "دکتۆر هاتە زێدەکرن.",
  doctor_update_failed: "نوێکرنا دکتۆری سەرکەفتی نەبوو. دەسەڵاتێن کلینیکێ بپشکنە و دووبارە هەول بدە.",
  doctor_updated: "زانیاریێن دکتۆری هاتنە نوێکرن.",
  doctor_archived: "دکتۆر هاتە ئەرشیفکرن. وادەیێن کەڤن مێژوویا دکتۆری دپارێزن.",
  doctor_restored: "دکتۆر هاتە ڤەگەڕاندن.",
  appointment_invalid: "زانیاریێن وادەیێ بپشکنە و دووبارە هەول بدە.",
  appointment_phone_invalid: "ژمارا موبایلا عێراقی یا دروست بنڤیسە، وەک 0750 000 0000.",
  appointment_time_invalid: "ڕۆژ و دەمەکێ داهاتی یێ دروست ب کاتێ هەولێرێ هەلبژێرە.",
  appointment_create_failed: "وادە نەهاتە پاراستن. دووبارە هەول بدە.",
  appointment_created: "وادە هاتە پاراستن.",
  appointment_duplicate: "ڤی وادەی پێشتر هاتیە پاراستن.",
  appointment_slot_taken: "ڤی دکتۆری ل ڤی دەمی وادە هەیە. دەمەکێ دی هەلبژێرە.",
  appointment_status_invalid: "ڤی گۆڕینا دۆخێ وادەیێ نوکە ڕێپێدایی نینە.",
  appointment_update_busy: "وادە هێشتا خەریکی نوێکرنا بیرخستنەوەیێیە. پشتی کەمێک دووبارە هەول بدە.",
  appointment_update_failed: "وادە نەهاتە نوێکرن. پەڕێ نوێ بکە و دووبارە هەول بدە.",
  appointment_updated: "دۆخێ وادەیێ هاتە نوێکرن.",
  appointment_archive_failed: "وادە نەهاتە ئەرشیفکرن. پەڕێ نوێ بکە و دووبارە هەول بدە.",
  appointment_archived: "وادە هاتە ئەرشیفکرن و مێژوویا وێ هاتە پاراستن.",
  workspace_load_failed: "کلینیک بار نەبوو. پەڕێ نوێ بکە و پەیوەندییێ بپشکنە.",
};

const ar: DashboardMessageMap = {
  clinic_invalid: "اسم العيادة لازم يكون بين حرفين و120 حرف.",
  clinic_create_failed: "تعذر إنشاء العيادة. حاول مرة ثانية.",
  clinic_created: "تم إنشاء العيادة.",
  clinic_unavailable: "هذه العيادة غير متاحة أو ما عندك صلاحية للدخول إليها.",
  clinic_settings_invalid: "اختار إعداد عيادة صحيح وحاول مرة ثانية.",
  clinic_settings_update_failed: "تعذر تحديث إعدادات العيادة. حاول مرة ثانية.",
  clinic_settings_updated: "تم تحديث إعدادات العيادة.",
  doctor_invalid: "راجع بيانات الطبيب وحاول مرة ثانية.",
  doctor_create_failed: "تعذر إضافة الطبيب. راجع صلاحيات العيادة وحاول مرة ثانية.",
  doctor_created: "تمت إضافة الطبيب.",
  doctor_update_failed: "تعذر تحديث الطبيب. راجع صلاحيات العيادة وحاول مرة ثانية.",
  doctor_updated: "تم تحديث الطبيب.",
  doctor_archived: "تمت أرشفة الطبيب، والمواعيد السابقة تحتفظ بسجل الطبيب.",
  doctor_restored: "تمت استعادة الطبيب.",
  appointment_invalid: "راجع تفاصيل الموعد وحاول مرة ثانية.",
  appointment_phone_invalid: "اكتب رقم موبايل عراقي صحيح، مثل 0750 000 0000.",
  appointment_time_invalid: "اختار تاريخ ووقت قادم صحيح بتوقيت أربيل.",
  appointment_create_failed: "تعذر حفظ الموعد. حاول مرة ثانية.",
  appointment_created: "تم حفظ الموعد.",
  appointment_duplicate: "هذا الموعد محفوظ مسبقاً.",
  appointment_slot_taken: "لدى هذا الطبيب موعد في هذا الوقت. اختر وقتاً آخر.",
  appointment_status_invalid: "تغيير حالة هذا الموعد غير مسموح حالياً.",
  appointment_update_busy: "الموعد ما زال يعالج التذكير. حاول بعد لحظة.",
  appointment_update_failed: "تعذر تحديث الموعد. حدّث الصفحة وحاول مرة ثانية.",
  appointment_updated: "تم تحديث حالة الموعد.",
  appointment_archive_failed: "تعذرت أرشفة الموعد. حدّث الصفحة وحاول مرة ثانية.",
  appointment_archived: "تمت أرشفة الموعد مع الاحتفاظ بسجله.",
  workspace_load_failed: "تعذر تحميل العيادة. حدّث الصفحة وتأكد من الاتصال.",
};

function isDashboardMessageCode(value: string): value is DashboardMessageCode {
  return value in dashboardMessages;
}

export function localizedDashboardMessage(code: string | null | undefined, locale: UiLocale) {
  if (!code || !isDashboardMessageCode(code)) return null;
  if (locale === "en") return dashboardMessages[code];
  if (locale === "ku") return ku[code];
  if (locale === "bd") return bd[code];
  return ar[code];
}

export function localizeDashboardMessageText(message: string, locale: UiLocale) {
  if (locale === "en") return message;
  const entry = (Object.entries(dashboardMessages) as Array<[DashboardMessageCode, string]>).find(([, english]) => english === message);
  return entry ? localizedDashboardMessage(entry[0], locale) ?? message : message;
}
