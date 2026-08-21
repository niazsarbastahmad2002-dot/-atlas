import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashVerifiedPhone } from "@/lib/whatsapp-verification";

function internalEmail(phone: string) {
  return `wa_${hashVerifiedPhone(phone).slice(0, 48)}@auth.atlas.invalid`;
}

export async function establishWhatsAppAtlasSession(phone: string) {
  const admin = createAdminClient();
  const email = internalEmail(phone);
  let user = null as any;
  let page = 1;

  while (page <= 5 && !user) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    user = listed.data.users.find((candidate) =>
      candidate.phone === phone
      || candidate.user_metadata?.atlas_phone === phone
      || candidate.email === email
    ) ?? null;
    if (listed.data.users.length < 200) break;
    page += 1;
  }

  const metadata = {
    ...(user?.user_metadata ?? {}),
    atlas_phone: phone,
    atlas_identity: "whatsapp_phone",
    phone_verified_via: "whatsapp",
  };

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: metadata,
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("Atlas user creation failed.");
    user = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: metadata,
    });
    if (updated.error || !updated.data.user) throw updated.error ?? new Error("Atlas user update failed.");
    user = updated.data.user;
  }

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
