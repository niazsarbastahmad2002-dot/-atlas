"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "rate-limited" | "error";
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
