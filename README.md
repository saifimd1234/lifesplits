# LifeSplits — mobile app

One stopwatch for your whole day. Tap **Lap** whenever you switch activities, label what you just did, and see how much of your waking time really goes to your goals — and when you'll actually reach them.

Expo SDK 58 · Expo Router · TypeScript · local-only storage (no account, no backend).

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). Everything used here ships in Expo Go, so no custom build is needed to try it.

Useful scripts:

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (expo config) |
| `npm run icons` | Re-render app icon / splash PNGs from `assets/brand/mark.mjs` (needs `npm i --no-save @resvg/resvg-js`) |
| `npx expo-doctor` | Dependency / config health check |

To explore the reviews without tracking for weeks: finish the intro with **Explore with sample data**, or use **Settings → Load sample data**.

## How the app is laid out

```
src/app/                Expo Router routes
  _layout.tsx           Root stack; Stack.Protected switches between onboarding and the app
  welcome.tsx           Welcome screen (first launch)
  intro.tsx             5-step guided intro
  (tabs)/               Native tabs: Today · Goals · Review
  lap/[id].tsx          Lap sheet (modal) — label, goal, note, energy, focus
  new-goal.tsx          New / edit goal (modal), ?id= to edit
  goal/[id].tsx         Goal detail — plan vs reality, weekly hours, sources
  settings.tsx          Replay intro, sample data, erase data
src/store/app-store.ts  Zustand store persisted to expo-sqlite kv-store
src/lib/stats.ts        All time analytics (allocation, reality ratio, projections, drill buckets)
src/lib/time.ts         Date ranges and formatting
src/components/         UI kit, icon set, logo, goal card, day view
assets/brand/           Icon source (SVG generator) and rendered SVGs
```

## Core ideas in the code

- **Timestamps, not tickers.** A lap stores `startedAt`/`endedAt`; elapsed time is always derived, so the clock survives the app being killed or the phone restarting.
- **Waking time = time the clock ran.** Allocation % = goal lap time ÷ tracked session time in the period.
- **Reality ratio** = actual allocation (last 7 days) ÷ target allocation. **Projected finish** = remaining effort ÷ average goal time per day since the goal started.
- **Goals in color, life in neutrals** (`src/constants/theme.ts`).

## Not built yet

Testing, sign-in/sync, Health (sleep) import, widgets / Live Activities, watch apps — see `../PRODUCT_BRIEF.md` for the roadmap.
