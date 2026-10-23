import { expect, test } from "@playwright/test";

// Only for a separate synthetic QA clinic. Real patients and founder sessions are forbidden.
const base = process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org";

function qaSession() {
  const id = process.env.ATLAS_QA_CLINIC_ID;
  const name = process.env.ATLAS_QA_CLINIC_NAME;
  const encoded = process.env.ATLAS_QA_STORAGE_STATE_BASE64;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id ?? "") ||
      !name?.startsWith("Atlas QA") || !encoded) {
    throw new Error("Configure a dedicated synthetic Atlas QA clinic and private QA session first.");
  }
  let state;
  try { state = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); }
  catch { throw new Error("Invalid private QA browser session format."); }
  if (!Array.isArray(state.cookies) || state.cookies.length === 0 ||
      state.cookies.some((c) => c.domain.replace(/^\./, "") !== new URL(base).hostname) ||
      (state.origins ?? []).some((o) => o.origin !== new URL(base).origin)) {
    throw new Error("QA session must contain only the intended production origin.");
  }
  return { id, name, state };
}

test("synthetic authenticated clinic dashboard is private and usable", async ({ browser }) => {
  test.setTimeout(90_000);
  const { id, name, state } = qaSession();
  const context = await browser.newContext({ baseURL: base, storageState: state, acceptDownloads: false });
  const page = await context.newPage();
  const writes = [], errors = [], serverErrors = [];
  await page.route("**/*", (route) => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    writes.push(route.request().method() + " " + new URL(route.request().url()).pathname);
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
