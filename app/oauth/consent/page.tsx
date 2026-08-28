import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

const TEST_SUPABASE_ORIGIN = "https://qyhqqoxafdscagmfzlmp.supabase.co";

type ConsentPageProps = {
  searchParams: Promise<{ authorization_id?: string }>;
};

export default async function WhatsAppOAuthConsentPage({ searchParams }: ConsentPageProps) {
  if (process.env.VERCEL_ENV === "production" || process.env.ATLAS_WHATSAPP_MODE !== "meta_test") {
    notFound();
  }

  const config = readAtlasSupabasePublicConfig();
  if (!config.isolatedTest || config.url.replace(/\/$/, "") !== TEST_SUPABASE_ORIGIN) {
    notFound();
  }

  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <h1>Invalid authorization request</h1>
        <p>The authorization ID is missing. Start the ChatGPT connection again.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <h1>Sign in to continue</h1>
        <p>
          This authorization uses the isolated Atlas WhatsApp Auth Test account. Sign in first,
          then restart the ChatGPT connection so this consent screen can verify you.
        </p>
        <Link href="/login">Open test sign-in</Link>
      </main>
    );
  }

  const allowedUserId = process.env.WHATSAPP_PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
  if (!allowedUserId || userData.user.id !== allowedUserId) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <h1>Account not allowed</h1>
        <p>This test account is not authorized to control the personal WhatsApp sender.</p>
      </main>
    );
  }

  const { data: authDetails, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !authDetails) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <h1>Authorization request expired</h1>
        <p>Start the ChatGPT connection again to create a fresh authorization request.</p>
      </main>
    );
  }

  if (!("authorization_id" in authDetails)) {
    redirect(authDetails.redirect_url);
  }

  const scopes = authDetails.scope?.split(" ").filter(Boolean) ?? [];

  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
      <p style={{ fontWeight: 700 }}>Atlas WhatsApp Test</p>
      <h1>Allow ChatGPT to send WhatsApp messages?</h1>
      <p>
        This is the isolated test sender. It cannot use Atlas production WhatsApp and it can
        message only Meta test recipients already on the allowlist.
      </p>
      <div style={{ margin: "24px 0", padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <p><strong>Application:</strong> {authDetails.client.name}</p>
        <p><strong>Permission:</strong> send a WhatsApp message only when you explicitly ask ChatGPT to send one.</p>
        {scopes.length ? <p><strong>Login scopes:</strong> {scopes.join(", ")}</p> : null}
      </div>
      <form action="/api/oauth/decision" method="POST" style={{ display: "flex", gap: 12 }}>
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button type="submit" name="decision" value="approve">Allow</button>
        <button type="submit" name="decision" value="deny">Deny</button>
      </form>
    </main>
  );
}
