# MyVT Gacha Collection

A browser-based gacha collection idle game featuring **319 Malaysian VTubers**. Pull characters, build your studio, assign VTubers to work stations, and idle your way to a complete collection!

**Live:** [https://eri-james.github.io/MyVT-Gacha/](https://eri-james.github.io/MyVT-Gacha/)

---

## Features

### Core Gameplay
- **Gacha Pull System** — Standard and Featured banners with SSR (3%), SR (15%), and Normal (82%) rarity tiers. Hard pity at 50 pulls guarantees an SSR.
- **Collection Gallery** — Browse, filter, and sort all 319 characters by name, variant, agency, station assignment, and ownership status. Paginated at 40 per page.
- **Character Progression** — Level up characters using Star Dust and Stars. Ascend from Normal to SR (Lv 20 cap) and SR to SSR (Lv 35 cap, max Lv 50). Convert duplicate shards into resources.

### Studio & Idle System
- **4 Work Stations** — Stream Room (Stars), Creative Corner (Star Dust), Practice Hall (Star Fragments), Lounge (Bond Points). Unlock more as your Studio levels up.
- **Idle Income** — Assigned characters generate resources every second, even while the tab is open. Station upgrades (Lv 1-5) multiply output.
- **Offline Earnings** — Progress continues while you're away! Claim up to 12 hours of missed income when you return.
- **Studio Leveling** — Earn Studio EXP from active stations. 10 levels with unlocks at each stage (new stations, slots, and features).

### Minigame: Super Chat Toss
- **30-Second Rounds** — Tap falling super chat bubbles to earn Stars. Avoid red landmines!
- **5 Bubble Types** — Coin (+10 Stars), Premium (+25), Gem (+50), Landmine (penalty), and Gift (+3 seconds).
- **Boost Meter** — Fill to 100% to trigger SUPER CHAT MODE for double points and golden bubbles.
- **Character Lead Bonus** — Pick an owned character as your lead. Higher rarity = better score multipliers.
- **Stamina Cost** — 15 stamina per round. 200 max stamina, recovers 1 point every 4 minutes.

### Economy & Progression
- **5 Currencies** — Stars (pull currency), Star Dust (leveling), Star Fragments (station upgrades + ascension), Bond Points (lounge output), Gems (minigame + milestones).
- **Daily Login Rewards** — Streak-based Star bonuses (Day 1: 100, up to Day 9+: 500/day).
- **Collection Milestones** — Earn bonus Stars for reaching ownership thresholds (10, 25, 50, 100, 150, 200, 250, 300, 319 unique VTubers).

### Pull Animations
- **Sequential Reveal** — Cards slide in and flip one by one with staggered timing.
- **3D Card Flip** — CSS `preserve-3d` transforms with face-down card backs and character face reveals.
- **Rarity Effects** — Golden glow rings for SSR, screen flash effects, and dramatic ordering (Normal first, SSR last).

### Save System
- **Auto-Save** — Game state saves to localStorage every 30 seconds.
- **Manual Save** — Save button available in Settings.
- **Export/Import** — Base64 save codes for backing up or transferring between devices.
- **State Migration** — Automatic version-based save migration when new fields are added.

---

## Development Progress

### Completed Sprints

| Sprint | Feature | Status |
|--------|---------|--------|
| Sprint 1 | Core game loop, gacha pulls, basic UI | Done |
| Sprint 2 | Collection gallery with filters | Done |
| Sprint 3 | Character detail modal, leveling, ascension | Done |
| Sprint 4 | Studio improvements — income dashboard, unlock roadmap, station icons | Done |
| Sprint 5 | Profile tab, pull history, achievements | Done |
| Sprint 6 | UI polish and responsive design | Done |
| Sprint 7 | Performance and save system improvements | Done |
| Sprint 8 | Super Chat Toss minigame, stamina system, pull animations | Done |

### Upcoming Sprints

| Sprint | Feature | Status |
|--------|---------|--------|
| Sprint 9 | Firebase Cloud Save (Auth + Firestore) | Planned |
| Sprint 10 | Code Quality and Security Audit | Planned |
| Sprint 11 | Odekake (Going Out) feature | Planned |
| Sprint 12 | Social Features | Planned |
| Sprint 13 | Content Updates and Balancing | Planned |

### Known Deferred Items
- **HP-03**: XSS sanitization for user-generated content
- **HP-05**: Replace deprecated DOM APIs
- **V4-08**: Auto-backup system
- **LP-01 through LP-05**: Various UI polish items

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) — no frameworks or build tools
- **Deployment**: GitHub Pages (static site)
- **Data**: localStorage for save data, JSON file for character roster
- **Planned**: Firebase Auth + Firestore for cloud save (Sprint 9)

---

## File Structure

```
index.html              — Main page (all HTML in one file)
css/style.css           — All styles (dark theme, responsive)
js/data.js              — Character data loader (fetches characters.json)
js/game.js              — Core state, save/load, tick loop, offline earnings
js/gacha.js             — Pull logic, rates, pity system, featured banners
js/characters.js        — Leveling, ascension, shards, character display data
js/minigame.js          — Super Chat Toss game engine
js/ui.js                — UI rendering, navigation, events, animations
data/characters.json    — VTuber roster (319 entries, ~75KB)
```

---

## Data Source & Disclaimer

All VTuber character data (names, portraits, agency affiliations) displayed in this game are sourced from [hololist.net](https://hololist.net/), a public directory of Virtual YouTubers. Images are loaded directly from hololist.net's CDN.

**This is a fan-made project for educational and entertainment purposes only. No copyright infringement is intended.**

### For VTubers
If you are a VTuber listed in this game and would like to be:
- **Removed** from the roster
- **Updated** (name, agency, portrait)
- **Added** to the roster

Please contact the developer (**Wiwi**) on Discord. You can reach out through the GitHub repository issues or directly via Discord DM.

---

## License

This is a fan project. The game code is available for reference. VTuber names, images, and likenesses belong to their respective owners.
