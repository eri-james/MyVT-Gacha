# MyVT Gacha Collection

A browser-based gacha collection game featuring **319 Malaysian VTubers**. Collect, build your studio, and idle your way to greatness!

**Live:** [https://eri-james.github.io/MyVT-Gacha/](https://eri-james.github.io/MyVT-Gacha/)

## Features

- **Gacha Pulls** — Standard and Featured banners with SSR/SR/Normal rarity
- **Collection Gallery** — Filter, sort, and track all 319 characters
- **Studio System** — Assign characters to stations, earn idle resources, level up
- **Super Chat Toss** — Tap-based minigame with boost meter and Super Chat Mode
- **Stamina System** — 200 max, recovers 1 point every 4 minutes
- **Daily Login** — Streak-based rewards
- **Offline Earnings** — Progress while away (up to 12 hours)
- **Save/Export/Import** — Local save with exportable save codes

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (no frameworks)
- GitHub Pages deployment
- LocalStorage for save data

## File Structure

```
index.html          — Main page
css/style.css       — All styles
js/data.js          — Character data loader
js/game.js          — Core state, save/load, tick loop
js/gacha.js         — Pull logic, rates, pity
js/characters.js    — Leveling, ascension, shards
js/minigame.js      — Super Chat Toss engine
js/ui.js            — UI rendering, navigation, events
data/characters.json — VTuber roster (319 entries)
```

## License

This is a fan project for educational purposes.
