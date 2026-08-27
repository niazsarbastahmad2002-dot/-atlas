import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readAtlasSupabasePublicConfig } from "@/lib/supabase/runtime-config";

export function createAdminClient() {
  const publicConfig = readAtlasSupabasePublicConfig();
  const secretKey = publicConfig.isolatedTest
    ? process.env.ATLAS_TEST_SUPABASE_SECRET_KEY?.trim()
    : (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!publicConfig.url || !secretKey) throw new Error("Atlas server database credentials are not configured.");

  return createClient<Database>(publicConfig.url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
