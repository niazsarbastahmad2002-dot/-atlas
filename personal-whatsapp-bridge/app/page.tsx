export default function HomePage() {
  const enabled = process.env.PERSONAL_WHATSAPP_ENABLED === "true";
  const mcpEnabled = process.env.PERSONAL_MCP_ENABLED === "true";
  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: 24 }}>
      <p style={{ fontWeight: 700 }}>Personal WhatsApp Bridge</p>
      <h1>Private messaging bridge</h1>
      <p>This service is separate from Atlas Clinic. It contains no clinic UI, patient data, or production Atlas authentication.</p>
      <div style={{ marginTop: 24, padding: 18, border: "1px solid #d9e5e1", borderRadius: 14, background: "white" }}>
        <p><strong>WhatsApp transport:</strong> {enabled ? "enabled" : "disabled"}</p>
        <p><strong>ChatGPT MCP:</strong> {mcpEnabled ? "enabled" : "disabled"}</p>
      </div>
    </main>
  );
}
