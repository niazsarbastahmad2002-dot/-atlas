/**
 * Extract a single-use email token from an Atlas Supabase magic link.
 *
 * This never contacts the verification URL or follows its redirect. Remote
 * browser URL launchers can open the URL twice, consuming the link before the
 * Atlas callback has a usable browser session. The token is verified directly
 * by the existing Supabase browser client on Atlas's origin instead.
 *
 * Never log the input, token or verification URL.
 */
export function extractAtlasMagicLinkToken(
  untrustedLink: string,
  configuredSupabaseUrl: string,
): string | null {
  const link = untrustedLink.trim();
  if (!link || link.length > 4096 || !configuredSupabaseUrl) return null;

  try {
    const target = new URL(link);
    const supabase = new URL(configuredSupabaseUrl);
    if (target.protocol !== "https:" || target.origin !== supabase.origin) return null;
    if (target.username || target.password || target.hash) return null;
    if (target.pathname !== "/auth/v1/verify") return null;

    // This fallback is for existing Atlas sign-in links, not password resets,
    // invitations, changing email or arbitrary provider callbacks.
    if (target.searchParams.getAll("type").length !== 1
      || target.searchParams.get("type") !== "magiclink") return null;
    if (target.searchParams.getAll("token").length !== 1) return null;

    const tokenHash = target.searchParams.get("token") ?? "";
    if (!/^(?:[a-f0-9]{56}|[a-f0-9]{64})$/i.test(tokenHash)) return null;

    return tokenHash;
  } catch {
    return null;
  }
}
