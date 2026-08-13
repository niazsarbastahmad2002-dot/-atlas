export const appLocale = {
  language: "en",
  direction: "ltr" as const,
  dateLocale: "en-IQ",
  calendarLocale: "en-CA",
  timeZone: "Asia/Baghdad",
  timeZoneLabel: "Erbil time",
} as const;

export const baghdadDate = new Intl.DateTimeFormat(appLocale.calendarLocale, {
  timeZone: appLocale.timeZone,
});

export const baghdadDateTime = new Intl.DateTimeFormat(appLocale.dateLocale, {
  timeZone: appLocale.timeZone,
  dateStyle: "medium",
  timeStyle: "short",
});
