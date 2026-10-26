import { createServer } from "node:http";

// Synthetic-only GoTrue-shaped provider for isolated Playwright registration QA.
// No Supabase account, database, messaging service, phone network, or Atlas secret.
const host = "127.0.0.1";
const port = 54321;
const siteOrigin = "http://127.0.0.1:3101";
const allowedPhone = "+9647500000000"; // A dummy value; NEVER delivered to any provider.
const otp = "123456"; // A dummy value accepted ONLY by this local test server.
const userId = "11111111-1111-4111-8111-111111111111";
const accounts = new Map();
let otpRequests = 0;
let successfulVerifications = 0;

function reply(res, status, body) {
  const headers = {
    "Access-Control-Allow-Origin": siteOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function parseBody(req) {
  let body = "";
  for await (const part of req) {
    body += part.toString();
    if (body.length > 4096) throw new Error("too large");
  }
  return JSON.parse(body);
}

function fakeJwt() {
  const enc = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  // Signature intentionally invalid. It must NEVER be accepted by a real API.
  return enc({ alg: "HS256", typ: "JWT" }) + "." +
    enc({ sub: userId, aud: "authenticated", role: "authenticated", exp: now + 3600 }) +
    ".synthetic-invalid-signature";
}

function user() {
  const now = new Date().toISOString();
  return {
    id: userId, aud: "authenticated", role: "authenticated",
    phone: allowedPhone, phone_confirmed_at: now,
    app_metadata: { provider: "phone", providers: ["phone"] },
    user_metadata: {}, identities: [], created_at: now, updated_at: now,
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://" + host + ":" + port);
  if (req.method === "OPTIONS") return reply(res, 200, {});

  if (req.method === "GET" && url.pathname === "/auth/v1/settings") {
    return reply(res, 200, {
      external: { phone: true, email: false, google: false },
      disable_signup: false,
    });
  }

  if (req.method === "GET" && url.pathname === "/__qa/state") {
    return reply(res, 200, {
      syntheticPatientCount: accounts.size,
      syntheticClinicMembershipCount: 0,
      syntheticAppointmentCount: 0,
      otpRequests,
      successfulVerifications,
    });
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/otp") {
    try {
      const payload = await parseBody(req);
      if (payload.phone !== allowedPhone || payload.create_user !== true ||
          (payload.channel && payload.channel !== "sms")) {
        return reply(res, 400, { code: "invalid_credentials", msg: "Synthetic QA phone/flow only" });
      }
      // An already-seen phone keeps the same synthetic identity.
      if (!accounts.has(allowedPhone)) accounts.set(allowedPhone, userId);
      otpRequests++;
      return reply(res, 200, {});
    } catch {
      return reply(res, 400, { code: "invalid_request", msg: "Invalid synthetic request" });
    }
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/verify") {
    try {
      const payload = await parseBody(req);
      if (payload.phone !== allowedPhone || payload.type !== "sms" ||
          payload.token !== otp || !accounts.has(allowedPhone)) {
        return reply(res, 403, { code: "otp_expired", msg: "Invalid or expired synthetic code" });
      }
      successfulVerifications++;
      const now = Math.floor(Date.now() / 1000);
      return reply(res, 200, {
        access_token: fakeJwt(), token_type: "bearer",
        expires_in: 3600, expires_at: now + 3600,
        refresh_token: "synthetic-invalid-refresh", user: user(),
      });
    } catch {
      return reply(res, 400, { code: "invalid_request", msg: "Invalid synthetic request" });
    }
  }

  return reply(res, 404, { code: "not_found", msg: "Local synthetic provider only" });
}).listen(port, host);
