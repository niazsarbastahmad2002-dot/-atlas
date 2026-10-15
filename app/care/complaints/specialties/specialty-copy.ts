import type { UiLocale } from "@/lib/i18n/ui";
import type { SpecialtyKey } from "@/lib/patient/complaint-guide";

// Page 05 only: plain-language specialty scopes, NOT complaint-to-specialty
// mappings or diagnostic claims. All four locales require clinical review.
export const specialtyScope: Record<SpecialtyKey, Record<UiLocale, string>> = {
  "general-medicine": {
    en: "A general doctor assesses a wide range of health concerns and can discuss suitable next steps.",
    ku: "پزیشکی گشتی دەتوانێت کێشە تەندروستییە جۆراوجۆرەکان هەڵبسەنگێنێت و باس لە هەنگاوی دواتر بکات.",
    bd: "دکتۆرێ گشتی دشێت ئاریشەیێن جۆراوجۆر یێن ساخلەمیێ هەلسەنگینیت و بەحسا هەنگاڤا داهاتی بکەت.",
    ar: "الطبيب العام يگدر يقيّم مشاكل صحية مختلفة ويساعدك تفهم الخطوة الجاية.",
  },
  neurology: {
    en: "Neurology focuses on the brain, spinal cord and nerves.",
    ku: "ئەم پسپۆڕییە گرنگی بە مێشک، مۆخی پشت و دەمارەکان دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب مەشک، مۆخا پشتێ و دەماران ددەت.",
    ar: "طب الأعصاب يهتم بالدماغ والحبل الشوكي والأعصاب.",
  },
  orthopedics: {
    en: "Orthopedics focuses on bones, joints, muscles and movement.",
    ku: "ئەم پسپۆڕییە گرنگی بە ئێسک، جومگە، ماسولکە و جووڵە دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب هەستی، مەفاصل، ماسولکە و جووڵانێ ددەت.",
    ar: "طب العظام يهتم بالعظام والمفاصل والعضلات والحركة.",
  },
  dermatology: {
    en: "Dermatology focuses on skin, hair and nails.",
    ku: "ئەم پسپۆڕییە گرنگی بە پێست، قژ و نینۆکەکان دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب پێست، پرچ و نینۆکان ددەت.",
    ar: "الجلدية تهتم بالجلد والشعر والأظافر.",
  },
  ent: {
    en: "Ear, nose and throat specialists focus on those parts of the body.",
    ku: "ئەم پسپۆڕییە گرنگی بە گوێ، لووت و قوڕگ دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب گوھ، دڤ و ئەڤری ددەت.",
    ar: "اختصاص الأنف والأذن والحنجرة يهتم بهاي المناطق.",
  },
  ophthalmology: {
    en: "Eye specialists assess concerns involving the eyes and vision.",
    ku: "پزیشکی چاو کێشەکانی چاو و بینین هەڵدەسەنگێنێت.",
    bd: "دکتۆرێ چاڤان ئاریشەیێن چاڤان و دیتنێ هەلسەنگینیت.",
    ar: "طبيب العيون يقيّم مشاكل العين والنظر.",
  },
  gastroenterology: {
    en: "Gastroenterology focuses on digestion, including the stomach and intestines.",
    ku: "ئەم پسپۆڕییە گرنگی بە هەرسکردن، لەوانە گەدە و ڕیخۆڵەکان دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب هەرسکرنێ، ژ وان ژی گەدە و ڕیخۆلان ددەت.",
    ar: "الجهاز الهضمي يهتم بالهضم، ومنه المعدة والأمعاء.",
  },
  urology: {
    en: "Urology focuses on the urinary tract and related organs.",
    ku: "ئەم پسپۆڕییە گرنگی بە ڕێگەکانی میز و ئەندامە پەیوەندیدارەکان دەدات.",
    bd: "ئەڤ تایبەتمەندی گرنگی ب ڕێکێن میزێ و ئەندامێن پەیوەندیدار ددەت.",
    ar: "المسالك البولية تهتم بالمجاري البولية والأعضاء المرتبطة بيها.",
  },
  dentistry: {
    en: "Dental care focuses on teeth, gums and oral health.",
    ku: "پزیشکی ددان گرنگی بە ددان، پووک و تەندروستی دەم دەدات.",
    bd: "دکتۆرێ ددانان گرنگی ب ددان، گۆشتی ددانان و ساخلەمیا دەڤی ددەت.",
    ar: "طب الأسنان يهتم بالأسنان واللثة وصحة الفم.",
  },
  pediatrics: {
    en: "Pediatrics focuses on health concerns in babies and children.",
    ku: "پزیشکی منداڵان گرنگی بە تەندروستی کۆرپە و منداڵان دەدات.",
    bd: "دکتۆرێ زارۆکان گرنگی ب ساخلەمیا ساوایان و زارۆکان ددەت.",
    ar: "طب الأطفال يهتم بصحة الرضّع والأطفال.",
  },
};

export const specialtyPageCopy: Record<UiLocale, {
  whyRelevant: string;
  anotherOption: string;
  compareIntro: string;
  compareWith: string;
  comparisonTitle: string;
  compareSummary: string;
}> = {
  en: {
    whyRelevant: "Why this may be relevant",
    anotherOption: "Another possible starting point",
    compareIntro: "There can be more than one reasonable starting point. Compare what each specialty generally covers.",
    compareWith: "Compare with",
    comparisonTitle: "Compare another specialty",
    compareSummary: "This is another possible option, not a diagnosis or a ranking.",
  },
  ku: {
    whyRelevant: "بۆچی لەوانەیە پەیوەندی هەبێت",
    anotherOption: "هەڵبژاردەیەکی دیکە بۆ دەستپێکردن",
    compareIntro: "لەوانەیە زیاتر لە یەک هەڵبژاردە هەبێت. ببینە هەر پسپۆڕییەک چ کێشەیەک دەبینێت.",
    compareWith: "بەراوردی بکە لەگەڵ",
    comparisonTitle: "بەراوردی پسپۆڕییەکی دیکە",
    compareSummary: "ئەمە تەنها هەڵبژاردەیەکی دیکەیە، نە دەستنیشانکردنی نەخۆشی یان پلەبەندی.",
  },
  bd: {
    whyRelevant: "بۆچی دشێت پەیوەندی هەبیت",
    anotherOption: "هەلبژاردەیەکا دی بۆ دەستپێکرنێ",
    compareIntro: "دشێت پتر ژ هەلبژاردەیەکێ هەبیت. ببینە هەر تایبەتمەندی گرنگی ب چ ددەت.",
    compareWith: "بەراورد بکە دگەل",
    comparisonTitle: "بەراوردکرنا تایبەتمەندیەکا دی",
    compareSummary: "ئەڤە تەنێ هەلبژاردەیەکا دییە، نە دەستنیشانکرنا نەخۆشی یان ڕێزکرنە.",
  },
  ar: {
    whyRelevant: "ليش ممكن يفيدك هذا الاختصاص؟",
    anotherOption: "اختصاص ثاني ممكن تبدأ بيه",
    compareIntro: "ممكن يكون عندك أكثر من خيار للبداية. قارن شنو يهتم بيه كل اختصاص.",
    compareWith: "قارن ويا",
    comparisonTitle: "قارن اختصاص ثاني",
    compareSummary: "هذا خيار ثاني ممكن، مو تشخيص ولا ترتيب للأطباء.",
  },
};
