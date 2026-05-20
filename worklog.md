---
Task ID: 1
Agent: Main Agent
Task: Fix critical bugs identified in code review (BUG-1, BUG-2, BUG-3) + push to overhaul

Work Log:
- Read and analyzed all project source files (game.js, gacha.js, ui.js, characters.js, index.html, data.js)
- Identified BUG-1: CONTENT_TYPES used uppercase stat keys (CH, TC, ST, PS) but characters.json uses lowercase
- Identified BUG-2: getTrendingStat() used uppercase trendableStats array, trending bonus never triggered
- Identified BUG-3: baseStats migration race condition when DataLoader not loaded during migrateState
- Applied fixes to game.js: changed CONTENT_TYPES to lowercase keys, fixed trending, added repairBaseStats()
- Applied fixes to ui.js: changed STAT_NAMES/STAT_COLORS to lowercase keys, added toUpperCase() for display
- Added repairBaseStats() call in UI.init() after DataLoader.load()
- Bumped cache buster from v=47 to v=48 in index.html
- Pushed to overhaul branch as commit ce450ea

Stage Summary:
- 3 critical bugs fixed in v=48
- Studio content quality system now works correctly (was always Tier D, now properly calculates based on character stats)
- Trending stat bonus now triggers (1.5x when trending matches station's primary/secondary stat)
- Characters with broken baseStats from migration race condition now auto-repaired on load
- UI display unchanged (station hints still show uppercase CH/VC/etc, trending banner shows uppercase)
- Commit: ce450ea on overhaul branch

---
Task ID: 1
Agent: main
Task: Landing page UI overhaul — fix ui.js + CSS for new HTML structure

Work Log:
- Analyzed all broken DOM references in ui.js (lines 58, 65, 70, 96, 106-107, 213-216, 226, 266, 302-316)
- Rewrote bindEvents() in ui.js: replaced `.nav-tab` with `.bnav-btn[data-page]`, removed `btn-settings`/`btn-daily-login`/`btn-copy-id` event handlers
- Added bottom navbar navigation with dead-link toasts for shop/quests/friends and modal for settings
- Added landing page panel button handlers (Live!ON, Studio, Gacha) and back button handlers (4 IDs)
- Added featured VTuber selection modal logic (open, populate grid, select, close)
- Added settings username save button handler
- Removed `setupResponsiveResources()` function (old mobile footer layout is gone)
- Removed `setupResponsiveResources()` call from init()
- Updated switchTab() to use `.bnav-btn[data-page]` for active state toggling
- Updated updateUI() to remove dead references (stat-collection, stat-high-rarity, stat-studio-lv, stat-pulls, player-id, btn-daily-login)
- Added `renderTopBarResources()` for currency display in `#top-bar-resources`
- Added `updateProducerLevel()` for producer EXP bar and name display
- Added `renderFeaturedVtuber()` for landing page showcase
- Added `populateFeaturedGrid()` for featured VTuber selection modal
- Updated init() error handler to use `#settings-player-id` instead of `#player-id`
- Replaced dark theme CSS variables with soft pastel light theme in style.css
- Added CSS for `#top-bar` with producer avatar, info, exp bar track/fill
- Added CSS for `#bottom-nav` with 7 buttons, raised center home button
- Added CSS for resource pills, `.bnav-btn`, `.bnav-home`, `.bnav-home-circle`
- Added landing page CSS: `.landing-page`, `.featured-showcase`, `.featured-character`, `.featured-placeholder`, `.featured-info`, `.featured-select-btn`
- Added game panel button CSS: `.game-panels`, `.game-panel-btn`, `.panel-icon-wrap`, `.panel-icon-pink/purple/blue`
- Added landing banner CSS: `.landing-banner`, `.landing-banner-tag/title/sub`
- Added `.page-header` and `.page-back-btn` styles for sub-pages
- Updated existing component styles for light theme (scrollbar, station cards, modals, toasts, buttons, collections, studio)
- Removed old mobile footer responsive styles (#mobile-footer, #top-nav, .nav-tab)
- Updated cache buster from v=49 to v=50 in index.html (all 7 script/link tags)

Stage Summary:
- ui.js now works with new HTML structure — no more broken DOM references
- CSS has soft pastel light theme with lavender/purple VTubing aesthetic
- All navigation works via bottom navbar (7 buttons with raised home circle)
- Settings modal has username save, producer level info, player ID display
- Featured VTuber showcase functional on landing page with select modal
- Landing page has 3 game mode panel buttons (Live!ON toast, Studio, Gacha)
- Back buttons on all sub-pages return to home
- Cache buster updated to v=50

