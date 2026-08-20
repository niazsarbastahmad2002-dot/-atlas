const projectRef = process.env.ATLAS_SUPABASE_PROJECT_REF ?? "moazrwbalqiyoafrydkj";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN is required.");
  process.exit(1);
}

const body = {};

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
if (googleClientId || googleClientSecret) {
  if (!googleClientId || !googleClientSecret) {
    console.error("Provide both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    process.exit(1);
  }
  body.external_google_enabled = true;
  body.external_google_client_id = googleClientId;
  body.external_google_secret = googleClientSecret;
}

const appleClientIds = process.env.APPLE_CLIENT_IDS?.trim();
const appleSecret = process.env.APPLE_SECRET?.trim();
if (appleClientIds || appleSecret) {
  if (!appleClientIds || !appleSecret) {
    console.error("Provide both APPLE_CLIENT_IDS and APPLE_SECRET.");
    process.exit(1);
  }
  body.external_apple_enabled = true;
  body.external_apple_client_id = appleClientIds;
  body.external_apple_secret = appleSecret;
}

if (!Object.keys(body).length) {
  console.error("No provider credentials supplied. Nothing changed.");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Supabase provider activation failed (${response.status}).`);
  if (text) console.error(text.slice(0, 500));
  process.exit(1);
}

const enabled = [googleClientId ? "Google" : null, appleClientIds ? "Apple" : null].filter(Boolean);
console.log(`Enabled Atlas auth provider(s): ${enabled.join(", ")}.`);
