import type { UiLocale } from "./i18n/ui.ts";

// Patient-friendly descriptions. Clinical review is required before these
// explanations are released. This is presentation copy, not symptom routing.
type Details = { name: string; about: string };
type Entry = { aliases: string[]; text: Record<UiLocale, Details> };

const entries: Entry[] = [
  {
    aliases: ["cardiology", "cardiologist"],
    text: {
      en: { name: "Heart care", about: "Doctors who focus on the heart and blood vessels." },
      ku: { name: "دڵ و خوێنبەرەکان", about: "دکتۆرانی پسپۆڕ لە دڵ و خوێنبەرەکان." },
      bd: { name: "دل و رەهێن خوینێ", about: "دکتۆرێن تایبەت ب دل و رەهێن خوینێ." },
      ar: { name: "القلب والأوعية الدموية", about: "أطباء مختصون بالقلب والأوعية الدموية." },
    },
  },
  {
    aliases: ["dermatology", "dermatologist"],
    text: {
      en: { name: "Skin care", about: "Doctors who focus on skin, hair and nails." },
      ku: { name: "پێست و قژ", about: "دکتۆرانی پسپۆڕ لە پێست، قژ و نینۆک." },
      bd: { name: "پێست و پرچ", about: "دکتۆرێن تایبەت ب پێست، پرچ و نینۆکان." },
      ar: { name: "الجلدية", about: "أطباء مختصون بالجلد والشعر والأظافر." },
    },
  },
  {
    aliases: ["pediatrics", "paediatrics", "pediatric medicine"],
    text: {
      en: { name: "Children's health", about: "Medical care for babies, children and teenagers." },
      ku: { name: "تەندروستی منداڵان", about: "چاودێری پزیشکی بۆ ساوا، منداڵ و هەرزەکاران." },
      bd: { name: "ساخلەمیا زارۆکان", about: "چاڤدێریا پزیشکی بۆ ساوا، زارۆک و گەنجان." },
      ar: { name: "طب الأطفال", about: "رعاية طبية للرضّع والأطفال والمراهقين." },
    },
  },
  {
    aliases: ["orthopedics", "orthopaedics", "orthopedic surgery", "orthopaedic surgery"],
    text: {
      en: { name: "Bones and joints", about: "Doctors who focus on bones, joints and related muscles." },
      ku: { name: "ئێسک و جومگە", about: "دکتۆرانی پسپۆڕ لە ئێسک، جومگە و ماسولکەکانی پەیوەندیدار." },
      bd: { name: "ئەستی و مفصل", about: "دکتۆرێن تایبەت ب ئەستی، مفصل و ماسولکەیان." },
      ar: { name: "العظام والمفاصل", about: "أطباء مختصون بالعظام والمفاصل والعضلات المرتبطة بها." },
    },
  },
  {
    aliases: ["ophthalmology", "ophthalmologist"],
    text: {
      en: { name: "Eye care", about: "Doctors who focus on the eyes and vision." },
      ku: { name: "چاو و بینین", about: "دکتۆرانی پسپۆڕ لە چاو و بینین." },
      bd: { name: "چاڤ و دیتن", about: "دکتۆرێن تایبەت ب چاڤ و دیتنێ." },
      ar: { name: "طب العيون", about: "أطباء مختصون بالعيون والنظر." },
    },
  },
  {
    aliases: ["ent", "ear nose and throat", "otolaryngology", "otorhinolaryngology"],
    text: {
      en: { name: "Ear, nose and throat", about: "Doctors who focus on the ears, nose and throat." },
      ku: { name: "گوێ و لووت و قوڕگ", about: "دکتۆرانی پسپۆڕ لە گوێ، لووت و قوڕگ." },
      bd: { name: "گوھ و دفن و گەروو", about: "دکتۆرێن تایبەت ب گوھ، دفن و گەرووی." },
      ar: { name: "الأنف والأذن والحنجرة", about: "أطباء مختصون بالأذن والأنف والحنجرة." },
    },
  },
  {
    aliases: ["internal medicine", "internist"],
    text: {
      en: { name: "Adult medicine", about: "Medical care focused on health conditions in adults." },
      ku: { name: "نەخۆشییە ناوخۆییەکان", about: "چاودێری پزیشکی بۆ نەخۆشییەکانی گەورەساڵان." },
      bd: { name: "نەخۆشیێن ناڤخۆیی", about: "چاڤدێریا پزیشکی بۆ نەخۆشیێن مەزنساڵان." },
      ar: { name: "الطب الباطني", about: "رعاية طبية تركز على الحالات الصحية لدى البالغين." },
    },
  },
  {
    aliases: ["obstetrics and gynecology", "obstetrics & gynecology", "ob/gyn", "obgyn", "gynaecology", "gynecology"],
    text: {
      en: { name: "Women's health and pregnancy", about: "Doctors who focus on reproductive health and pregnancy care." },
      ku: { name: "تەندروستی ژنان و دووگیانی", about: "دکتۆرانی پسپۆڕ لە تەندروستی زاوزێ و چاودێری دووگیانی." },
      bd: { name: "ساخلەمیا ژنان و دووگیانی", about: "دکتۆرێن تایبەت ب ساخلەمیا زاوزێ و چاڤدێریا دووگیانیێ." },
      ar: { name: "النسائية والتوليد", about: "أطباء مختصون بالصحة الإنجابية ورعاية الحمل." },
    },
  },
  {
    aliases: ["neurology", "neurologist"],
    text: {
      en: { name: "Brain and nerves", about: "Doctors who focus on the brain and nervous system." },
      ku: { name: "مێشک و دەمار", about: "دکتۆرانی پسپۆڕ لە مێشک و سیستەمی دەمارەکان." },
      bd: { name: "مێشک و دەماره", about: "دکتۆرێن تایبەت ب مێشک و سیستەما دەماران." },
      ar: { name: "طب الأعصاب", about: "أطباء مختصون بالدماغ والجهاز العصبي." },
    },
  },
  {
    aliases: ["family medicine", "family practice"],
    text: {
      en: { name: "Family medicine", about: "General medical care for people of different ages." },
      ku: { name: "پزیشکی خێزان", about: "چاودێری پزیشکی گشتی بۆ تەمەنە جیاوازەکان." },
      bd: { name: "پزیشکیا خێزانێ", about: "چاڤدێریا پزیشکی یا گشتی بۆ تەمەنێن جودا." },
      ar: { name: "طب الأسرة", about: "رعاية طبية عامة لمختلف الأعمار." },
    },
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/[\s_-]+/g, " ").replace(/&/g, "and");
}

/** Never manufacture specialties: only decorate a name already in public results. */
export function patientSpecialtyDetails(sourceName: string, locale: UiLocale): Details | null {
  const value = normalize(sourceName);
  const entry = entries.find(({ aliases, text }) =>
    aliases.some((alias) => normalize(alias) === value)
    || Object.values(text).some((detail) => normalize(detail.name) === value));
  return entry?.text[locale] ?? null;
}

/** This is not proof of credentials; labels are clinic-published descriptions only. */
export function publishedSubspecialties(
  doctors: ReadonlyArray<{ specialty: string | null; subspecialty?: string | null }>,
  specialty: string,
) {
  const seen = new Set<string>();
  return doctors.flatMap((doctor) => {
    const name = doctor.subspecialty?.trim();
    if (normalize(doctor.specialty ?? "") !== normalize(specialty) || !name) return [];
    const key = normalize(name);
    if (seen.has(key)) return [];
    seen.add(key);
    return [name];
  }).sort((a, b) => a.localeCompare(b));
}
