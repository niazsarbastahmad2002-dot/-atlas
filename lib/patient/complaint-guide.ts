import type { UiLocale } from "@/lib/i18n/ui";

// CLINICALLY INFORMED DRAFT — NOT CLINICIAN-APPROVED.
// This is navigation guidance, never diagnosis or triage clearance.
// A named clinical reviewer must approve mappings, red flags and all translations
// before the complaint guide can be deployed publicly.
type FourLanguages = Record<UiLocale, string>;

export type SpecialtyKey =
  | "general-medicine" | "neurology" | "orthopedics"
  | "dermatology" | "ent" | "ophthalmology"
  | "gastroenterology" | "urology" | "dentistry" | "pediatrics";

export type ComplaintCategory = "head-face" | "back-joints-skin" | "belly-urinary" | "children";

// UI-only group labels. The group does not determine specialty, urgency or diagnosis.
export const complaintCategories: readonly { id: ComplaintCategory; name: FourLanguages }[] = [
  { id: "head-face", name: { en: "Head, face & throat", ku: "سەر، ڕوو و قوڕگ", bd: "سەر، ڕوو و ئەڤری", ar: "الرأس والوجه والحلق" } },
  { id: "back-joints-skin", name: { en: "Back, joints & skin", ku: "پشت، جومگە و پێست", bd: "پشت، مەفاصل و پێست", ar: "الظهر والمفاصل والجلد" } },
  { id: "belly-urinary", name: { en: "Belly & urination", ku: "سک و میزکردن", bd: "زک و میزکرن", ar: "البطن والتبول" } },
  { id: "children", name: { en: "Children", ku: "منداڵان", bd: "زارۆک", ar: "الأطفال" } },
];

export type Complaint = {
  id: string;
  category: ComplaintCategory;
  name: FourLanguages;
  keywords: FourLanguages;
  concern: FourLanguages;
  specialties: readonly SpecialtyKey[];
};

export const specialtyLabels: Record<SpecialtyKey, { name: FourLanguages }> = {
  "general-medicine": {
    name: { en: "General medicine / family doctor", ku: "پزیشکی گشتی", bd: "دکتۆرێ گشتی", ar: "الطب العام / طبيب العائلة" },
  },
  neurology: {
    name: { en: "Neurology", ku: "نەخۆشییەکانی دەمار", bd: "نەخۆشیێن دەماران", ar: "طب الأعصاب" },
  },
  orthopedics: {
    name: { en: "Orthopedics", ku: "ئێسک و جومگە", bd: "هەستی و مەفاصل", ar: "العظام والمفاصل" },
  },
  dermatology: {
    name: { en: "Dermatology", ku: "نەخۆشییەکانی پێست", bd: "نەخۆشیێن پێستی", ar: "الجلدية" },
  },
  ent: {
    name: { en: "Ear, nose and throat", ku: "گوێ و لووت و قوڕگ", bd: "گوھ و دڤ و ئەڤری", ar: "الأذن والأنف والحنجرة" },
  },
  ophthalmology: {
    name: { en: "Eye doctor (ophthalmology)", ku: "پزیشکی چاو", bd: "دکتۆرێ چاڤان", ar: "طب العيون" },
  },
  gastroenterology: {
    name: { en: "Digestive system (gastroenterology)", ku: "نەخۆشییەکانی کۆئەندامی هەرس", bd: "نەخۆشیێن هەرسێ", ar: "الجهاز الهضمي" },
  },
  urology: {
    name: { en: "Urinary system (urology)", ku: "میز و گورچیلە", bd: "میز و گورچیلە", ar: "المسالك البولية" },
  },
  dentistry: {
    name: { en: "Dentistry", ku: "پزیشکی ددان", bd: "دکتۆرێ ددانان", ar: "طب الأسنان" },
  },
  pediatrics: {
    name: { en: "Pediatrics", ku: "پزیشکی منداڵان", bd: "دکتۆرێ زارۆکان", ar: "طب الأطفال" },
  },
};

// Conservative first-stop associations for navigation, not diagnosis.
// The concern is a single targeted safety question; "yes" stops routine discovery.
export const complaints = [
  {
    id: "headache",
    category: "head-face",
    name: { en: "Headache", ku: "سەرئێشە", bd: "سەرێشە", ar: "صداع" },
    keywords: { en: "head migraine head pain", ku: "سەر سەرئێشە", bd: "سەر سەرێشە", ar: "راس صداع شقيقة" },
    concern: { en: "Is this a sudden, extremely severe headache, or do you have new weakness, confusion or trouble speaking?", ku: "سەرئێشەکە لەناکاو و زۆر توندە، یان لاوازی، شێواوی یان کێشەی قسەکردنت هەیە؟", bd: "سەرێشەکە ژ نشکەکێ و گەلەک توندە، یان لاوازی، تێکچوون یان ئاریشەیێن ئاخفتنێ هەنە؟", ar: "الصداع إجا فجأة وبقوة شديدة، أو عندك ضعف جديد أو تشوش أو صعوبة بالحچي؟" },
    specialties: ["general-medicine", "neurology"],
  },
  {
    id: "knee-pain",
    category: "back-joints-skin",
    name: { en: "Knee pain", ku: "ئازاری ئەژنۆ", bd: "ئێشا ئەژنۆ", ar: "ألم الركبة" },
    keywords: { en: "knee joint pain", ku: "ئەژنۆ جومگە ئازار", bd: "ئەژنۆ ئێش", ar: "ركبة مفصل وجع" },
    concern: { en: "Was there a serious injury, a visibly deformed knee, or are you unable to stand or walk?", ku: "ئەژنۆت بە توندی بریندار بووە، شێوەی گۆڕاوە، یان ناتوانیت لەسەر پێ بوەستیت؟", bd: "ئەژنۆیا تە برینداربوونا گران هەیە، شێوەیێ وێ گۆهەری یان نەشێی ل سەر پێیان بوەستی؟", ar: "صار عندك إصابة قوية، أو شكل الركبة تغيّر، أو ما تگدر توقف أو تمشي؟" },
    specialties: ["orthopedics", "general-medicine"],
  },
  {
    id: "back-pain",
    category: "back-joints-skin",
    name: { en: "Back pain", ku: "ئازاری پشت", bd: "ئێشا پشتێ", ar: "ألم الظهر" },
    keywords: { en: "back spine lower back", ku: "پشت کەمەر ئازار", bd: "پشت کەمەر ئێش", ar: "ظهر أسفل الظهر" },
    concern: { en: "Do you have new loss of bladder or bowel control, numbness around the groin, or major new leg weakness?", ku: "تازە کۆنترۆڵی میز یان پیسایی لەدەست داوە، هەستی ناوچەی نێوان قاچەکانت کەم بووە، یان قاچت زۆر لاواز بووە؟", bd: "نوکە کۆنترۆلا میزێ یان پیساییێ ژ دەست دایە، یان هەستا ناڤبەرا لنگان کێم بوویە یان لنگەکێ زۆر لاوازە؟", ar: "صار عندك فقدان جديد للسيطرة على البول أو البراز، خدر بين الرجلين، أو ضعف قوي وجديد بالرجل؟" },
    specialties: ["general-medicine", "orthopedics"],
  },
  {
    id: "skin",
    category: "back-joints-skin",
    name: { en: "Rash or skin problem", ku: "دەنک یان کێشەی پێست", bd: "دەنک یان ئاریشەیا پێستی", ar: "طفح أو مشكلة بالجلد" },
    keywords: { en: "rash itch skin", ku: "پێست خورانەوە دەنک", bd: "پێست خارین دەنک", ar: "جلد حكة طفح" },
    concern: { en: "Do you have a rapidly spreading rash with trouble breathing, swelling of the tongue or face, or severe illness?", ku: "دەنکەکان بەخێرایی بڵاو دەبنەوە و هەناسەدانت سەختە، زمان یان ڕووخسارت ئاوساوە، یان زۆر نەخۆشیت؟", bd: "دەنک ب لەز بەلەڤ دبن و هەناسەدانا تە گرانە، زمان یان ڕوویا تە پفدابیت، یان گەلەک نەخۆشی؟", ar: "الطفح ينتشر بسرعة ويا صعوبة تنفس، أو تورّم باللسان أو الوجه، أو تعب شديد؟" },
    specialties: ["dermatology", "general-medicine"],
  },
  {
    id: "ear-throat",
    category: "head-face",
    name: { en: "Ear or throat problem", ku: "کێشەی گوێ یان قوڕگ", bd: "ئاریشەیا گوھێ یان ئەڤری", ar: "مشكلة بالأذن أو الحلق" },
    keywords: { en: "ear hearing throat nose", ku: "گوێ قوڕگ لووت بیستن", bd: "گوھ ئەڤری دڤ", ar: "أذن حلق أنف سمع" },
    concern: { en: "Are you struggling to breathe or swallow saliva, or do you have sudden hearing loss?", ku: "هەناسەدان یان قوتدانی دەمئاوت سەختە، یان لەناکاو بیستنت لەدەست داوە؟", bd: "هەناسەدان یان قوتدانا لیڤا تە گرانە، یان ژ نشکەکێ گوھلێبوونا خۆ ژ دەست دایە؟", ar: "عندك صعوبة بالتنفس أو بلع الريق، أو فقدت السمع فجأة؟" },
    specialties: ["ent", "general-medicine"],
  },
  {
    id: "eyes",
    category: "head-face",
    name: { en: "Eye or vision problem", ku: "کێشەی چاو یان بینین", bd: "ئاریشەیا چاڤان یان دیتنێ", ar: "مشكلة بالعين أو النظر" },
    keywords: { en: "eye vision red eye", ku: "چاو بینین", bd: "چاڤ دیتن", ar: "عين نظر رؤية" },
    concern: { en: "Have you suddenly lost vision, had a serious eye injury, or developed severe eye pain?", ku: "لەناکاو بینینت لەدەست داوە، چاوت بە توندی بریندار بووە، یان ئازاری زۆری چاوت هەیە؟", bd: "ژ نشکەکێ دیتنا خۆ ژ دەست دایە، چاڤێ تە برینداربوونا گران هەیە، یان ئێشا زۆر هەیە؟", ar: "فقدت النظر فجأة، أو صارت إصابة قوية بالعين، أو ألم شديد بالعين؟" },
    specialties: ["ophthalmology"],
  },
  {
    id: "stomach",
    category: "belly-urinary",
    name: { en: "Stomach or belly pain", ku: "ئازاری سک", bd: "ئێشا زکی", ar: "ألم البطن" },
    keywords: { en: "belly abdomen stomach pain", ku: "سک گەدە ئازار", bd: "زک مەعدە ئێش", ar: "بطن معدة وجع" },
    concern: { en: "Is the pain severe and sudden, or are you fainting, vomiting blood, or passing black or bloody stools?", ku: "ئازارەکە لەناکاو و زۆر توندە، یان لەهۆش دەچیت، خوێن دەڕشێنیت، یان پیساییت ڕەش یان خوێناوییە؟", bd: "ئێش ژ نشکەکێ و گەلەک توندە، یان بێهۆش دبی، خوین ڕادکێشی، یان پیساییا تە ڕەش یان خویناویە؟", ar: "الألم قوي جدًا وإجا فجأة، أو دا تدوخ لحد الإغماء، أو تتقيأ دم، أو البراز أسود أو بيه دم؟" },
    specialties: ["general-medicine", "gastroenterology"],
  },
  {
    id: "urinary",
    category: "belly-urinary",
    name: { en: "Urine or bladder problem", ku: "کێشەی میزکردن", bd: "ئاریشەیا میزکرنێ", ar: "مشكلة بالتبول" },
    keywords: { en: "urine bladder burning urinary", ku: "میز سووتان گورچیلە", bd: "میز سووتن گورچیلە", ar: "بول حرقة تبول مثانة" },
    concern: { en: "Are you unable to pass urine, very unwell with fever and side pain, or passing large amounts of blood?", ku: "ناتوانیت میز بکەیت، یان لەگەڵ تا و ئازاری لای پشت زۆر نەخۆشیت، یان خوێنی زۆر لە میزدا دەبینیت؟", bd: "نەشێی میز بکەی، یان دگەل تایێ و ئێشا تەنیشتێ گەلەک نەخۆشی، یان خوینا زۆر د میزێ دا دبینی؟", ar: "ما تگدر تتبول، أو عندك حرارة ويا ألم قوي بالجنب وتعب شديد، أو دم هواية بالبول؟" },
    specialties: ["general-medicine", "urology"],
  },
  {
    id: "teeth",
    category: "head-face",
    name: { en: "Tooth or gum pain", ku: "ئازاری ددان یان پووکی ددان", bd: "ئێشا ددانان یان گۆشتی ددانان", ar: "ألم الأسنان أو اللثة" },
    keywords: { en: "tooth gum dental", ku: "ددان پووک", bd: "ددان", ar: "سن أسنان لثة" },
    concern: { en: "Do you have swelling of the mouth or neck with difficulty breathing or swallowing?", ku: "دەم یان ملت ئاوساوە و هەناسەدان یان قوتدانت سەختە؟", bd: "دەڤ یان ستویا تە پفدایە و هەناسەدان یان قوتدان گرانە؟", ar: "عندك تورّم بالفم أو الرقبة ويا صعوبة بالتنفس أو البلع؟" },
    specialties: ["dentistry"],
  },
  {
    id: "child-fever",
    category: "children",
    name: { en: "Fever in a child", ku: "تای منداڵ", bd: "تایا زارۆکی", ar: "حرارة عند الطفل" },
    keywords: { en: "child baby infant fever", ku: "منداڵ کۆرپە تا", bd: "زارۆک ساوا تا", ar: "طفل رضيع حرارة حمى" },
    concern: { en: "Is the baby under 3 months old with a fever, or is the child difficult to wake, struggling to breathe, or having a seizure?", ku: "منداڵەکە کەمتر لە سێ مانگە و تای هەیە، یان زەحمەتە بێداری بکەیتەوە، هەناسەدانی سەختە یان تشەنجی هەیە؟", bd: "زارۆک ژ سێ هەیڤان بچووکترە و تایێ هەیە، یان بێدارکرنا وی گرانە، هەناسەدان گرانە یان تەشنەج هەیە؟", ar: "الطفل عمره أقل من 3 أشهر وعنده حرارة، أو صعب تصحّيه، أو يتنفس بصعوبة، أو عنده تشنج؟" },
    specialties: ["pediatrics"],
  },
] as const satisfies readonly Complaint[];

export type ComplaintId = (typeof complaints)[number]["id"];

export function findComplaint(id: string): (typeof complaints)[number] | undefined {
  return complaints.find((entry) => entry.id === id);
}

// Normalize common Arabic/Kurdish keyboard variants and optional vowel marks.
function normalizeComplaintSearch(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ").trim();
}

export function searchComplaints(text: string, locale: UiLocale) {
  const q = normalizeComplaintSearch(text);
  if (!q) return complaints;
  return complaints.filter((entry) => {
    const terms = [entry.name[locale], entry.keywords[locale],
      ...Object.values(entry.name), ...Object.values(entry.keywords)];
    return terms.some((value) => normalizeComplaintSearch(value).includes(q));
  });
}


// Only labels actually returned by the existing publication-gated public
// directory may ever become specialty-filter links. These aliases do NOT
// create provider records, and the current directory preview is bounded.
const specialtyAliases: Record<SpecialtyKey, readonly string[]> = {
  "general-medicine": ["General Medicine", "General Practice", "Family Medicine", "Family Physician", "الطب العام", "طب الأسرة", "پزیشکی گشتی"],
  neurology: ["Neurology", "Neurologist", "طب الأعصاب", "نەخۆشییەکانی دەمار"],
  orthopedics: ["Orthopedics", "Orthopaedics", "Orthopedic Surgery", "Orthopaedic Surgery", "العظام", "جراحة العظام", "ئێسک و جومگە"],
  dermatology: ["Dermatology", "Dermatologist", "الجلدية", "الأمراض الجلدية", "نەخۆشییەکانی پێست"],
  ent: ["ENT", "Otolaryngology", "Ear Nose Throat", "الأنف والأذن والحنجرة", "گوێ و لووت و قوڕگ"],
  ophthalmology: ["Ophthalmology", "Ophthalmologist", "Eye", "طب العيون", "پزیشکی چاو"],
  gastroenterology: ["Gastroenterology", "Gastroenterologist", "الجهاز الهضمي", "أمراض الجهاز الهضمي"],
  urology: ["Urology", "Urologist", "المسالك البولية", "میز و گورچیلە"],
  dentistry: ["Dentistry", "Dentist", "Dental", "طب الأسنان", "پزیشکی ددان"],
  pediatrics: ["Pediatrics", "Paediatrics", "Pediatrician", "Paediatrician", "طب الأطفال", "پزیشکی منداڵان"],
};

function normalizeSpecialty(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function matchingPublishedSpecialties(key: SpecialtyKey, published: readonly string[]) {
  const allowed = new Set(specialtyAliases[key].map(normalizeSpecialty));
  return Array.from(new Set(published.filter((value) => allowed.has(normalizeSpecialty(value))))).slice(0, 4);
}
