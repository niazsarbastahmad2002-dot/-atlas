const isSafePreview = process.env.VERCEL_ENV === "preview" && process.env.ATLAS_WHATSAPP_MODE === "meta_test";
const enabled = process.env.WHATSAPP_TEST_ENABLED === "true";
const token = process.env.WHATSAPP_TEST_ACCESS_TOKEN?.trim() ?? "";
const wabaId = process.env.WHATSAPP_TEST_WABA_ID?.trim() ?? "";
const version = (process.env.WHATSAPP_TEST_GRAPH_API_VERSION ?? process.env.WHATSAPP_GRAPH_API_VERSION ?? "v25.0").trim();

if (!isSafePreview || !enabled || !token || !/^\d{5,32}$/.test(wabaId) || !/^v\d+\.\d+$/.test(version)) {
  console.log("Meta staff-invite bootstrap skipped: isolated preview test configuration unavailable.");
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

try {
  const list = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?fields=name,status,language,category&limit=100`, {
    headers,
    cache: "no-store",
  });
  if (!list.ok) {
    console.log(`Meta staff-invite bootstrap could not list templates (HTTP ${list.status}).`);
    process.exit(0);
  }
  const listed = await list.json();
  const existing = Array.isArray(listed?.data)
    ? listed.data.find((item) => item?.name === "atlas_staff_invite_v1" && item?.language === "en_US")
    : null;
  if (existing) {
    console.log(`Meta staff-invite template already exists (${String(existing.status ?? "UNKNOWN").slice(0, 32)}).`);
    process.exit(0);
  }

  const response = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "atlas_staff_invite_v1",
      language: "en_US",
      category: "UTILITY",
      components: [{
        type: "BODY",
        text: "You've been invited to join {{1}} on Atlas as reception staff. Open this secure one-use link: {{2}}. This invitation expires in 24 hours.",
        example: { body_text: [["Atlas Clinic", "https://example.com/join/example-token"]] },
      }],
    }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok) {
    console.log(`Meta staff-invite template submitted (${String(body?.status ?? "UNKNOWN").slice(0, 32)}; id ${String(body?.id ?? "unknown").slice(0, 32)}).`);
  } else {
    const error = body?.error && typeof body.error === "object" ? body.error : {};
    console.log(`Meta staff-invite template submission failed (HTTP ${response.status}, code ${String(error.code ?? "unknown").slice(0, 24)}): ${String(error.message ?? "provider error").replace(/\s+/g, " ").slice(0, 180)}`);
  }
} catch {
  console.log("Meta staff-invite bootstrap hit a transport error; build will continue.");
}
