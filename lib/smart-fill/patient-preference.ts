import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type RpcError = { code?: string } | null;
type SmartFillRpcClient = {
  rpc: (
    name: "patient_get_earlier_slot_preference" | "patient_set_earlier_slot_preference",
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError }>;
};

function smartFillRpc(admin: AdminClient) {
  return admin as unknown as SmartFillRpcClient;
}

export async function getPatientEarlierSlotPreference(admin: AdminClient, tokenHash: string) {
  const { data, error } = await smartFillRpc(admin).rpc("patient_get_earlier_slot_preference", {
    p_token_hash: tokenHash,
  });
  return { enabled: data === true, error };
}

export async function setPatientEarlierSlotPreference(
  admin: AdminClient,
  tokenHash: string,
  enabled: boolean,
) {
  const { data, error } = await smartFillRpc(admin).rpc("patient_set_earlier_slot_preference", {
    p_token_hash: tokenHash,
    p_enabled: enabled,
  });
  return { updated: data === true, error };
}
