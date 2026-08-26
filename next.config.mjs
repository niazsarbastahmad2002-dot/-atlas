let supabaseOrigin = "";
try {
  supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
} catch {}

const metaTestPreview = (
  process.env.ATLAS_WHATSAPP_MODE === "meta_test"
  && process.env.VERCEL_ENV !== "production"
);

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""} https://graph.facebook.com https://www.facebook.com`,
  "frame-src 'self' https://www.facebook.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // The Meta test branch should be usable without asking for extra public
  // Vercel flags. These values are compiled into the client only when the
  // server-side runtime is explicitly meta_test and Vercel is not production.
  // Production keeps its normal explicit feature gates.
  ...(metaTestPreview ? {
    env: {
      NEXT_PUBLIC_ATLAS_DIRECT_META_OTP_ENABLED: "true",
      NEXT_PUBLIC_ATLAS_WHATSAPP_OTP_ENABLED: "true",
    },
  } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
