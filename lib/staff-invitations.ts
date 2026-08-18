export type PendingStaffInvitation = {
  clinic_id: string;
  role: "receptionist";
  assigned_doctor_id: string;
  invited_at: string;
  invited_by: string;
};

export const PENDING_STAFF_INVITATIONS_KEY = "atlas_pending_staff_invitations";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPendingInvitation(value: unknown): value is PendingStaffInvitation {
  if (!isRecord(value)) return false;
  return typeof value.clinic_id === "string"
    && value.role === "receptionist"
    && typeof value.assigned_doctor_id === "string"
    && typeof value.invited_at === "string"
    && typeof value.invited_by === "string";
}

export function readPendingStaffInvitations(metadata: Record<string, unknown> | null | undefined) {
  const value = metadata?.[PENDING_STAFF_INVITATIONS_KEY];
  if (!Array.isArray(value)) return [] as PendingStaffInvitation[];
  return value.filter(isPendingInvitation);
}

export function withPendingStaffInvitation(
  metadata: Record<string, unknown> | null | undefined,
  invitation: PendingStaffInvitation,
) {
  const current = readPendingStaffInvitations(metadata)
    .filter((item) => item.clinic_id !== invitation.clinic_id);
  return {
    ...(metadata ?? {}),
    [PENDING_STAFF_INVITATIONS_KEY]: [...current, invitation],
  };
}

export function withoutPendingStaffInvitation(
  metadata: Record<string, unknown> | null | undefined,
  clinicId: string,
) {
  return {
    ...(metadata ?? {}),
    [PENDING_STAFF_INVITATIONS_KEY]: readPendingStaffInvitations(metadata)
      .filter((item) => item.clinic_id !== clinicId),
  };
}
