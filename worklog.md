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
