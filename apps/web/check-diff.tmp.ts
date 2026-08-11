/** Expand an Edit tool card and screenshot the Pierre diff. Temp debug tooling. */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const RECORDING = `${process.env.HOME}/.agent_runtime_sessions/0c5f554e-2fb0-496e-98cf-6b9e37755f45.jsonl`;
const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0001';
const CHANNEL_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0002';

const entries = readFileSync(RECORDING, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const { direction, content } = JSON.parse(line);
    return { direction, content };
  });

const session = {
  id: SESSION_ID,
  channelId: CHANNEL_ID,
  botId: '00000000-0000-0000-0000-00000000a9e7',
  model: 'claude-opus-5',
  harness: 'claude-code',
  repoUrl: 'https://github.com/macro/cloud-storage',
  status: { kind: 'event', event: 'acp_ready' },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
await page.route(`**/dss/agent-sessions/${SESSION_ID}`, (route) =>
  route.fulfill({ json: session })
);
await page.route(`**/dss/agent-sessions/channel/${CHANNEL_ID}/log`, (route) =>
  route.fulfill({ json: { agentSessionId: SESSION_ID, entries } })
);
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 500)));

await page.goto(`http://localhost:3999/app/agent/${SESSION_ID}`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForTimeout(20_000);

// Find an expandable Edit card (trigger row whose title is an edit label with a diff badge).
const triggers = page.locator('button.group');
const count = await triggers.count();
console.log('expandable cards:', count);
let clicked = false;
for (let i = 0; i < count; i++) {
  const text = (await triggers.nth(i).innerText()).replace(/\n/g, ' ');
  if (/edit|write/i.test(text)) {
    console.log('clicking:', text.slice(0, 120));
    await triggers.nth(i).scrollIntoViewIfNeeded();
    await triggers.nth(i).click();
    clicked = true;
    break;
  }
}
if (!clicked) console.log('no edit card found — listing first 10 triggers:');
if (!clicked)
  for (let i = 0; i < Math.min(10, count); i++)
    console.log(' -', (await triggers.nth(i).innerText()).replace(/\n/g, ' ').slice(0, 100));

await page.waitForTimeout(6_000); // let pierre highlight
await page.screenshot({
  path: '/private/tmp/claude-501/-Users-eric-Code-macro/91f094aa-ce54-46ac-8cae-e6ec1f217a24/scratchpad/agent-diff.png',
});
await browser.close();
