const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const requireLive = args.has("--require-live");

const value = (name) => (process.env[name] || "").trim();
const token = value("WHATSAPP_ACCESS_TOKEN");
const wabaId = value("WHATSAPP_WABA_ID");
const version = value("WHATSAPP_GRAPH_API_VERSION") || "v26.0";
const siteUrl = value("SITE_URL").replace(/\/$/, "");
const authName = value("ATLAS_WHATSAPP_AUTH_TEMPLATE_NAME") || "atlas_login_code";
const authLanguage = value("ATLAS_WHATSAPP_AUTH_TEMPLATE_LANGUAGE") || "en_US";
const staffName = value("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_NAME") || "atlas_staff_invite";
const staffLanguage = value("ATLAS_WHATSAPP_STAFF_INVITE_TEMPLATE_LANGUAGE") || "en_US";

function finish(summary, ok) {
  console.log(JSON.stringify(summary, null, 2));
  if (requireLive && !ok) process.exitCode = 1;
}

if (!token || !/^\d+$/.test(wabaId) || !/^v\d+\.\d+$/.test(version)) {
  finish({
    metaReachable: false,
    senderCredentialsPresent: Boolean(token && /^\d+$/.test(wabaId)),
    authTemplate: "UNKNOWN",
    staffInviteTemplate: "UNKNOWN",
    note: "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_WABA_ID and WHATSAPP_GRAPH_API_VERSION before running the live Meta gate.",
  }, false);
} else {
  const base = `https://graph.facebook.com/${version}/${wabaId}`;

  async function graph(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    let body = null;
    try { body = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(`Meta Graph request failed with HTTP ${response.status}`);
      error.providerCode = body?.error?.code;
      throw error;
    }
    return body;
  }

  async function getTemplate(name) {
    const params = new URLSearchParams({
      name,
      fields: "id,name,status,category,language",
      limit: "20",
    });
    const body = await graph(`/message_templates?${params.toString()}`);
    return Array.isArray(body?.data)
      ? body.data.find((item) => item?.name === name) || null
      : null;
  }

  async function createAuthTemplate() {
    return graph("/message_templates", {
      method: "POST",
      body: JSON.stringify({
        name: authName,
        language: authLanguage,
        category: "AUTHENTICATION",
        message_send_ttl_seconds: 60,
        components: [
          { type: "BODY", add_security_recommendation: true },
          { type: "FOOTER", code_expiration_minutes: 10 },
          {
            type: "BUTTONS",
            buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy Code" }],
          },
        ],
      }),
    });
  }

  async function createStaffInviteTemplate() {
    if (!/^https:\/\//.test(siteUrl)) {
      throw new Error("SITE_URL must be an https URL before Atlas can create the receptionist invite template.");
    }
    return graph("/message_templates", {
      method: "POST",
      body: JSON.stringify({
        name: staffName,
        language: staffLanguage,
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: "You've been invited to {{1}} on Atlas. Verify your WhatsApp number to join the clinic.",
            example: { body_text: [["Example Clinic"]] },
          },
          {
            type: "BUTTONS",
            buttons: [{
              type: "URL",
              text: "Open Atlas",
              url: `${siteUrl}/join/{{1}}`,
              example: ["ExampleInviteToken1234567890"],
            }],
          },
        ],
      }),
    });
  }

  try {
    let auth = await getTemplate(authName);
    let staff = await getTemplate(staffName);

    if (apply && !auth) {
      await createAuthTemplate();
      auth = await getTemplate(authName);
    }
    if (apply && !staff) {
      await createStaffInviteTemplate();
      staff = await getTemplate(staffName);
    }

    const authApproved = auth?.status === "APPROVED" && auth?.category === "AUTHENTICATION";
    const staffApproved = staff?.status === "APPROVED";
    finish({
      metaReachable: true,
      senderCredentialsPresent: true,
      authTemplate: auth ? { name: auth.name, status: auth.status, category: auth.category, language: auth.language } : "MISSING",
      staffInviteTemplate: staff ? { name: staff.name, status: staff.status, category: staff.category, language: staff.language } : "MISSING",
      authApproved,
      staffInviteApproved: staffApproved,
      releaseReady: authApproved && staffApproved,
    }, authApproved && staffApproved);
  } catch (error) {
    finish({
      metaReachable: false,
      senderCredentialsPresent: true,
      authTemplate: "UNKNOWN",
      staffInviteTemplate: "UNKNOWN",
      providerCode: error?.providerCode ?? "unknown",
      error: error instanceof Error ? error.message : "Meta readiness check failed",
    }, false);
  }
}
