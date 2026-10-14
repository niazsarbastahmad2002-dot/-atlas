import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const active = read("app/dashboard/assistant/atlas-ai-client.tsx");
const client = read("app/dashboard/assistant/atlas-ai-client-v4.tsx");
const page = read("app/dashboard/assistant/page.tsx");

test("Atlas AI keeps the iPhone/iPad-safe React client and clinic-keyed isolation", () => {
  assert.match(active, /export \{ AtlasAiClient \} from "\.\/atlas-ai-client-v4"/);
  assert.doesNotMatch(active, /export \\{ AtlasAiClient \\} from "\\.\\/atlas-ai-client-v5"/);
  assert.match(page, /<AtlasAiClient key=\{clinic\.id\} clinicId=\{clinic\.id\}/);
  assert.match(page, /if \(params\.clinic && \(!requestedClinicId/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|document\.createElement/);
});

test("reception questions are discoverable in all supported AI languages", () => {
  for (const locale of ["en", "ku", "bd", "ar"]) {
    const match = client.match(new RegExp(`\\b${locale}: \\{[\\s\\S]*?presets: \\[([^\\]]+)\\]`));
    assert.ok(match, `missing presets for ${locale}`);
    assert.equal((match[1].match(/"/g) ?? []).length, 14, `${locale} must show seven usable examples`);
  }
  assert.match(client, /Show today's appointments with exact times/);
  assert.match(client, /مەوعیدەکانی ئەمڕۆ بە کاتی ورد/);
  assert.match(client, /وريني مواعيد اليوم ويّا الأوقات الدقيقة/);
  assert.match(client, /onClick=\{\(\)=>void askAtlas\(preset\)\}/);
});

test("AI model answers are distinct from Atlas in-app answers and never declared verified", () => {
  assert.match(client, /message\.mode==="atlas_core"\?t\.atlasAnswer:t\.modelAnswer/);
  assert.match(client, /AI-generated answer · verify before acting/);
  assert.match(client, /Atlas answer · check current records/);
  assert.match(client, /atlas-ai-answer-source/);
  assert.doesNotMatch(client, /verified clinical decision|diagnosis confirmed/);
});

test("failed requests restore the exact draft and do not duplicate a user turn", () => {
  assert.match(client, /messagesRef\.current\.filter\(item=>item\.id!==userMessage\.id\)/);
  assert.match(client, /setQuestion\(nextQuestion\)/);
  assert.match(client, /atlas-ai-request-recovery/);
  assert.match(client, /onClick=\{\(\)=>void askAtlas\(question\)\}/);
  assert.match(client, /function newChat\(\)\{ if\(loadingRef\.current\) return/);
  assert.match(client, /disabled=\{loading\}>\{t\.newChat\}/);
});

test("workspace remains keyboard-accessible, RTL-aware, and responsive", () => {
  assert.match(client, /<textarea dir="auto"/);
  assert.match(client, /className="atlas-ai-composer-hint"/);
  assert.match(client, /@media\(max-width:720px\)/);
  assert.match(client, /@media\(min-width:721px\) and \(max-width:1024px\)/);
  assert.match(client, /prefers-reduced-motion:reduce/);
  assert.match(client, /:focus-visible/);
  assert.match(page, /width:min\(1120px/);
});
