const allowedPatientDayFlowDelays = new Set([-15, 0, 15, 30, 45, 60, 90, 120]);

export function patientDayFlowDelay(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && allowedPatientDayFlowDelays.has(value)
    ? value
    : null;
}

export function baghdadDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
