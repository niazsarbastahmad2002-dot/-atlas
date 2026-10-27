import { expect, test } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// Only for a separate synthetic QA clinic. Real patients and founder sessions are forbidden.
const base = process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org";
const diagnostic = process.env.ATLAS_QA_LOCAL_DIAGNOSTICS === "true";
const expectedOrigin = diagnostic ? "http://127.0.0.1:3100" : "https://atlasclinic.dpdns.org";

async function qaSession(role) {
  const id = process.env.ATLAS_QA_CLINIC_ID;
  const name = process.env.ATLAS_QA_CLINIC_NAME;
  const receptionist = role === "receptionist";
  const ownerId = process.env.ATLAS_QA_USER_ID;
  const userId = receptionist ? process.env.ATLAS_QA_RECEPTIONIST_USER_ID : ownerId;
  const doctorId = process.env.ATLAS_QA_RECEPTIONIST_DOCTOR_ID;
  const email = receptionist ? process.env.ATLAS_QA_RECEPTIONIST_EMAIL : process.env.ATLAS_QA_EMAIL;
  const password = receptionist ? process.env.ATLAS_QA_RECEPTIONIST_PASSWORD : process.env.ATLAS_QA_PASSWORD;
  const url = process.env.ATLAS_QA_SUPABASE_URL;
  const key = process.env.ATLAS_QA_PUBLISHABLE_KEY;
  const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? "");
  if (new URL(base).origin !== expectedOrigin || !uuid(id) || !uuid(userId) ||
      !uuid(ownerId) || (receptionist && (!uuid(doctorId) || userId === ownerId)) ||
      !name?.startsWith("Atlas QA") ||
      !/^atlas-qa-[a-z0-9-]+@example\.invalid$/i.test(email ?? "") ||
      !password || password.length < 20 || !key) {
    throw new Error("A separate Atlas QA identity and protected password are required.");
  }
  if (url !== "https://moazrwbalqiyoafrydkj.supabase.co") {
    throw new Error("QA authentication must use only Atlas's existing project.");
  }
  const values = new Map();
  const client = createServerClient(url, key, {
    cookieOptions: { path: "/", sameSite: "lax", secure: !diagnostic },
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
    client.from("clinic_members").select("clinic_id,role,assigned_doctor_id").eq("user_id", userId),
    client.from("clinics").select("id,name,owner_id"),
  ]);
  if (members.error || clinics.error ||
      members.data?.length !== 1 ||
      members.data[0].clinic_id !== id ||
      members.data[0].role !== role ||
      (receptionist && members.data[0].assigned_doctor_id !== doctorId) ||
      clinics.data?.length !== 1 ||
      clinics.data[0].id !== id ||
      clinics.data[0].name !== name ||
      clinics.data[0].owner_id !== ownerId) {
    throw new Error("QA tenant membership/isolation verification failed.");
  }

  // A head-only count prevents loading patient fields and stops before opening
  // the dashboard if this tenant contains any appointment data.
  const empty = await client.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", id);
  if (empty.error || empty.count !== 0) throw new Error("QA clinic must contain no appointment data.");
  if (receptionist) {
    const doctors = await client.from("doctors").select("id,clinic_id,name,active");
    if (doctors.error || doctors.data?.length !== 1 ||
        doctors.data[0].id !== doctorId || doctors.data[0].clinic_id !== id ||
        doctors.data[0].name !== "Atlas QA - Synthetic Doctor" || !doctors.data[0].active) {
      throw new Error("Receptionist must see only the assigned synthetic QA doctor.");
    }
  }

  // Never replay cookies that do not belong to the intended Supabase project.
  const authCookie = "sb-moazrwbalqiyoafrydkj-auth-token";
  if (!values.size || [...values].some(([cookieName, value]) =>
      !new RegExp("^" + authCookie + "(?:\\.\\d+)?$").test(cookieName) || !value)) {
    throw new Error("Unexpected QA session cookie shape; refusing browser login.");
  }
  const cookies = [...values].map(([name, value]) => ({
    name, value, domain: new URL(base).hostname, path: "/", expires: -1,
    httpOnly: false, secure: !diagnostic, sameSite: "Lax",
  }));
  values.clear();
  if (!cookies.some((cookie) => cookie.name.includes("-auth-token"))) {
    throw new Error("QA login did not produce a browser auth cookie.");
  }
  return { id, name, doctorId, state: { cookies, origins: [] } };
}

for (const role of ["owner", "receptionist"]) {
for (const locale of ["en", "ku", "bd", "ar"]) {
  test(`synthetic ${role} dashboard is isolated and usable (${locale})`, async ({ browser }, testInfo) => {
    test.setTimeout(180_000);
    const { id, name, doctorId, state } = await qaSession(role);
    const { viewport, isMobile, hasTouch } = testInfo.project.use;
    const context = await browser.newContext({
      viewport, isMobile, hasTouch,
      baseURL: base, storageState: state, acceptDownloads: false, serviceWorkers: "block",
    });
    const page = await context.newPage();
    const writes = [], errors = [], serverErrors = [];
    await context.route("**/*", (route) => {
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
    if (diagnostic) page.on("console", (message) => {
      if (message.type() === "error" && /hydrat|didn't match|did not match/i.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 500 && new URL(res.url()).origin === new URL(base).origin) {
        serverErrors.push(res.status() + " " + new URL(res.url()).pathname);
      }
    });
    try {
        await context.addCookies([{ name: "atlas_ui_locale", value: locale, domain: new URL(base).hostname, path: "/", secure: !diagnostic, sameSite: "Lax" }]);
        const response = await page.goto("/dashboard?clinic=" + encodeURIComponent(id), {
          waitUntil: "domcontentloaded",
        });
        expect(response?.status()).toBeLessThan(400);
        await expect(page, "QA account must actually be signed in").not.toHaveURL(/\/login(?:\?|$)/);
        await expect(page.locator(".workspace-header h1"), "Only expected QA clinic should render")
          .toHaveText(name);
        await expect(page.locator("main[data-atlas-clinic]")).toHaveAttribute("data-atlas-clinic", id);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
        await expect(page.locator(".clinic-switcher")).toHaveCount(0);
        await expect(page.locator("[data-atlas-appointment-id]")).toHaveCount(0);
        if (role === "receptionist") {
          await expect(page.locator("input[name=doctor_id]")).toHaveValue(doctorId);
          await expect(page.locator(".composer-doctor-lock strong")).toHaveText("Atlas QA - Synthetic Doctor");
          await expect(page.locator(".doctor-schedule-tabs")).toHaveCount(0);
        }
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        expect(overflows, "Dashboard should fit this viewport").toBe(false);
      await page.waitForLoadState("networkidle");
      if (role === "receptionist") {
        await page.goto("/dashboard/staff?clinic=" + encodeURIComponent(id), { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: { en: "Administration access required.", ku: "دەسەڵاتی بەڕێوەبردن پێویستە.", bd: "دەستهەلاتا بەڕێڤەبرنێ پێدڤییە.", ar: "صلاحية الإدارة مطلوبة." }[locale], exact: true })).toBeVisible();
        await expect(page.locator("form")).toHaveCount(0);
        await page.waitForLoadState("networkidle");
      }
      // Keep every write blocked, including the dev overlay's stack resolver.
      // Report the underlying hydration diff before those diagnostic POSTs.
      if (diagnostic && errors.length) throw new Error("Local hydration diagnostics:\n" + errors.join("\n\n"));
      expect(writes, "No production mutations").toEqual([]);
      expect(serverErrors, "No server errors").toEqual([]);
      expect(errors, "No browser errors").toEqual([]);
    } finally {
      await context.close();
    }
  });
}
}
