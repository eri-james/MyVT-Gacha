---
Task ID: 1
Agent: main
Task: Fix Studio navigation crash — state_unsafe_mutation errors + broken BottomNav tabs

Work Log:
- Investigated codebase: 4 route files (home, gacha, studio, +layout), 5 store files, logic/utils
- Identified root causes: (1) 3 BottomNav tabs link to non-existent routes (blank pages), (2) ~33 direct gameStore.state mutations from outside the state owner causing Svelte 5 state_unsafe_mutation crashes
- Added 18 safe mutation methods to GameStore in game.ts
- Rewrote studio/+page.svelte: ~20 mutations replaced with safe methods, removed unused imports, fixed trending stat
- Rewrote gacha/+page.svelte: ~13 mutations replaced with safe methods, moved initChars to onMount
- Removed 3 broken BottomNav tabs (collection, toss, settings)
- Fixed homepage Quick Action buttons to navigate via goto()
- Build verified: 0 errors, only pre-existing a11y warnings

Stage Summary:
- Commit 304a48c: fix(crash): resolve state_unsafe_mutation errors + broken nav tabs
- 5 files changed, 816 insertions, 758 deletions
- Pushed to main branch

---
Task ID: 2
Agent: main
Task: Investigate persistent state_unsafe_mutation error after fix deployment

Work Log:
- User reported error still occurs after commit 304a48c was pushed
- Compared deployed chunk hashes (9.zLinDJlw.js) vs local build (BQ-G_x5k.js) — mismatch confirmed
- Verified ALL rebuild/src files: zero remaining direct state mutations, all go through safe methods
- grep confirmed: no `.state.X =` or `.state.X +=` in .svelte files (outside state owner)
- Root cause identified: wrangler.jsonc pointed to "./" (project root with old vanilla JS), not rebuild/build
- Fixed wrangler.jsonc: "directory": "./" → "./rebuild/build"
- Rebuilt SvelteKit app: 0 errors (only pre-existing a11y warnings)
- Pushed commit 77cf3dd to trigger Cloudflare Pages rebuild

Stage Summary:
- The code fix in 304a48c was CORRECT — no remaining unsafe mutations
- The deployment was serving a stale build (different chunk hashes)
- Commit 77cf3dd: fix(deploy): point wrangler assets to rebuild/build output directory
- Pushed to main; user needs to wait for Cloudflare Pages rebuild + hard refresh

---
Task ID: 3
Agent: main
Task: Fix Studio page showing "Loading error" — SPA routing 404

Work Log:
- User reported Studio page shows "Loading error" after deployment
- Investigated: all source code verified clean, no state_unsafe_mutation issues
- Checked build output: adapter-static generates single index.html, no /studio/ or /gacha/ directories
- Root cause: Cloudflare Workers static assets has NO SPA fallback — requests to /studio return 404
- wrangler.jsonc valid html_handling options: auto-trailing-slash, force-trailing-slash, drop-trailing-slash, none — none provides SPA routing
- Fix: created _worker.js in rebuild/static/ (copied to build/) with SPA fallback logic
- _worker.js intercepts all requests, tries static asset lookup first, falls back to /index.html for client-side SvelteKit routing
- Verified _worker.js appears in build output after npm run build

Stage Summary:
- Commit 32494b7: fix(spa): add _worker.js for Cloudflare Workers SPA routing
- This fixes both /studio and /gacha showing errors when navigating directly

---
Task ID: code-review-may-2026
Agent: code-reviewer
Task: Full codebase review of rebuild/src/

Work Log:
- Read and analyzed all 29 source files across rebuild/src/ (types, stores, logic, utils, data, routes, components)
- Read build config: svelte.config.js, package.json, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js
- Analyzed module dependencies, data flows, and cross-module coupling
- Identified bugs, code smells, unused code, type mismatches, and architectural issues

Stage Summary:
- Full report written below
- 0 build-breaking issues found, but 12+ code quality issues catalogued

---

## COMPREHENSIVE CODEBASE REVIEW

### 1. BUILD CONFIGURATION

**svelte.config.js** (22 lines)
- Svelte 5 with runes mode enabled for all non-node_modules files
- adapter-static with SPA fallback (index.html)
- Path alias: `$components` → `src/components`
- No prerendering configured (pure SPA)

**package.json** (35 lines)
- Svelte 5.55.2, SvelteKit 2.57, Vite 8.0.7, TypeScript 6.0.2
- Tailwind CSS 3.4.19 (note: v3, not v4 despite `@tailwindcss/vite` v4.3 devDep)
- Dependencies: `gsap` (unused), `howler` (unused), `idb-keyval` (used for IndexedDB)
- Unused devDependencies: `@playwright/test`, `@sveltejs/adapter-auto`, `autoprefixer`, `postcss`, `vitest`

**vite.config.ts** (6 lines)
- Minimal config, just sveltekit plugin

**tsconfig.json** (20 lines)
- Extends generated .svelte-kit/tsconfig.json
- strict mode enabled, bundler module resolution
- Standard settings, no issues

**tailwind.config.js** (60 lines)
- MyVT brand colors (primary palette, rarity colors, surface glass effects)
- Custom animations: pulse-slow, fade-in, slide-up
- PostCSS config uses deprecated tailwindcss plugin (v3 style)

### 2. FILE TREE WITH PURPOSES AND LINE COUNTS

```
rebuild/src/
├── app.css                    (170) - Global CSS: dark theme, glass morphism, rarity colors, animations
├── app.d.ts                   (13)  - SvelteKit type declarations (empty)
├── app.html                   (19)  - HTML shell with Inter font, viewport-fit, theme-color
│
├── components/
│   ├── CharacterCard.svelte   (142) - Reusable VTuber card (compact/full modes, rarity styling)
│   └── layout/
│       ├── BottomNav.svelte   (92)  - Fixed bottom tab bar (Home, Gacha, Studio)
│       ├── ResourceBar.svelte (46)  - Top resource bar (VGems, VRinggit, Tickets, LiveCache)
│       └── Toast.svelte       (22)  - Toast notification overlay
│
├── lib/
│   ├── index.ts               (1)   - Empty placeholder
│   ├── data/
│   │   ├── characters.ts      (74)  - Character data loader (lazy fetch from /data/characters.json)
│   │   └── constants.ts       (183) - All game constants (rates, costs, tiers, levels, etc.)
│   ├── logic/
│   │   ├── economy.ts         (124) - Producer leveling, bond system, daily login, stamina recovery
│   │   ├── gacha.ts           (174) - Pull mechanics, pity, echo/dupe handling, cost logic
│   │   ├── quests.ts          (108) - Quest definitions, ISO week tracking, progress/reset logic
│   │   └── studio.ts          (241) - Station content quality, offline earnings, VTuber stamina recovery
│   ├── stores/
│   │   ├── index.ts           (7)   - Barrel re-exports for all stores
│   │   ├── game.ts            (278) - ROOT STORE: GameState, save/load, safe mutation methods
│   │   ├── gacha.ts           (63)  - Gacha UI state (banner, reveal, summary)
│   │   ├── liveon.ts          (84)  - Live!ON run state (turns, PS, subscribers, coaches)
│   │   ├── studio.ts          (63)  - Studio UI state (modals: assign, offline, level-up)
│   │   └── ui.ts              (32)  - Navigation, modal, toast state
│   ├── types/
│   │   ├── game.ts            (313) - All game type definitions (enums, interfaces)
│   │   ├── index.ts           (36)  - Barrel re-exports
│   │   └── ui.ts              (6)   - ModalConfig interface
│   └── utils/
│       ├── format.ts          (48)  - Number/time formatting utilities
│       ├── rng.ts             (42)  - Seeded PRNG (mulberry32) - UNUSED
│       └── save.ts            (48)  - IndexedDB save/load + localStorage migration
│
└── routes/
    ├── +layout.svelte         (31)  - Root layout: init gameStore, ResourceBar, BottomNav, Toast
    ├── +page.svelte           (100) - Home page: stats overview, featured VTuber, quick actions
    ├── gacha/+page.svelte     (487) - Gacha page: banners, pity, pull logic, reveal/summary overlays
    └── studio/+page.svelte    (957) - Studio page: stations, content timer, offline earnings, assign modal

TOTAL: 3,825 lines of code (src/ only)
```

### 3. MODULE DEPENDENCY GRAPH

```
                        ┌──────────────┐
                        │  +layout     │
                        │  (init store)│
                        └──────┬───────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     ┌──────────┐      ┌──────────┐       ┌──────────┐
     │ +page    │      │ /gacha   │       │ /studio  │
     │ (home)   │      │          │       │          │
     └────┬─────┘      └────┬─────┘       └────┬─────┘
          │                  │                   │
          │           ┌──────┴──────┐     ┌──────┴──────┐
          │           │ gachaStore │     │ studioStore │
          │           └──────┬──────┘     └──────┬──────┘
          │                  │                   │
          ▼                  ▼                   ▼
   ┌──────────────────────────────────────────────────┐
   │                  gameStore                       │
   │              (singletons: all stores)            │
   └──────────────────────┬───────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
   ┌──────────┐   ┌──────────────┐  ┌──────────┐
   │logic/*   │   │data/constants│  │data/chars│
   │(pure)    │   │(constants)   │  │(fetch)   │
   └──────────┘   └──────────────┘  └──────────┘

   Store dependency flow:
   gameStore ← gachaStore (reads characters/currencies)
   gameStore ← studioStore (reads studio state)
   gameStore ← liveonStore  (independent, parallel)
   uiStore is fully independent

   Logic dependency flow:
   logic/gacha  → types, data/constants, data/characters (via selectCharacter)
   logic/studio → types, data/constants
   logic/economy→ types, data/constants
   logic/quests → types only
   utils/*      → no internal deps (standalone)
```

### 4. KEY DATA FLOWS

**Save/Load Flow:**
```
App Load → +layout.onMount → gameStore.init()
         → loadSave() [IndexedDB via idb-keyval]
         → migrateFromLocalStorage() [fallback from localStorage]
         → migrateState() [v1→v8 field additions]
         → 30s auto-save interval + beforeunload save
         → writeSave() [IndexedDB]
```

**Gacha Pull Flow:**
```
User clicks Pull → doSinglePull()/doMultiPull()
→ Snapshot pity/stats into locals
→ Calculate rates from pity (calculateRates)
→ Roll rarity (Math.random with cumulative)
→ Select character (selectCharacter with banner rate-up)
→ Deduct cost (deductPullCost → addTickets/addCurrency)
→ Handle result (handlePullResult → new char / echo / E6 overflow LiveCache)
→ Apply via gameStore safe methods
→ gachaStore.startPull(results) → reveal overlay → summary
```

**Studio Content Tick Flow (every 60s):**
```
setInterval (1s countdown) → contentTick()
→ Rotate trending stat if expired (2h rotation)
→ Recover stamina for all assigned VTubers
→ For each active station:
  → Check stamina > cost
  → getContentQuality() [stat-weighted score → quality tier]
  → Calculate reward (baseReward × quality × rarity × station × level + flat)
  → Deduct stamina, add currency, add studio EXP
  → Check level up → show notification
  → Add entry to contentLog
→ Trim contentLog to 20 entries
```

**Offline Earnings Flow:**
```
Studio page mount → checkOffline()
→ Calculate elapsed since lastOnline (cap at 12h)
→ Build charsForCalc with recovered stamina
→ calculateOfflineEarnings() [B-tier quality assumed, stamina-limited]
→ Show claim modal → claimOffline() → apply currencies + EXP
```

### 5. SYSTEM DESCRIPTIONS

#### Gacha System
- **Banners:** Standard (blue tickets) and Featured (red tickets, 75% rate-up on 2 characters)
- **Rates:** Base R=70%, SR=22%, SSR=7%, UR=1%
- **Pity:** Soft pity at 40 (SSR ramps up), 80 (UR ramps up), Hard pity at 90 (guaranteed SSR+ 50/50)
- **10-pull guarantee:** 10th pull forces SR+ if none appeared
- **Echo system:** 0-6 dupes add stats; E6 converts excess to LiveCache
- **Cost:** 1 ticket = 150 VGems; deficit covered by VGems
- **Featured:** Liliana Vampaia and Lunaris Urufi at 75% rate-up within their rarity

#### Studio System
- **Stations:** Stream Room (VGems), Creative Corner (VRinggit), Practice Hall (LiveCache), Lounge (VRinggit + LiveCache bonus)
- **Unlock progression:** Stream Room Lv1, Creative Lv3, Practice Lv5, Lounge Lv7
- **Station upgrade:** 5 levels, costs VRinggit (200→800→2500→8000)
- **Content quality:** Stat-weighted score → SS/S/A/B/C/D tiers with multipliers
- **Trending:** Random stat rotates every 2h, 1.5x multiplier if matches station
- **VTuber stamina:** Per-character stamina consumed per content cycle, recovers over time
- **Content tick:** Every 60 seconds while on Studio page
- **Offline earnings:** Capped at 12h, B-tier quality, stamina-limited
- **Studio EXP → Levels 1-10:** Unlocks stations and flat bonuses

#### Live!ON System (Store-only, no page yet)
- **Store:** LiveONStore tracks run state (turns, PS, subscribers, coaches, upgrades)
- **Constants defined:** Max 20 turns, 3 coach slots (streamer/performance/stage), PS cap 70
- **No page exists yet** — all logic is in the store and type definitions
- **Ending system:** good/neutral/bad based on subscriber target vs finale performance
- **Coach bonuses:** Based on matching stats (streamer→tc/ch, performance→ch/vc, stage→vc/mg)
- **Agency visit turns:** 5, 10, 15
- **Chaos upgrades:** subBoost + psPenalty tradeoffs
- **Comeback bonus:** +20% on finale turn

#### Economy System
- **Currencies:**
  - VGems: Premium currency (from gacha pulls, daily login, quests, superchat toss)
  - VRinggit: Station upgrade currency (from Creative Corner, Lounge)
  - Blue Tickets: Standard gacha pulls (from daily login, quests)
  - Red Tickets: Featured gacha pulls (from daily login, quests)
  - LiveCache: Character upgrade currency (from Practice Hall, E6 overflow, Lounge bonus)
  - Legacy (unused): stars, starDust, starFragments, bondPoints, gems
- **Producer Level:** EXP from various activities, caps at 30, rewards tickets at milestones
- **Bond System:** 8 levels per character, stat bonuses, "Odekake" (date) at bond 4+ with 12h cooldown
- **Daily Login:** Streak-based VGems (100-500) + tickets (1-3)
- **Stamina:** Global 180 max, recovers 1/4min; Per-VTuber stamina for studio use

#### Save/Load System
- **Primary storage:** IndexedDB via idb-keyval (key: 'myvt_gacha_save')
- **Fallback migration:** Checks localStorage for old saves, migrates to IndexedDB
- **Auto-save:** Every 30 seconds + page unload
- **Version:** Currently v8, migration fills missing fields with defaults
- **State migration:** Shallow merge with initial state, then null-check all optional fields

### 6. ISSUES FOUND

#### BUGS

**BUG-1: `beforeunload` listener never removed (game.ts:272)**
```typescript
window.removeEventListener('beforeunload', () => this.save());
```
This creates a NEW anonymous arrow function and tries to remove it — which does nothing. The original listener from line 108 (`() => this.save()`) remains because it's a different reference. This is a memory leak that worsens with HMR during development. **Fix:** Store the handler reference and remove the exact same function.

**BUG-2: Duplicate `onMount`/`onDestroy` imports in studio page (line 7, 468)**
The studio page imports `onMount` on line 7 and then imports `onMount, onDestroy` again on line 468. This won't cause a runtime error (duplicate imports are deduped by the bundler), but it's messy and indicates the file was assembled from multiple passes. **Fix:** Move `onDestroy` to the top import.

**BUG-3: `formatTimeAgo` imported but unused in studio page (line 13)**
The studio page imports `formatTimeAgo` from utils/format, and it IS used in the content log template (line ~878). This is NOT a bug — it's actually used. Retracted.

**BUG-4: `capMs` computed but unused in `checkOffline()` (studio page line 246)**
```typescript
const capMs = OFFLINE_EARNINGS_CAP_HOURS * 60 * 60 * 1000;
```
This variable is computed but never used — the cap is applied directly via `OFFLINE_EARNINGS_CAP_HOURS * 60` in the minutes calculation on line 250. Dead code.

**BUG-5: Quest `weekly_login3` double-increment on day change (quests.ts:49)**
In `resetQuestsIfNeeded`, when the daily date changes, the code checks `wasDate !== today` TWICE:
- Line 49: Inside the spread update, always increments `weekly_login3` (inside the spread where the condition is always true because we already know `wasDate !== today` from line 41)
- Line 54: Checks `wasDate !== today` again (always true at this point) and increments `daily_login`

The line 49 check is redundant but not harmful — it always evaluates to true because we only enter that branch when `updated.daily.date !== today`. However, the structure is confusing and the ternary on line 49 is always truthy. Not a real bug, but confusing code.

**BUG-6: `getContentQuality` trending check calls `getTrendingStat` which uses Math.random (studio.ts:93)**
`getTrendingStat()` in studio.ts line 54-60 will call `Math.random()` if the trending stat has expired. This makes the function impure — it should only READ the trending stat, not generate a new one. The generation should happen in the content tick before calling this. Currently `getContentQuality` is used in the studio page contentTick where trending is already persisted, so in practice the random path is rarely hit. But `calculateOfflineEarnings` also calls it, and in that case the trending stat from the persisted state may be expired, causing `getContentQuality` to silently re-randomize. **Fix:** Pass trending stat as a parameter or always ensure it's refreshed before calling.

**BUG-7: `handlePullResult` directly mutates `currencies.liveCache` (gacha.ts:119)**
```typescript
currencies.liveCache += lc;
```
This mutates the passed `currencies` object (which is `gameStore.currencies`) directly. While this goes through the proxied state object, it bypasses the safe `addCurrency` method. The caller in gacha/+page.svelte passes `gameStore.currencies` directly (line 105). **Fix:** Return the LiveCache amount and let the caller apply it via `addCurrency`.

**BUG-8: Quest progress `daily_pull_1` doesn't match any defined quest (gacha page line 118)**
```typescript
gameStore.setQuests(incrementQuestProgress(gameStore.state.quests, 'daily', 'daily_pull_1', 1));
```
The DAILY_QUESTS array in quests.ts has `daily_login`, `daily_assign`, `daily_toss`, `daily_liveon`, `daily_all` — but NO `daily_pull_1`. This progress is tracked but never claimable because there's no quest definition for it. **Fix:** Either add a `daily_pull` quest definition or remove the increment call.

#### CODE SMELLS

**SMELL-1: Unused `SeededRNG` class (utils/rng.ts)**
The entire 42-line `SeededRNG` class is never imported anywhere in the codebase. All randomness uses `Math.random()`. This was likely written in anticipation of deterministic gacha pulls but never integrated.

**SMELL-2: Unused dependencies `gsap` and `howler` (package.json)**
These libraries are declared as dependencies but never imported anywhere. `gsap` is presumably for pull animations, `howler` for audio — both planned but unimplemented.

**SMELL-3: Unused `CharacterCard` component**
The `CharacterCard.svelte` component is defined but never used in any route. It appears to be a pre-built component for the collection page (which doesn't exist yet).

**SMELL-4: `getMaxSlots` always returns 2 (studio.ts:41-43)**
```typescript
export function getMaxSlots(studioLevel: number): number {
    if (studioLevel >= 1) return 2;
    return 2;
}
```
Both branches return 2. This was likely intended to scale with studio level at some point.

**SMELL-5: `offlineResult`/`showOfflineModal` on StudioStore never used**
The `StudioStore` has `showOfflineModal` and `offlineResult` properties with `showOfflineEarnings()` and `closeOfflineEarnings()` methods, but the studio page manages its own offline modal state locally (`hasOffline`, `offlineData`). The store methods are dead code.

**SMELL-6: StudioStore `showAssignModal`/`assignStationId` never used**
Similarly, the StudioStore has assign modal state, but the studio page manages this locally. The store properties are dead code.

**SMELL-7: `CONTENT_INTERVAL` is 60 seconds but named as seconds**
The constant name suggests seconds (60), and it IS 60 seconds. But the variable name `CONTENT_INTERVAL` is ambiguous — could be clearer as `CONTENT_TICK_SECONDS`.

**SMELL-8: Massive `as any` casts in studio page**
Lines 147 and 368 use `as any` to merge `CharacterRecord` + `CharacterData` properties for the `getContentQuality` call. This is a type safety hole. The `getContentQuality` function expects `CharacterData` but is receiving a hybrid object. **Fix:** Adjust the function signature or create a proper adapter.

**SMELL-9: `ResourceName` function unused in studio page**
`getResourceName()` (studio page line 408) is defined but never called in the template.

**SMELL-10: `formatTimeRemaining` unused in format.ts**
The `formatTimeRemaining` function is never imported anywhere.

**SMELL-11: `lerp` and `clamp` unused in format.ts**
Both `lerp` and `clamp` are never imported anywhere.

**SMELL-12: `ChallengeInfo` and `MinigameState` types defined but not actively used in UI**
These types exist in game.ts for the Superchat Toss minigame, but the minigame page doesn't exist yet.

**SMELL-13: Tailwind v3 vs v4 inconsistency**
`tailwind.config.js` is v3 format, `postcss.config.js` references `tailwindcss` plugin (v3 style), but `@tailwindcss/vite` v4.3 is installed as a devDependency. The actual CSS uses `@tailwind base/components/utilities` directives (v3). This could cause issues if Tailwind v4 plugins try to load.

#### TYPE ISSUES

**TYPE-1: `LiveONScenario.difficulty` is number but not bounded**
No validation that difficulty is a sensible range (0-100, etc.). The target formula `1100 + difficulty * 100` could produce extreme values.

**TYPE-2: `QuestProgress.date` vs `QuestProgress.weekId` mismatch**
The `QuestState` type (game.ts:268) defines `daily: QuestProgress` (with `date: string`) and `weekly: QuestProgress` (which has `weekId` via the same interface). But `QuestProgress` only has `date`, not `weekId`. Looking at the initial state creation (game.ts:58), the weekly object has `weekId: ''` — this is a type mismatch. The `QuestProgress` interface should either be generic or the weekly should have its own interface.

Actually, examining closer: The `QuestProgress` interface only has `date`, `progress`, `claimed`. But in `createInitialState()`, the weekly object uses `weekId` instead of `date`. And in `resetQuestsIfNeeded()`, it accesses `updated.weekly.weekId`. This IS a type issue — `weekId` is not part of `QuestProgress`. TypeScript should catch this. It probably doesn't because the state is created as a plain object and the type is only checked at assignment. **This is a latent type error that could cause runtime issues if the weekly reset logic breaks.**

**TYPE-3: `Currencies.myTicket` type doesn't enforce `number`**
`myTicket: { blue: number; red: number }` — the inner properties are plain numbers, not reactive. But `addCurrency` (game.ts:144) only handles `number` types and skips `myTicket` (line 148-149). This means `addCurrency('myTicket', ...)` silently does nothing. The code correctly uses `addTickets()` instead, but the type design is misleading.

### 7. ARCHITECTURE ASSESSMENT

#### Strengths
1. **Clean separation of concerns:** types → data/constants → logic (pure functions) → stores → routes/components
2. **Pure logic functions:** gacha.ts, studio.ts, economy.ts, quests.ts are all stateless and unit-testable
3. **Svelte 5 runes:** Proper use of `$state`, `$derived`, `$derived.by` throughout
4. **Safe mutation pattern:** GameStore wraps all state mutations in explicit methods, avoiding Svelte 5 state_unsafe_mutation errors
5. **Singleton stores:** Simple and effective for a single-player game
6. **TypeScript strict mode:** All type definitions are comprehensive
7. **Constants centralization:** All game balance values in one file

#### Weaknesses
1. **Missing pages:** Collection, Live!ON, Superchat Toss, Quests, Settings — all have store/type/constant scaffolding but no UI
2. **Dead code:** ~200 lines of unused code (rng.ts, CharacterCard, StudioStore modal methods, unused utils)
3. **Studio page is monolithic:** 957 lines mixing business logic, UI state, and template
4. **No error boundaries:** No loading error states for character fetch failures
5. **No SSR/SEO:** Pure SPA, no meta tag management
6. **No testing:** vitest installed but no test files exist

### 8. RECOMMENDATIONS (Priority Order)

**P0 — Fix Bugs:**
1. Fix `beforeunload` listener leak in game.ts:272
2. Fix `weekly.weekId` type mismatch (add `weekId` to QuestProgress or create WeeklyQuestProgress)
3. Fix `handlePullResult` direct mutation of currencies.liveCache
4. Add `daily_pull` quest definition or remove orphaned quest increment

**P1 — Remove Dead Code:**
1. Remove `gsap` and `howler` from package.json dependencies
2. Remove unused utils: `rng.ts`, `formatTimeRemaining`, `lerp`, `clamp`
3. Remove unused StudioStore modal properties or use them consistently
4. Remove unused `capMs` variable in studio page

**P2 — Improve Type Safety:**
1. Fix `as any` casts in studio page contentTick
2. Add validation for LiveONScenario.difficulty range
3. Clean up duplicate imports in studio page

**P3 — Architectural:**
1. Split studio/+page.svelte (957 lines) into smaller composables
2. Create an API layer to abstract gameStore calls from pages
3. Add unit tests for pure logic functions (gacha, studio, quests, economy)
4. Implement remaining pages (collection, liveon, quests, toss, settings)
