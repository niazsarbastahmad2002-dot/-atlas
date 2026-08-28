import Link from "next/link";
import { redirect } from "next/navigation";
import { createPersonalSupabaseServerClient } from "../../../lib/supabase-server";

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId) {
    return <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}><h1>Invalid authorization request</h1><p>Start the ChatGPT connection again.</p></main>;
  }

  let supabase;
  try { supabase = await createPersonalSupabaseServerClient(); }
  catch { return <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}><h1>Authentication is not configured</h1></main>; }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
        <h1>Sign in to continue</h1>
        <p>Sign in to the isolated personal WhatsApp test account, then restart the ChatGPT connection.</p>
        <Link href="/login">Open sign-in</Link>
      </main>
    );
  }

  const allowedUserId = process.env.PERSONAL_OAUTH_ALLOWED_USER_ID?.trim() ?? "";
  if (!allowedUserId || userData.user.id !== allowedUserId) {
    return <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}><h1>Account not allowed</h1><p>This account cannot control the personal WhatsApp sender.</p></main>;
  }

  const { data: details, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) {
    return <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}><h1>Authorization request expired</h1><p>Start the connection again.</p></main>;
  }
  if (!("authorization_id" in details)) redirect(details.redirect_url);

  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
      <p style={{ fontWeight: 700 }}>Personal WhatsApp Bridge</p>
      <h1>Allow ChatGPT to send WhatsApp messages?</h1>
      <p>Messages can be sent only to phone numbers explicitly present in the bridge allowlist.</p>
      <div style={{ margin: "24px 0", padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <p><strong>Application:</strong> {details.client.name}</p>
        <p><strong>Permission:</strong> Send a WhatsApp message only when you explicitly ask ChatGPT to send one.</p>
      </div>
      <form action="/api/oauth/decision" method="POST" style={{ display: "flex", gap: 12 }}>
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button type="submit" name="decision" value="approve">Allow</button>
        <button type="submit" name="decision" value="deny">Deny</button>
      </form>
    </main>
  );
}
