export type AtlasSupabasePublicConfig = {
  url: string;
  publishableKey: string;
  isolatedTest: boolean;
};

/**
 * Resolve the browser/server Supabase endpoint without mutating Atlas production
 * credentials. The isolated override uses distinct NEXT_PUBLIC_* names and is
 * only enabled when the Preview explicitly opts in.
 */
export function readAtlasSupabasePublicConfig(): AtlasSupabasePublicConfig {
  const isolatedTest = process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_ENABLED === "true";
  const testUrl = process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_URL?.trim() ?? "";
  const testPublishableKey = process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (isolatedTest && testUrl && testPublishableKey) {
    return {
      url: testUrl,
      publishableKey: testPublishableKey,
      isolatedTest: true,
    };
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
    isolatedTest: false,
  };
}
