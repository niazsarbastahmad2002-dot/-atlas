"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "rate-limited" | "error";
  message: string;
};

export async function requestMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const configuredSiteUrl = process.env.SITE_URL?.trim();
  let origin: string;

  try {
    origin = new URL(configuredSiteUrl ?? "").origin;
  } catch {
    return { status: "error", message: "Atlas sign-in is not configured yet." };
  }

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
