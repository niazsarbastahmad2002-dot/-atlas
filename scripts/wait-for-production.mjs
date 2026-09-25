const baseUrl = (process.env.ATLAS_PRODUCTION_URL ?? "https://atlasclinic.dpdns.org").replace(/\/$/, "");
const expectedCommit = process.env.ATLAS_EXPECTED_COMMIT ?? "";
const timeoutMs = Number(process.env.ATLAS_PRODUCTION_WAIT_MS ?? 360000);
const intervalMs = 5000;

if (!expectedCommit) {
  throw new Error("ATLAS_EXPECTED_COMMIT is required.");
}

const deadline = Date.now() + timeoutMs;
let lastSeen = "unreachable";

while (Date.now() < deadline) {
  try {
    const response = await fetch(`${baseUrl}/api/version?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "User-Agent": "Atlas-Production-Smoke/1.0" },
    });
    if (response.ok) {
      const body = await response.json();
      lastSeen = typeof body?.commit === "string" ? body.commit : "invalid-response";
      if (lastSeen === expectedCommit) {
        console.log(`Atlas production is serving commit ${expectedCommit}.`);
        process.exit(0);
      }
    } else {
      lastSeen = `http-${response.status}`;
    }
  } catch (error) {
    lastSeen = error instanceof Error ? error.message : String(error);
  }

  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

throw new Error(`Timed out waiting for Atlas production commit ${expectedCommit}. Last observed: ${lastSeen}`);
