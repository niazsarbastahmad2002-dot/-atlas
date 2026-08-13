const safeAuthDestinations = new Set(["/dashboard"]);

export function safeAuthDestination(value: string | null | undefined) {
  return value && safeAuthDestinations.has(value) ? value : "/dashboard";
}
