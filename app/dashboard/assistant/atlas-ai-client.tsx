"use client";

// Production stays on the React-owned V4 voice/chat core. V8 only adds
// idempotent response-table polish and React-rendered clinic-safe quick questions;
// it does not replace V4 controls or install a second microphone lifecycle.
export { AtlasAiClient } from "./atlas-ai-client-v8";
