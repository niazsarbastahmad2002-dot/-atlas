"use client";

// Do not route production through ./atlas-ai-client-v5: that wrapper rewrites
// React-owned preset buttons with DOM APIs and can fight React reconciliation
// on iOS/iPadOS, leaving the page unresponsive before an AI request is sent.
export { AtlasAiClient } from "./atlas-ai-client-v4";
