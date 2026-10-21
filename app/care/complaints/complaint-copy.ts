import type { UiLocale } from "@/lib/i18n/ui";

type FlowCopy = {
  appointments: string;
  back: string;
  chooseTitle: string;
  chooseHelp: string;
  searchLabel: string;
  searchPlaceholder: string;
  noMatch: string;
  next: string;
  questionsTitle: string;
  questionHelp: string;
  riskTitle: string;
  riskYes: string;
  riskNo: string;
  riskUnanswered: string;
  globalDanger: string;
  emergencyTitle: string;
  emergencyHelp: string;
  emergencyAction: string;
  specialtyTitle: string;
  specialtyHelp: string;
  firstStep: string;
  doctors: string;
  noPublishedMatch: string;
  noDiagnosis: string;
  notFound: string;
  directSearch: string;
  reviewNote: string;
  breadcrumb: [string, string, string];
};

export const guideCopy: Record<UiLocale, FlowCopy> = {
  en: {
    appointments: "My appointments",
    back: "Find care",
    chooseTitle: "What is bothering you?",
    chooseHelp: "Pick one main concern. You can search directly for a doctor at any time.",
    searchLabel: "Search symptoms",
    searchPlaceholder: "For example, headache or knee pain",
    noMatch: "No matching concern yet. Search for a doctor directly instead.",
    next: "Continue",
    questionsTitle: "One quick safety question",
    questionHelp: "Answer this to see whether routine doctor search is the right next step.",
    riskTitle: "Do any of these apply right now?",
    riskYes: "Yes / I am not sure",
    riskNo: "No",
    riskUnanswered: "Choose an answer before continuing.",
    globalDanger: "New severe chest pain, serious breathing difficulty, sudden weakness or trouble speaking? Seek emergency help now—do not use routine search.",
    emergencyTitle: "Please seek urgent medical help",
    emergencyHelp: "Do not wait for an Atlas appointment. Go to the nearest emergency department or contact your local emergency service. If symptoms are severe or rapidly worsening, get urgent help even if your answer above was No.",
    emergencyAction: "Emergency care is more important than routine search",
    specialtyTitle: "Specialties you could start with",
    specialtyHelp: "These are possible starting points, not a diagnosis or a guarantee that a particular doctor is right for you.",
    firstStep: "Start with",
    doctors: "See published doctors",
    noPublishedMatch: "No matching specialty label in the currently displayed public sample. Browse all doctors instead; this is not a complete directory.",
    noDiagnosis: "Atlas does not diagnose, assess severity or replace a healthcare professional.",
    notFound: "Start by choosing a concern.",
    directSearch: "Search doctors without questions",
    reviewNote: "Specialty associations are a draft awaiting clinical review; this feature must not be launched until approved.",
    breadcrumb: ["Choose concern", "Safety question", "Specialties"],
  },
  ku: {
    appointments: "مەوعیدەکانم",
    back: "گەڕان بۆ دکتۆر",
    chooseTitle: "چ کێشەیەکت هەیە؟",
    chooseHelp: "یەک کێشەی سەرەکی هەڵبژێرە. هەر کاتێک بتەوێت دەتوانیت ڕاستەوخۆ بەدوای دکتۆردا بگەڕێیت.",
    searchLabel: "گەڕان بە پێی کێشە",
    searchPlaceholder: "بۆ نموونە: سەرئێشە یان ئازاری ئەژنۆ",
    noMatch: "ئەم کێشەیە نەدۆزرایەوە. دەتوانیت ڕاستەوخۆ بەدوای دکتۆردا بگەڕێیت.",
    next: "بەردەوام بە",
    questionsTitle: "یەک پرسیاری گرنگ",
    questionHelp: "تکایە وەڵام بدەرەوە بۆ ئەوەی بزانیت ئایا پێویستە زوو یارمەتی پزیشکی وەربگریت.",
    riskTitle: "ئێستا هیچ یەکێک لەمانەت هەیە؟",
    riskYes: "بەڵێ / دڵنیانیم",
    riskNo: "نەخێر",
    riskUnanswered: "پێش بەردەوامبوون وەڵامێک هەڵبژێرە.",
    globalDanger: "ئەگەر ئازاری توندی سنگ، کێشەی زۆری هەناسەدان، لاوازیی لەناکاو یان کێشەی قسەکردنت هەیە، ئێستا داوای فریاکەوتن بکە.",
    emergencyTitle: "تکایە زوو یارمەتی پزیشکی وەربگرە",
    emergencyHelp: "چاوەڕێی مەوعیدی Atlas مەکە. بچۆ بۆ نزیکترین بەشی فریاکەوتن یان پەیوەندی بە فریاکەوتنی ناوچەکەت بکە. ئەگەر دۆخەکەت زۆر خراپە یان بەخێرایی خراپتر دەبێت، زوو یارمەتی وەربگرە.",
    emergencyAction: "فریاکەوتن لە گەڕان بۆ مەوعید گرنگترە",
    specialtyTitle: "ئەم پسپۆڕییانە لەوانەیە گونجاو بن",
    specialtyHelp: "ئەمە تەنها ڕێنمایی بۆ دەستپێکردنە، نە دەستنیشانکردنی نەخۆشی.",
    firstStep: "دەتوانیت لێرەوە دەست پێ بکەیت",
    doctors: "دکتۆرەکان ببینە",
    noPublishedMatch: "لەم لیستە سنووردارەدا ئەم پسپۆڕییە نەدۆزرایەوە. هەموو دکتۆرەکان ببینە؛ ئەمە لیستی تەواو نییە.",
    noDiagnosis: "Atlas نەخۆشی دەستنیشان ناکات و جێی دکتۆر ناگرێتەوە.",
    notFound: "سەرەتا کێشەیەک هەڵبژێرە.",
    directSearch: "ڕاستەوخۆ بەدوای دکتۆردا بگەڕێ",
    reviewNote: "ئەم ڕێنماییە هێشتا پێداچوونەوەی پزیشکیی تەواو نەبووە و نابێت بڵاو بکرێتەوە.",
    breadcrumb: ["کێشەکەت هەڵبژێرە", "پرسیاری گرنگ", "پسپۆڕییەکان"],
  },
  bd: {
    appointments: "وادەیێن من",
    back: "گەڕانا دکتۆران",
    chooseTitle: "چە ئاریشەیەکا تە هەیە؟",
    chooseHelp: "ئاریشەیەکا سەرەکی هەلبژێرە. دەمێ تە بڤێت دشێی ڕاستەوخۆ دکتۆران ببینی.",
    searchLabel: "ب ئاریشەیێ بگەڕێ",
    searchPlaceholder: "بۆ نموونە: سەرێشە یان ئێشا ئەژنۆ",
    noMatch: "ئاریشە نەهاتە دیتن. دشێی ڕاستەوخۆ دکتۆران ببینی.",
    next: "بەردەوام بە",
    questionsTitle: "پرسەکا گرنگ",
    questionHelp: "بەرسڤ بدە دا بزانی کا پێدڤیە ب لەز یارمەتییا پزیشکی وەرگری.",
    riskTitle: "نوکە ژ ڤان نیشانان هەیە؟",
    riskYes: "بەلێ / دڵنیانیم",
    riskNo: "نەخێر",
    riskUnanswered: "بەری بەردەوامبوونێ بەرسڤەکێ هەلبژێرە.",
    globalDanger: "ئەگەر ئێشا گرانا سینگێ، ئاریشەیا گرانا هەناسەدانێ، لاوازییا ژ نشکەکێ یان ئاریشەیا ئاخفتنێ هەیە، نوکە یارمەتییا فریاکەفتنێ وەرگرە.",
    emergencyTitle: "ب لەز یارمەتییا پزیشکی وەرگرە",
    emergencyHelp: "چاوەڕێی وادەیەکێ ل Atlas نەکە. بچۆ نێزیکترین بەشا فریاکەفتنێ یان پەیوەندی ب فریاکەفتنا ناڤچەیا خۆ بکە. ئەگەر دۆخ گەلەک گرانە یان لەزتر خراپ دبیت، یارمەتی وەرگرە.",
    emergencyAction: "فریاکەفتن ژ وادە گرتنێ گرنگترە",
    specialtyTitle: "ئەڤ تایبەتمەندی دشێن گونجای بن",
    specialtyHelp: "ئەڤە تەنێ ڕێنماییەکا دەستپێکرنێیە، نە دەستنیشانکرنا نەخۆشییە.",
    firstStep: "دشێی ژ ڤێرێ دەست پێ بکەی",
    doctors: "دکتۆران ببینە",
    noPublishedMatch: "د ڤێ لیستا سنووردار دا ئەڤ تایبەتمەندییە نەهاتە دیتن. هەمی دکتۆران ببینە؛ ئەڤ لیستە تەمام نینە.",
    noDiagnosis: "Atlas نەخۆشییان دەستنیشان ناکەت و جهێ دکتۆری ناگریت.",
    notFound: "پێشتر ئاریشەیەکێ هەلبژێرە.",
    directSearch: "ڕاستەوخۆ دکتۆران ببینە",
    reviewNote: "ئەڤ ڕێنماییە هێشتا پێداچوونا پزیشکی یا تەمام نەبوویە و نابیت بهێتە بڵاوکرن.",
    breadcrumb: ["ئاریشە هەلبژێرە", "پرسەکا گرنگ", "تایبەتمەندی"],
  },
  ar: {
    appointments: "مواعيدي",
    back: "دوّر على دكتور",
    chooseTitle: "شنو اللي مضايقك؟",
    chooseHelp: "اختار المشكلة الرئيسية. وتگدر تدور على دكتور مباشرة بأي وقت.",
    searchLabel: "ابحث عن عرض أو مشكلة",
    searchPlaceholder: "مثل صداع أو وجع الركبة",
    noMatch: "ما لگينا هالمشكلة. تگدر تدور على دكتور مباشرة.",
    next: "كمّل",
    questionsTitle: "سؤال مهم وسريع",
    questionHelp: "جاوب حتى تعرف إذا تحتاج مساعدة طبية بسرعة بدل موعد عادي.",
    riskTitle: "عندك أي علامة من هاي هسه؟",
    riskYes: "إي / مو متأكد",
    riskNo: "لا",
    riskUnanswered: "اختار جواب قبل ما تكمل.",
    globalDanger: "عندك ألم صدر شديد جديد، صعوبة قوية بالتنفس، ضعف مفاجئ أو صعوبة بالكلام؟ اطلب الطوارئ هسه، لا تنتظر موعد عادي.",
    emergencyTitle: "اطلب مساعدة طبية عاجلة",
    emergencyHelp: "لا تنتظر موعد من Atlas. روح لأقرب طوارئ أو اتصل بخدمة الطوارئ المحلية. إذا حالتك شديدة أو تتدهور بسرعة، اطلب المساعدة حتى لو جاوبت لا.",
    emergencyAction: "الطوارئ أهم من البحث عن موعد",
    specialtyTitle: "اختصاصات ممكن تبدأ بيها",
    specialtyHelp: "هاي مجرد خيارات للبداية، مو تشخيص ولا ضمان إن طبيب معيّن هو الأنسب.",
    firstStep: "تگدر تبدأ من",
    doctors: "شوف الأطباء المنشورين",
    noPublishedMatch: "ما ظهرت نفس تسمية الاختصاص بعينة الأطباء المنشورين حاليًا. تصفّح كل الأطباء؛ هاي مو قائمة كاملة.",
    noDiagnosis: "Atlas ما يشخّص الأمراض ولا يحدد شدة الحالة ولا يغني عن الطبيب.",
    notFound: "اختار المشكلة أولًا.",
    directSearch: "دوّر على دكتور بدون أسئلة",
    reviewNote: "هالاقتراحات مسودة تنتظر مراجعة طبية ولازم ما تننشر قبل الموافقة.",
    breadcrumb: ["اختار المشكلة", "سؤال مهم", "الاختصاصات"],
  },
};
