/**
 * Headless visual check for the agent block with a mocked backend: the two
 * DSS endpoints the block needs are served from a local session recording,
 * so no docker stack is required. Temporary debug tooling — not shipped.
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const RECORDING =
  process.argv[2] ??
  `${process.env.HOME}/.agent_runtime_sessions/0c5f554e-2fb0-496e-98cf-6b9e37755f45.jsonl`;
const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0001';
const CHANNEL_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0002';
const URL = `http://localhost:3999/app/agent/${SESSION_ID}`;

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
const page = await browser.newPage({
  viewport: { width: 1280, height: 2000 },
});

await page.route(`**/dss/agent-sessions/${SESSION_ID}`, (route) =>
  route.fulfill({ json: session })
);
await page.route(`**/dss/agent-sessions/channel/${CHANNEL_ID}/log`, (route) =>
  route.fulfill({
    json: { agentSessionId: SESSION_ID, entries },
  })
);

page.on('pageerror', (err) => {
  console.log('[pageerror]', String(err).slice(0, 1000));
});
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('CONNECTION_REFUSED')) {
    console.log('[console.error]', msg.text().slice(0, 300));
  }
});

console.log('navigating to', URL, `(${entries.length} entries)`);
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20_000);

const scrollTo = Number(process.argv[3] ?? 0);
if (scrollTo > 0) {
  await page.evaluate((y) => {
    const scroller = document.querySelector(
      '[data-block-type="agent"] [class*="overflow"]'
    );
    for (const el of document.querySelectorAll('div')) {
      if (el.scrollHeight > el.clientHeight + 100) {
        el.scrollTop = y;
        break;
      }
    }
    void scroller;
  }, scrollTo);
  await page.waitForTimeout(2_000);
}

await page.screenshot({
  path: '/private/tmp/claude-501/-Users-eric-Code-macro/91f094aa-ce54-46ac-8cae-e6ec1f217a24/scratchpad/agent-block.png',
  fullPage: false,
});

const text = await page.evaluate(() => document.body.innerText.slice(0, 1500));
console.log('=== body text ===');
console.log(text);

await browser.close();
