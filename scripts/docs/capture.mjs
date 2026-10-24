// Drives the LifeSplits web build in headless Chrome and saves raw screenshots.
// Needs `npx expo start --web` running on :8081 and `npm i --no-save puppeteer-core`.
// usage: node scripts/docs/capture.mjs <outDir>   (CHROME_PATH overrides the browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? 'docs/.raw';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8081';
const KEY = 'lifesplits-store';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

async function viewport(height = 844) {
  await page.setViewport({ width: 390, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
}
async function shot(name, settle = 700) {
  await sleep(settle);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}
/** Clicks the last visible element whose own text is exactly `text` (modals render last). */
async function tap(text) {
  for (let i = 0; i < 40; i++) {
    const handle = await page.evaluateHandle((wanted) => {
      const els = [...document.querySelectorAll('div, span, a, button')].filter((el) => {
        if (el.textContent.trim() !== wanted) return false;
        if ([...el.children].some((c) => c.textContent.trim() === wanted)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      return els[els.length - 1] ?? null;
    }, text);
    const el = handle.asElement();
    if (el) {
      await el.click();
      await sleep(450);
      return;
    }
    await sleep(250);
  }
  throw new Error(`No visible element with text "${text}"`);
}
async function tapLabel(label) {
  await page.locator(`[aria-label="${label}"]`).setTimeout(8000).click();
  await sleep(450);
}
async function go(path, height = 844) {
  await viewport(height);
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await sleep(900);
}
async function scheme(value) {
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value }]);
}

await scheme('light');
await go('/');
await page.evaluate(() => localStorage.clear());
await go('/');
await shot('welcome');

await tap('Get started');
await shot('intro-1');
await tap('Next');
await shot('intro-2', 900);
await tap('Next');
await shot('intro-3', 900);
await tap('Next');
await shot('intro-4', 900);
await tap('Next');
await shot('intro-5', 900);
await tap('Explore with sample data');
await sleep(800);
await shot('today-start-tip');

// Put a realistic running day into storage: six laps today, the sixth still running.
await page.evaluate((key) => {
  const raw = JSON.parse(localStorage.getItem(key));
  const s = raw.state;
  const cat = (name) => s.categories.find((c) => c.name === name);
  const id = () => Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  const M = 60000;
  const plan = [
    ['Getting ready', 22, ''],
    ['Breakfast', 20, 'Oats and eggs'],
    ['Chores', 25, 'Kitchen cleanup'],
    ['Spanish', 35, 'Duolingo + one podcast'],
    ['Scrolling', 18, ''],
  ];
  const total = plan.reduce((a, p) => a + p[1], 0) + 42;
  const session = { id: id(), startedAt: now - total * M - 18000, endedAt: null };
  let t = session.startedAt;
  const laps = plan.map(([name, mins, note]) => {
    const c = cat(name);
    const lap = { id: id(), sessionId: session.id, startedAt: t, endedAt: t + mins * M, categoryId: c.id, goalId: c.goalId, note, energy: null, focus: null };
    t += mins * M;
    return lap;
  });
  const workout = cat('Workout');
  laps.push({ id: id(), sessionId: session.id, startedAt: t, endedAt: null, categoryId: workout.id, goalId: workout.goalId, note: '', energy: null, focus: null });
  s.sessions.push(session);
  s.laps.push(...laps);
  s.seenTips = { today: true };
  localStorage.setItem(key, JSON.stringify(raw));
}, KEY);

await go('/', 844);
await shot('today-running', 1500);

await tapLabel('Lap. Close this activity and start the next');
await sleep(900);
await tap('Workout');
await page.locator('textarea').fill('Upper body + 15 min run');
await tapLabel('Energy 4');
await tapLabel('Focus 5');
await shot('lap-sheet');
await tap('Save lap');

await go('/goals', 1000);
await shot('goals-tip');
await tapLabel('Dismiss tip');
await shot('goals');

await tap('Physique');
await viewport(1500);
await shot('goal-detail', 1200);

await go('/new-goal', 1100);
await page.locator('input[aria-label="Goal name"]').fill('Learn guitar');
await tap('25%');
await shot('new-goal');

await go('/review', 1250);
await shot('review-week-tip');
await tapLabel('Dismiss tip');
await shot('review-week');
await tap('Month');
await shot('review-month');
await tap('Year');
await shot('review-year');
await tap('Week');
await sleep(300);
// Drill into Thursday of this week.
const days = await page.$$('[aria-label*="on goals"]');
if (days[3]) await days[3].click();
await viewport(1400);
await shot('review-day', 1200);

await go('/settings', 844);
await shot('settings');

await scheme('dark');
await go('/', 844);
await shot('dark-today', 1500);
await go('/goals', 1000);
await shot('dark-goals');
await go('/review', 1250);
await shot('dark-review');
await go('/welcome', 844);

await browser.close();
