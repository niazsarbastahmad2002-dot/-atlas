import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashVerifiedPhone } from "@/lib/whatsapp-verification";

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
type Rpc = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

export function internalWhatsAppEmail(phone: string) {
  return `wa_${hashVerifiedPhone(phone).slice(0, 48)}@auth.atlas.invalid`;
}

async function resolveUserId(admin: ReturnType<typeof createAdminClient>, phone: string) {
  const rpc = admin.rpc as unknown as Rpc;
  const result = await rpc("resolve_whatsapp_identity_service", {
    p_phone: phone,
    p_phone_hash: hashVerifiedPhone(phone),
  });
  if (result.error) throw new Error("Atlas WhatsApp identity lookup failed.");
  return typeof result.data === "string" ? result.data : null;
}

async function bindUser(admin: ReturnType<typeof createAdminClient>, phone: string, userId: string) {
  const rpc = admin.rpc as unknown as Rpc;
  const result = await rpc("bind_whatsapp_identity_service", {
    p_phone_hash: hashVerifiedPhone(phone),
    p_user_id: userId,
  });
  if (result.error || result.data !== true) throw new Error("Atlas WhatsApp identity binding failed.");
}

export async function establishWhatsAppAtlasSession(phone: string) {
  const admin = createAdminClient();
  const email = internalWhatsAppEmail(phone);
  let userId = await resolveUserId(admin, phone);
  let user = null as any;

  if (userId) {
    const existing = await admin.auth.admin.getUserById(userId);
    if (!existing.error && existing.data.user) user = existing.data.user;
  }

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: {
        atlas_phone: phone,
        atlas_identity: "whatsapp_phone",
        phone_verified_via: "whatsapp",
      },
    });

    if (!created.error && created.data.user) {
      user = created.data.user;
      userId = user.id;
    } else {
      // Two correct verifications for the same phone can arrive at nearly the
      // same time. The Auth phone uniqueness constraint chooses one identity;
      // the losing request resolves and reuses that identity instead of creating
      // a duplicate Atlas user.
      userId = await resolveUserId(admin, phone);
      if (!userId) throw created.error ?? new Error("Atlas user creation failed.");
      const raced = await admin.auth.admin.getUserById(userId);
      if (raced.error || !raced.data.user) throw raced.error ?? new Error("Atlas user lookup failed.");
      user = raced.data.user;
    }
  }

  const metadata = {
    ...(user.user_metadata ?? {}),
    atlas_phone: phone,
    atlas_identity: "whatsapp_phone",
    phone_verified_via: "whatsapp",
  };

  const updated = await admin.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
    phone,
    phone_confirm: true,
    user_metadata: metadata,
  });
  if (updated.error || !updated.data.user) throw updated.error ?? new Error("Atlas user update failed.");
  user = updated.data.user;

  await bindUser(admin, phone, user.id);

  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (generated.error || !generated.data.properties?.hashed_token) {
    throw generated.error ?? new Error("Atlas session token generation failed.");
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: generated.data.properties.hashed_token,
  });
  if (verified.error || !verified.data.user) throw verified.error ?? new Error("Atlas session verification failed.");
  return verified.data.user;
}
