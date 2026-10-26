/** Pure client-side interpretation; the server remains the booking authority. */
export type PatientBookingOutcome =
  | "saved" | "slot_taken" | "unavailable" | "rate_limited"
  | "verification_required" | "idempotency_mismatch" | "uncertain" | "failed";

/** A retry must reuse its original idempotency key AND exact payload. */
export function bookingRetryMatches(firstPayload: string | null, nextPayload: string) {
  return firstPayload === null || firstPayload === nextPayload;
}

export function interpretBookingResponse(httpStatus: number, payload: unknown): PatientBookingOutcome {
  const response = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as { status?: unknown; patientPath?: unknown }
    : null;
  const status = response?.status;

  // A successful HTTP response alone never constitutes a saved booking.
  if (httpStatus >= 200 && httpStatus < 300 && status === "ok" && typeof response?.patientPath === "string") {
    return "saved";
  }
  if (status === "slot_taken" || status === "unavailable" || status === "rate_limited"
      || status === "verification_required" || status === "idempotency_mismatch") return status;

  // The call may have reached the server even when the response is lost or incomplete.
  // Do not claim failure, confirmation, or encourage a new idempotency key.
  if (httpStatus >= 500 || status === "ok" || !response || typeof status !== "string") return "uncertain";
  return "failed";
}
