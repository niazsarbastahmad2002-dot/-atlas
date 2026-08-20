export type AtlasSocialProviders = {
  apple: boolean;
  google: boolean;
};

type AuthSettings = {
  external?: Record<string, boolean | undefined>;
};

export async function getAtlasSocialProviders(): Promise<AtlasSocialProviders> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return { apple: false, google: false };

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!response.ok) return { apple: false, google: false };
    const settings = await response.json() as AuthSettings;
    return {
      apple: settings.external?.apple === true,
      google: settings.external?.google === true,
    };
  } catch {
    return { apple: false, google: false };
  }
}
