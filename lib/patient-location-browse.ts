/**
 * An intentionally bounded browse tree built only from published-doctor RPC rows.
 * No location catalog, geocoding, private clinic table or inferred street names.
 */
import type { UiLocale } from "./i18n/ui";

export type PublishedLocationDoctor = {
  city?: string | null;
  area?: string | null;
  clinic_slug?: string | null;
  clinic_name?: string | null;
  doctor_slug?: string | null;
  doctor_name?: string | null;
};

export type LocationDoctor = { slug: string; name: string };
export type LocationClinic = { slug: string; name: string; doctors: LocationDoctor[] };
export type LocationArea = { name: string | null; clinics: LocationClinic[] };
export type LocationCity = { key: string; name: string; areas: LocationArea[] };

export function normalizeLocationText(value: string): string {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ك/g, "ک")
    .replace(/[يى]/g, "ی")
    .replace(/[\u200C\u200D\u200E\u200F]/g, "")
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ")
    .trim();
}

// Search synonyms never create a city: the city must already appear in public RPC rows.
const cityAliases: Record<string, string[]> = {
  erbil: ["Erbil", "Arbil", "Hawler", "Hewler", "Hewlêr", "هەولێر", "هولێر", "أربيل", "اربيل"],
  duhok: ["Duhok", "Dohuk", "Dahuk", "دهۆک", "دهوك", "دهوک", "دهۆك"],
  sulaymaniyah: ["Sulaymaniyah", "Sulaimani", "Slemani", "Sulaimaniya", "سلێمانی", "سليمانية", "السليمانية"],
};
const aliasLookup = new Map(Object.entries(cityAliases)
  .flatMap(([key, names]) => names.map((name) => [normalizeLocationText(name), key] as const)));

function cityKey(name: string): string {
  const normalized = normalizeLocationText(name);
  return aliasLookup.get(normalized) ?? normalized;
}

const translatedCities: Record<string, Record<UiLocale, string>> = {
  erbil: { en: "Erbil", ku: "هەولێر", bd: "هەولێر", ar: "أربيل" },
  duhok: { en: "Duhok", ku: "دهۆک", bd: "دهۆک", ar: "دهوك" },
  sulaymaniyah: { en: "Sulaymaniyah", ku: "سلێمانی", bd: "سلێمانی", ar: "السليمانية" },
};

export function publishedCityLabel(city: LocationCity, locale: UiLocale): string {
  return translatedCities[city.key]?.[locale] ?? city.name;
}

function safeSlug(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function matchesLocation(row: PublishedLocationDoctor, query: string): boolean {
  if (!query) return true;
  const name = row.city?.trim() ?? "";
  return [name, row.area, row.clinic_name, row.doctor_name]
    .some((value) => Boolean(value && normalizeLocationText(value).includes(query)))
    || Boolean(name && cityKey(name).includes(query))
    || Boolean(name && aliasLookup.get(query) === cityKey(name));
}

export function buildPublishedLocationTree(rows: PublishedLocationDoctor[], search = ""): LocationCity[] {
  const query = normalizeLocationText(search.slice(0, 100));
  const cities = new Map<string, {
    name: string;
    areas: Map<string, { name: string | null; clinics: Map<string, LocationClinic> }>;
  }>();

  for (const row of rows) {
    const city = row.city?.trim();
    const clinicName = row.clinic_name?.trim();
    const doctorName = row.doctor_name?.trim();
    if (!city || !clinicName || !doctorName
      || !safeSlug(row.clinic_slug) || !safeSlug(row.doctor_slug)
      || !matchesLocation(row, query)) continue;

    const key = cityKey(city);
    let cityEntry = cities.get(key);
    if (!cityEntry) {
      cityEntry = { name: city, areas: new Map() };
      cities.set(key, cityEntry);
    }
    // "area" is clinic-published free text, NOT verified district/street data.
    const area = row.area?.trim() || null;
    const areaKey = area ? normalizeLocationText(area) : "";
    let areaEntry = cityEntry.areas.get(areaKey);
    if (!areaEntry) {
      areaEntry = { name: area, clinics: new Map() };
      cityEntry.areas.set(areaKey, areaEntry);
    }
    let clinic = areaEntry.clinics.get(row.clinic_slug);
    if (!clinic) {
      clinic = { slug: row.clinic_slug, name: clinicName, doctors: [] };
      areaEntry.clinics.set(row.clinic_slug, clinic);
    }
    if (!clinic.doctors.some((doctor) => doctor.slug === row.doctor_slug)) {
      clinic.doctors.push({ slug: row.doctor_slug, name: doctorName });
    }
  }

  return Array.from(cities, ([key, city]) => ({
    key,
    name: city.name,
    areas: Array.from(city.areas.values(), (area) => ({
      name: area.name,
      clinics: Array.from(area.clinics.values(), (clinic) => ({
        ...clinic,
        doctors: clinic.doctors.sort((a, b) => a.name.localeCompare(b.name)),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    })).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
  })).sort((a, b) => a.name.localeCompare(b.name));
}
