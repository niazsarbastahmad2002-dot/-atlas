import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("live clinic and Atlas AI preserve dynamic identity and conversation text", () => {
  const flow = read("app/dashboard/live-clinic-flow.tsx");
  const ai = read("app/dashboard/assistant/atlas-ai-client-v4.tsx");

  assert.ok(flow.includes('data-atlas-user-content="true">{flow.doctorName}'));
  assert.ok(flow.includes('data-atlas-user-content="true">{signal.patientName}'));
  assert.ok(ai.includes('className="atlas-ai-clinic" data-atlas-user-content="true">{clinicName}'));
  assert.ok(ai.includes('<p data-atlas-user-content="true">{message.content}</p>'));
  assert.ok(ai.includes('<div data-atlas-user-content="true"><RichMessage text={message.content}/></div>'));
  assert.ok(ai.includes('className="atlas-ai-live-transcript" data-atlas-user-content="true"'));
});
