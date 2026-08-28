import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_NUMBER = "15556685747";
const TEST_WINDOW_MS = 23 * 60 * 60 * 1000;

export async function GET() {
  if (
    process.env.VERCEL_ENV === "production"
    || process.env.ATLAS_WHATSAPP_MODE !== "meta_test"
    || process.env.NEXT_PUBLIC_ATLAS_TEST_SUPABASE_ENABLED !== "true"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Atlas WhatsApp test window</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#062d26;color:#10231f;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    main{width:min(560px,100%);background:#fff;border-radius:24px;padding:28px;box-shadow:0 18px 50px rgba(0,0,0,.22)}
    h1{margin:0 0 12px;font-size:28px;line-height:1.1}p{line-height:1.5;color:#52615e}.step{margin:20px 0;padding:16px;border:1px solid #d9e5e1;border-radius:16px}.button{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;border:0;border-radius:14px;padding:14px 16px;font:inherit;font-weight:700;cursor:pointer;background:#07845f;color:#fff}.secondary{background:#eef5f2;color:#10362d;margin-top:10px}.note{font-size:14px;color:#6b7774}.number{font-weight:700;color:#123b31}</style>
</head>
<body>
  <main>
    <h1>Open the Meta test window once</h1>
    <p>Meta's official test number cannot use Atlas's proper authentication template. A plain-text test OTP is allowed only after you message the test number, which opens Meta's 24-hour customer-service window.</p>
    <div class="step">
      <p><strong>1.</strong> Open WhatsApp and send <strong>Atlas test</strong> to <span class="number">+1 (555) 668-5747</span>.</p>
      <a class="button" target="_blank" rel="noreferrer" href="https://wa.me/${TEST_NUMBER}?text=Atlas%20test">Open WhatsApp test chat</a>
    </div>
    <div class="step">
      <p><strong>2.</strong> After the message is sent, come back here and continue. Atlas will remember this test window for 23 hours on this browser.</p>
      <button class="button" id="continue" type="button">I sent it — continue to Atlas</button>
      <a class="button secondary" href="/login">Back to Atlas without confirming</a>
    </div>
    <p class="note">This helper exists only on the isolated Vercel Preview. It is blocked in production and does not change the real +964 WhatsApp sender.</p>
  </main>
  <script>
    document.getElementById('continue').addEventListener('click', function () {
      try { localStorage.setItem('atlas-meta-test-window-confirmed-until', String(Date.now() + ${TEST_WINDOW_MS})); } catch (_) {}
      location.href = '/login';
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
