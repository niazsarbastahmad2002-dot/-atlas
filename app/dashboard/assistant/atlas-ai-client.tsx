"use client";

// Keep the production entry point on the React-owned client. The V5 wrapper
// rewrites preset buttons with DOM APIs and can fight React reconciliation on
// iOS/iPadOS, leaving the page unresponsive before an AI request is sent.
export { AtlasAiClient } from "./atlas-ai-client-v4";
