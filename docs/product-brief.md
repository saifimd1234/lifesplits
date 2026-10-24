# Product Brief — Lap-Based Goal Reality Tracker

> Working name: **LifeSplits** (Lapwise is taken — see naming section). Status: UI designed. Date: 2026-10-24.

## 1. The core insight

People set goals in **calendar time** ("get in shape in 2 months") but goals are actually achieved in
**invested time** (the hours really spent on them). The gap between the two is invisible today.

This app makes that gap visible:

> "You gave *Physique* 60 days. You actually invested **38 h** in that period — **9%** of your waking time,
> against your **25%** target. At this pace the goal needs **~140 days**, not 60."

The capture method comes from a simple, proven habit: **one stopwatch that never stops, with a lap at every
task switch.** Because the clock never stops, the whole day is accounted for — no gaps, unlike start/stop
trackers (Toggl, Clockify) where untracked time simply disappears.

## 2. How it works (user's mental model)

1. **Start the day's clock** (a *Session*). It runs until you end it — typically wake → sleep.
2. **Tap "Lap" whenever you switch** activity. The lap that just ended gets:
   - a **category** (one tap from your recent list — e.g. Workout, Meal prep, Work, Chores, Scroll, Commute)
   - optionally a **goal link** (Physique, Learn Spanish, …)
   - optionally a **note** and quick ratings: **energy** (1–5), **focus** (1–5), **mood** (emoji)
3. **Goals** hold the targets:
   - target date (calendar time) — "2 months"
   - target **share of waking time** — "25%" (or hours/week)
   - optional **effort estimate** — "I think this takes ~150 hours"
4. **Weekly review** compares plan vs reality and re-projects every goal's realistic finish date.

## 3. Feature set

### MVP (ship first — phone only, offline)
- Persistent stopwatch session that survives app kill / phone restart (stores start timestamps, not a ticking counter)
- One-tap Lap with category quick-pick, goal link, note, energy/focus/mood
- Ongoing notification (Android) / Live Activity + Lock-screen widget (iOS) with a **Lap** button
- Edit/split/merge laps after the fact (people forget — forgiveness is essential)
- Goals with target date + target % (or hours/week)
- **Dashboard**: today's timeline (stacked bar), per-goal progress ring "actual % vs target %"
- **Weekly review**: target vs actual per goal and per category, "reality ratio", projected finish date
- **Drill-down / drill-up**: Year → Month → Week → Day → Session → Lap, and Goal → Category → individual laps
- CSV / JSON export, local backup

### v1.1
- Health data import: **sleep**, steps, resting heart rate (Apple HealthKit / Android Health Connect)
- Correlations: "On nights you slept < 6 h, next-day Physique time dropped 41%"
- Daily check-in (how do you feel?) to pair subjective state with time data
- Home-screen widgets, streaks, reminders ("You've been on *Scroll* for 50 min")

### v2
- **Smartwatch apps** (watchOS, Wear OS): big Lap button, complication showing current lap, haptic nudges
- Cloud sync + multi-device, account
- AI weekly summary & suggestions ("move workout to mornings — your focus score is 1.4× higher")
- Goal templates (physique, exam prep, learn an instrument) with typical effort-hour estimates
- Share/accountability with a friend or coach

## 4. The analytics that make it different

| Metric | Definition | Why it matters |
|---|---|---|
| **Invested time** | Σ lap durations linked to a goal | The real input to the goal |
| **Allocation %** | Invested time ÷ waking time in period | Compared to the user's target % |
| **Reality ratio** | Actual allocation ÷ target allocation | 1.0 = on plan; 0.4 = you're giving it 40% of what you promised |
| **Projected finish** | Remaining effort hours ÷ recent hours-per-day | Honest replacement for the "2 months" guess |
| **Life overhead** | Time on sleep, chores, commute, work, etc. | Shows *why* the goal got less — not just that it did |
| **Task estimate accuracy** | How long recurring tasks really take (breakfast = 20 min avg) | The original stopwatch insight; helps plan days |
| **Quality-weighted time** | Hours × focus rating | 2 focused hours ≠ 2 distracted hours |

Denominator decision: **waking time** (session length, or 24 h − sleep once health data is connected),
not 24 h — otherwise every percentage looks tiny and demotivating.

## 5. Competitive landscape (research, Oct 2026)

| App | What it does | Gap vs this idea |
|---|---|---|
| Lapstat, Stopwatch with Notes, Stopwatch Log, Kronometer | Stopwatch with lap notes, basic lap stats / CSV | No goals, no targets, no life-level analysis |
| Toggl Track, Clockify, Rize, Timing | Work/project time tracking (manual or automatic) | Work-focused, start/stop gaps, no personal goal projection |
| **TimeAlign** | Plan time blocks, compare planned vs actual, "Alignment Score", weekly report ($7.99/mo) | Closest competitor. Calendar-block planning model, not continuous laps; health integrations only "planned" |
| Founder Time OS, GitScrum goals, RescueTime goals | Weekly hour targets per area, % of target reached | Niche (founders / devs / screen time), no lap capture |
| Exist.io, Bearable | Correlate mood, sleep, habits with wearable data | No time tracking of activities, no goal projection |

**Conclusion:** the pieces exist separately — lap stopwatches, planned-vs-actual, health correlations — but
nobody combines **continuous lap capture + goal targets + realistic finish projection + sleep/mood context**.
That combination is the positioning. TimeAlign is the one to watch.

## 6. Biggest risks & mitigations

1. **Logging fatigue** (the #1 killer of manual trackers) → lap must be ≤ 2 taps; recent-category
   prediction; lock-screen/notification/watch Lap button; edit later; never punish missed laps.
2. **Forgot to lap for 3 hours** → "Split this lap" editor with a timeline scrubber.
3. **Timer reliability** → never rely on a running JS timer; persist timestamps, derive elapsed time.
4. **Privacy** → local-first by default; health data never leaves the device in MVP.
5. **Origin story** → the method is great; marketing should frame it around goals and self-knowledge.

## 7. Recommended tech stack (fastest path to shipping both phones)

- **App:** React Native + **Expo** (TypeScript) — one codebase for iOS and Android, OTA updates, EAS Build for store submission
- **Storage:** SQLite (`expo-sqlite`) + Drizzle ORM, local-first
- **Charts:** Victory Native / react-native-skia
- **Health (v1.1):** HealthKit (iOS) and Health Connect (Android) via native modules (Expo config plugins)
- **Watch (v2):** native SwiftUI watchOS app + Kotlin Wear OS app, syncing with the phone (WatchConnectivity / Data Layer API)
- **Sync (v2):** Supabase or similar, added later without changing the local data model

### Core data model
```
Goal       { id, name, color, targetDate, targetPct | targetHoursPerWeek, effortEstimateHours, archived }
Category   { id, name, icon, color, defaultGoalId?, isLifeOverhead }
Session    { id, startedAt, endedAt? }
Lap        { id, sessionId, startedAt, endedAt, categoryId, goalId?, note?, energy?, focus?, mood? }
DailyStat  { date, sleepMinutes?, steps?, restingHr?, checkinMood?, source }
```

## 8. Name ideas

> Checked 2026-10-24: domain availability (registry lookup via Vercel), web/App Store search, and a quick
> trademark web search. This is a **knockout check, not legal clearance** — run a USPTO / IP India search before filing.

| Name | .com | .app | Conflicts found | Verdict |
|---|---|---|---|---|
| **LifeSplits** ⭐ | ✅ free ($11.25/yr) | ✅ free ($9.99, renews $15) | None | **Recommended** |
| Goalap | ✅ free ($11.25/yr) | ✅ free ($9.99) | None (nearest: GOALMAP, US class 42) | Good backup; pronunciation is ambiguous |
| Lapstory | ✅ free | — | None | Nice, but says less about goals |
| Hoursplit | ✅ free | — | None | Descriptive, a bit plain |
| TrueLap | ❌ for sale $3,395 | ✅ free ($9.99) | None found | Only if you buy the .com |
| ~~Lapwise~~ | ❌ taken | ❌ taken | **Live app**: motorcycle lap-telemetry platform (Paceworks B.V.) on App Store + Google Play | Avoid — same software class, same "lap" space |
| ~~Lifelap, Honest Hours, Goalclock, Splits, Spent~~ | ❌ | mostly ❌ | — | Domains gone |

### Launch costs (first year)
| Item | Cost |
|---|---|
| lifesplits.com + lifesplits.app | ~$21 first year, ~$26/yr after |
| Trademark — India (TM-A, individual/startup/MSME, e-filing) | ₹4,500 per class (class 9 = app; add class 42 for SaaS → ₹9,000) + optional attorney ₹5k–15k |
| Trademark — USA (USPTO base application) | $350 per class (+ surcharges if you write a free-form description) |
| Apple Developer Program | $99 / year |
| Google Play developer account | $25 one-time |

Tagline candidates: *"See what your goals really cost in time."* · *"Lap your life."* · *"Plans meet reality."*

## 9. Next steps

1. Pick name + platform priority (both phones via Expo recommended)
2. UI design: Stopwatch/Lap screen, Lap sheet, Goals, Dashboard, Weekly Review, Drill-down
3. Build MVP (Section 3), dogfood for 2 weeks, then store submission
