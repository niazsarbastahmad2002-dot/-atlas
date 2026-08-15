"use server";

import { redirect } from "next/navigation";
import { createInternalAuthPassword, verifyStaffSetupCode } from "@/lib/staff-onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "rate-limited" | "error";
  message: string;
};

export type SetupCodeState = {
  status: "idle" | "authenticated" | "error";
  message: string;
};

function siteOrigin() {
  const configuredSiteUrl = process.env.SITE_URL?.trim();
  try {
    return new URL(configuredSiteUrl ?? "").origin;
  } catch {
    return null;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signInWithSetupCode(
  _previousState: SetupCodeState,
  formData: FormData,
): Promise<SetupCodeState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("setup_code") ?? "").replace(/\D/g, "");

  if (!validEmail(email) || !/^\d{8}$/.test(code)) {
    return { status: "error", message: "Enter your work email and 8-digit Atlas setup code." };
  }

  const admin = createAdminClient();
  const onboardingAdmin = admin as any;
  const { data: invite, error: inviteError } = await onboardingAdmin
    .from("staff_onboarding_codes")
    .select("id, user_id, email, code_salt, code_hash, expires_at, used_at, attempts")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError || !invite) {
    return { status: "error", message: "That setup code is not active. Ask the clinic owner for a new code." };
  }

  if (invite.attempts >= 6 || new Date(invite.expires_at).getTime() <= Date.now()) {
    return { status: "error", message: "That setup code expired. Ask the clinic owner for a new one." };
  }

  if (!verifyStaffSetupCode(code, invite.code_salt, invite.code_hash)) {
    await onboardingAdmin
      .from("staff_onboarding_codes")
      .update({ attempts: Math.min(invite.attempts + 1, 12) })
      .eq("id", invite.id);
    return { status: "error", message: "That setup code is not correct." };
  }

  const password = createInternalAuthPassword();
  const { error: passwordError } = await admin.auth.admin.updateUserById(invite.user_id, {
    password,
    email_confirm: true,
  });
  if (passwordError) {
    console.error("Atlas onboarding password preparation failed", { code: passwordError.code });
    return { status: "error", message: "Atlas could not finish device setup. Try again." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error("Atlas onboarding sign-in failed", { code: signInError.code });
    return { status: "error", message: "Atlas could not finish sign-in. Try again." };
  }

  await onboardingAdmin
    .from("staff_onboarding_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { status: "authenticated", message: "Device verified. Finish the one-time device setup." };
}

export async function signInWithGoogle() {
  const origin = siteOrigin();
  if (!origin) redirect("/login?error=google_unavailable");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    console.warn("Atlas Google sign-in unavailable", { code: error?.code ?? "missing_oauth_url" });
    redirect("/login?error=google_unavailable");
  }

  redirect(data.url);
}

export async function requestMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!validEmail(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const origin = siteOrigin();
  if (!origin) return { status: "error", message: "Atlas sign-in is not configured yet." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      console.warn("Atlas email rate limit reached", { code: error.code });
      return {
        status: "rate-limited",
        message: "Too many sign-in emails were requested. Wait a few minutes or use the test workspace.",
      };
    }

    if (error.code === "email_address_invalid") {
      return {
        status: "error",
        message: "Use a valid email address that can receive messages.",
      };
    }

    console.error("Atlas magic-link request failed", { code: error.code });
    return {
      status: "error",
      message: "We could not send the sign-in link. Please try again.",
    };
  }

  return {
    status: "sent",
    message: "Check your email for the secure sign-in link.",
  };
}
