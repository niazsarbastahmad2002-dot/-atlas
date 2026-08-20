const safeAuthDestinations = new Set(["/dashboard"]);
const staffInviteFinish = /^\/join\/[A-Za-z0-9_-]{43}\/finish$/;

export function safeAuthDestination(value: string | null | undefined) {
  if (!value) return "/dashboard";
  if (safeAuthDestinations.has(value)) return value;
  if (staffInviteFinish.test(value)) return value;
  return "/dashboard";
}
