# MyVT Gacha Collection

A browser-based gacha collection idle game featuring **319 Malaysian VTubers** from **38 agencies**. Pull characters, build your studio, assign VTubers to work stations, bond with your favourites, and idle your way to a complete collection!

**Live:** [https://eri-james.github.io/MyVT-Gacha/](https://eri-james.github.io/MyVT-Gacha/)

---

## Features

### Gacha Pull System
- **4 Rarity Tiers** — UR (1%), SSR (7%), SR (22%), R (70%)
- **Standard & Featured Banners** — Rotating featured banners with rate-up characters
- **Pity System** — Hard pity at 90 pulls guarantees SSR+. 10-pull guarantees at least SR+
- **Pull Animations** — Sequential card reveal with 3D flip, rarity glow effects, and dramatic ordering (R first, UR last)
- **Pull History** — Log of all past pulls with timestamps

### VTuber Roster & Collection
- **319 Malaysian VTubers** across 38 agencies with self-hosted portraits
- **Collection Gallery** — Browse, filter, and sort by name, rarity, agency, station assignment, and ownership status
- **Oshi System** — Mark your favourite VTubers and filter them in the gallery
- **Collection Milestones** — Bonus rewards at 10, 25, 50, 100, 150, 200, 250, 300, and 319 unique VTubers collected
- **Duplicate Handling** — Extra copies beyond E6 are converted into bonus LiveCache

### Character Progression
- **6 Stats** — Stamina (ST), Passion (PS), Technical (TC), Charisma (CH), Vocal (VC), Management (MG)
- **Leveling** — Spend resources to level up characters (max Lv 50)
- **Bond System** — Increase bond levels with your VTubers; higher bond = stat bonuses applied to that VTuber's own stats
- **E6 Limit Break** — 6 duplicate copies to fully limit break a character

### Studio & Idle System
- **4 Work Stations** — Each produces different resources; unlock more as your Studio levels up
- **Idle Income** — Assigned characters generate resources every second while the tab is open
- **Offline Earnings** — Claim up to 12 hours of missed income when you return
- **Studio Leveling** — Earn Studio EXP from active stations with unlocks at each level
- **Trending Bonus** — Active trending boosts for station output
- **Content Quality Tiers** — Content quality ranges from Tier D to Tier S based on assigned VTuber stats

### Minigame: Super Chat Toss
- **30-Second Rounds** — Tap falling super chat bubbles to earn LiveCache. Avoid red landmines!
- **5 Bubble Types** — Coin (+10), Premium (+25), Gem (+50), Landmine (penalty), Gift (+3 seconds)
- **Boost Meter** — Fill to 100% to trigger SUPER CHAT MODE for double points and golden bubbles
- **Character Lead Bonus** — Pick an owned character as your lead; higher rarity = better score multipliers
- **Stamina System** — 15 stamina per round, 200 max, recovers 1 per 4 minutes

### Producer System
- **Producer Level** — EXP from gameplay activities, cap starts at 10 and grows +20% per level (max Lv 30)
- **Milestone Rewards** — Blue tickets awarded at Lv 10, 15, 20, 25, and 30
- **Producer Profile** — Custom username and level displayed in the top bar

### Economy — 5 Currencies
| Currency | Use |
|----------|-----|
| **VGems** | Premium pull currency (150 per single pull, 1500 per 10-pull) |
| **Blue MyTicket** | Standard banner pulls (1 ticket = 1 pull, 10 = 10-pull) |
| **Red MyTicket** | Featured banner pulls (1 ticket = 1 pull, 10 = 10-pull) |
| **LiveCache** | Secondary currency for upgrades |
| **VRinggit** | Upgrades and Shop purchases |

### UI / UX
- **Pastel Theme** — Soft, clean design with rounded cards and smooth animations
- **Bottom Navigation** — Quick access to VTubers, Shop, Quests, Home, Friends, Minigame, and Settings
- **Landing Page** — Featured VTuber showcase, game mode panels, and banner display
- **Mobile Responsive** — Fully functional on mobile and desktop browsers

### Save System
- **Auto-Save** — Game state saves to localStorage every 30 seconds
- **Manual Save** — Save button in Settings
- **Export/Import** — Base64 save codes for backup and device transfer
- **State Migration** — Automatic version-based migration when new fields are added

---

## Current State

### What's Live
- Full gacha pull system with banners, pity, and animations
- VTuber collection gallery with filters, search, and sort
- Studio with 4 work stations, idle income, and offline earnings
- Super Chat Toss minigame with stamina, boost meter, and lead character
- Producer level system with EXP and milestone rewards
- Bond system with per-stat bonuses
- Featured VTuber showcase on landing page
- Pastel UI overhaul with bottom navigation
- Auto-save with export/import

### Coming Soon
- **Live!ON** — Stream simulation game mode
- **Shop** — Currency exchange and item purchases
- **Quests** — Daily and weekly tasks with rewards
- **Friends** — Social features (coming in a future update)
- **Odekake** — Exploration/going-out feature
- **Cloud Save** — Firebase Auth + Firestore for cross-device sync

---

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — no frameworks or build tools
- **Deployment:** GitHub Pages (static site, auto-deployed via GitHub Actions)
- **Data:** localStorage for save data, JSON file for character roster
- **Portraits:** Self-hosted in `data/portraits/` (~300 images)

---

## File Structure

```
index.html              — Main page (all HTML in one file)
css/style.css           — All styles (pastel theme, responsive)
js/data.js              — Character data loader (fetches characters.json)
js/game.js              — Core state, save/load, tick loop, offline earnings, producer level
js/gacha.js             — Pull logic, rates, pity system, featured banners
js/characters.js        — Leveling, ascension, shards, character display data
js/minigame.js          — Super Chat Toss game engine
js/ui.js                — UI rendering, navigation, events, animations
data/characters.json    — VTuber roster (319 entries)
data/portraits/         — VTuber portrait images
```

---

## Disclaimer

All VTuber character data (names, portraits, agency affiliations) displayed in this game are sourced from [hololist.net](https://hololist.net/), a public directory of Virtual YouTubers.

**This is a fan-made project for educational and entertainment purposes only. No copyright infringement is intended.**

### For VTubers
If you are a VTuber listed in this game and would like to be:
- **Removed** from the roster
- **Updated** (name, agency, portrait)
- **Added** to the roster

Please message **Wiwi** on Discord: <@173470725812912140>
