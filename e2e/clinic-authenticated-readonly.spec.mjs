import { expect, test } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// Only for a separate synthetic QA clinic. Real patients and founder sessions are forbidden.
const base = process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org";

async function qaSession() {
  const id = process.env.ATLAS_QA_CLINIC_ID;
  const name = process.env.ATLAS_QA_CLINIC_NAME;
  const userId = process.env.ATLAS_QA_USER_ID;
  const email = process.env.ATLAS_QA_EMAIL;
  const password = process.env.ATLAS_QA_PASSWORD;
  const url = process.env.ATLAS_QA_SUPABASE_URL;
  const key = process.env.ATLAS_QA_PUBLISHABLE_KEY;
  const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? "");
  if (new URL(base).hostname !== "atlasclinic.dpdns.org" || !uuid(id) || !uuid(userId) ||
      !name?.startsWith("Atlas QA") ||
      !/^atlas-qa-[a-z0-9-]+@example\.invalid$/i.test(email ?? "") ||
      !password || password.length < 24 || !key) {
    throw new Error("A separate Atlas QA identity and protected password are required.");
  }
  if (url !== "https://moazrwbalqiyoafrydkj.supabase.co") {
    throw new Error("QA authentication must use only Atlas's existing project.");
  }
  const values = new Map();
  const client = createServerClient(url, key, {
    cookieOptions: { path: "/", sameSite: "lax", secure: true },
    cookies: {
      getAll: () => [...values].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) {
          if (item.value) values.set(item.name, item.value);
          else values.delete(item.name);
        }
      },
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || data.user?.id !== userId) {
    throw new Error("QA login failed or authenticated an unexpected user.");
  }

  // Independently prove this login has one clinic: its own synthetic QA tenant.
  // Query through the signed-in user's RLS-scoped client; never fetch another
  // clinic by ID or print private database rows to CI logs.
  const [members, clinics] = await Promise.all([
    client.from("clinic_members").select("clinic_id,role").eq("user_id", userId),
    client.from("clinics").select("id,name,owner_id"),
  ]);
  if (members.error || clinics.error ||
      members.data?.length !== 1 ||
      members.data[0].clinic_id !== id ||
      members.data[0].role !== "owner" ||
      clinics.data?.length !== 1 ||
      clinics.data[0].id !== id ||
      clinics.data[0].name !== name ||
      clinics.data[0].owner_id !== userId) {
    throw new Error("QA tenant membership/isolation verification failed.");
  }

  // Never replay cookies that do not belong to the intended Supabase project.
  const authCookie = "sb-moazrwbalqiyoafrydkj-auth-token";
  if (!values.size || [...values].some(([cookieName, value]) =>
      !new RegExp("^" + authCookie + "(?:\\.\\d+)?$").test(cookieName) || !value)) {
    throw new Error("Unexpected QA session cookie shape; refusing browser login.");
  }
  const cookies = [...values].map(([name, value]) => ({
    name, value, domain: new URL(base).hostname, path: "/", expires: -1,
    httpOnly: false, secure: true, sameSite: "Lax",
  }));
  values.clear();
  if (!cookies.some((cookie) => cookie.name.includes("-auth-token"))) {
    throw new Error("QA login did not produce a browser auth cookie.");
  }
  return { id, name, state: { cookies, origins: [] } };
}

test("synthetic authenticated clinic dashboard is private and usable", async ({ browser }) => {
  test.setTimeout(90_000);
  const { id, name, state } = await qaSession();
  const context = await browser.newContext({ baseURL: base, storageState: state, acceptDownloads: false });
  const page = await context.newPage();
  const writes = [], errors = [], serverErrors = [];
  await page.route("**/*", (route) => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    const requestURL = new URL(route.request().url());
    // Block automatic analytics too, but don't mistake it for patient data writes.
    if (route.request().method() === "POST" &&
        requestURL.origin === new URL(base).origin &&
        requestURL.pathname === "/api/analytics") {
      return route.abort("blockedbyclient");
    }
    writes.push(route.request().method() + " " + requestURL.pathname);
    return route.abort("blockedbyclient");
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (res) => {
    if (res.status() >= 500 && new URL(res.url()).origin === new URL(base).origin) {
      serverErrors.push(res.status() + " " + new URL(res.url()).pathname);
    }
  });
  try {
    const response = await page.goto("/dashboard?clinic=" + encodeURIComponent(id), {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(400);
    await expect(page, "QA account must actually be signed in").not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator(".workspace-header h1"), "Only expected QA clinic should render")
      .toHaveText(name);
    expect(writes, "No production mutations").toEqual([]);
    expect(serverErrors, "No server errors").toEqual([]);
    expect(errors, "No browser errors").toEqual([]);
  } finally {
    await context.close();
  }
});
