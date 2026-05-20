const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageNumber, PageBreak,
        Table, TableRow, TableCell, WidthType, BorderStyle,
        ShadingType, TabStopPosition, TabStopType, UnderlineType } = require("docx");
const fs = require("fs");

// ── Palette: Soft purple/lavender VTubing theme ──
const P = {
  primary: "6C3FA0",
  body: "2D2B3D",
  secondary: "7E7A90",
  accent: "B068E0",
  surface: "F3EEF8",
  white: "FFFFFF",
  lightGray: "E8E3F0",
  tag: "9B59B6",
  tagBg: "F3EEF8",
  fix: "E74C3C",
  fixBg: "FDF2F2",
  new: "27AE60",
  newBg: "EFFAF3",
  improve: "3498DB",
  improveBg: "EBF5FB",
};

const c = (hex) => hex.replace("#", "");

// ── Component Builders ──
function title(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text, bold: true, size: 44, color: c(P.primary),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ],
  });
}

function subtitle(text) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text, size: 22, color: c(P.secondary), italics: true,
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ],
  });
}

function sectionHeader(text, icon) {
  return new Paragraph({
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.lightGray), space: 6 } },
    children: [
      new TextRun({ text: icon ? `${icon}  ` : "", size: 28, color: c(P.accent),
        font: { ascii: "Calibri" } }),
      new TextRun({ text, bold: true, size: 28, color: c(P.primary),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ],
  });
}

function subHeader(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: c(P.primary),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    children: [
      new TextRun({ text, size: 22, color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ],
  });
}

function bulletItem(text, tagColor, tagBg) {
  const tagParts = text.split(/(\[.*?\])/);
  const children = [
    new TextRun({ text: "  \u2022  ", size: 22, color: c(P.accent),
      font: { ascii: "Calibri" } }),
  ];
  for (const part of tagParts) {
    if (part.startsWith("[") && part.endsWith("]")) {
      const label = part.slice(1, -1);
      children.push(new TextRun({ text: ` ${label} `, bold: true, size: 20,
        color: tagColor || c(P.white), font: { ascii: "Calibri" },
        shading: { type: ShadingType.CLEAR, fill: tagBg || c(P.tagBg) } }));
    } else if (part) {
      children.push(new TextRun({ text: part, size: 22, color: c(P.body),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }));
    }
  }
  return new Paragraph({ spacing: { after: 60, line: 296 }, children });
}

function spacer() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: c(P.lightGray), space: 0 } },
    children: [],
  });
}

// ── Build Document ──
const children = [
  // Title block
  new Paragraph({ spacing: { before: 600 }, children: [] }),
  title("MyVT Gacha Collection"),
  new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "MAJOR UPDATE", bold: true, size: 36, color: c(P.accent),
        font: { ascii: "Calibri" } }),
    ],
  }),
  subtitle("Patch Notes  |  Version Overhaul  |  May 2026"),
  new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({ text: "Welcome back, Producers! This is a massive overhaul that touches nearly every corner of the game. ", size: 22, color: c(P.body), font: { ascii: "Calibri" } }),
      new TextRun({ text: "New UI, new currency system, new mechanics, and a whole lot of bug squashing. Here's everything that changed.", size: 22, color: c(P.body), font: { ascii: "Calibri" } }),
    ],
  }),
  divider(),

  // ── SECTION 1: New Look ──
  sectionHeader("Brand New Producer Dashboard", "\u{1F3A8}"),
  body("The entire game interface has been rebuilt from the ground up with a soft pastel light theme inspired by modern VTuber aesthetics. Gone is the old dark layout \u2014 say hello to lavender skies and gentle purples."),
  bulletItem("[NEW] A gorgeous landing page now greets you when you open the game. Your chosen Featured VTuber takes center stage with their portrait, name, and agency displayed proudly.", c(P.white), c(P.newBg)),
  bulletItem("[NEW] Bottom navigation bar with 7 quick-access buttons, including a raised Home circle in the center for easy one-tap return.", c(P.white), c(P.newBg)),
  bulletItem("[NEW] Top bar shows your Producer name, level, EXP progress, and all your currencies at a glance \u2014 no more hunting through menus.", c(P.white), c(P.newBg)),
  bulletItem("[NEW] Three game mode panels on the home screen: Studio, Gacha, and Live!ON (coming soon!).", c(P.white), c(P.newBg)),
  bulletItem("[UI] Settings are now accessible from the nav bar. You can change your Producer username from there!", c(P.white), c(P.improveBg)),
  bulletItem("[UI] On mobile, the Producer EXP bar in the top bar automatically hides to prevent overlapping your currency display.", c(P.white), c(P.improveBg)),
  spacer(),

  // ── SECTION 2: Featured VTuber ──
  sectionHeader("Featured VTuber Showcase", "\u{2B50}"),
  body("Your home is now truly yours. Pick your favorite VTuber from your collection and display them on the landing page for everyone (well, just you) to admire."),
  bulletItem("[NEW] Tap the circle button on the landing page to open the VTuber selection grid. Pick any owned VTuber to set as your featured star.", c(P.white), c(P.newBg)),
  bulletItem("[NEW] Your chosen VTuber's portrait, name, and agency are displayed front and center. Your selection persists across sessions.", c(P.white), c(P.newBg)),
  bulletItem("[FIX] Featured VTuber selection now properly saves and loads \u2014 previously the set button didn't actually do anything. Oops.", c(P.white), c(P.fixBg)),
  spacer(),

  // ── SECTION 3: Gacha Revamp ──
  sectionHeader("Gacha Page Makeover", "\u{1F389}"),
  body("The gacha pulling experience got a serious visual upgrade, taking inspiration from Wuthering Waves' clean banner design. But it's not just looks \u2014 the underlying pull mechanics are more robust too."),
  bulletItem("[UI] Completely redesigned gacha page with a Wuthering Waves-inspired light pastel purple theme. Banner hero section, rate-up info cards, pity progress bar, and sleek new pull buttons.", c(P.white), c(P.improveBg)),
  bulletItem("[UI] Sidebar banners show current banner info at a glance. Rate-up section highlights featured characters with boosted rates.", c(P.white), c(P.improveBg)),
  bulletItem("[FIX] Pull animations no longer overflow on mobile \u2014 10-pull results now fit cleanly within the viewport.", c(P.white), c(P.fixBg)),
  bulletItem("[FIX] The pity counter now snapshots BEFORE rolling, meaning if a pull fails due to missing resources, your pity progress won't be lost. Your luck is safe!", c(P.white), c(P.fixBg)),
  bulletItem("[FIX] 10-pull pre-rolls all 10 selections before spending any resources. If the data isn't ready, you get refunded \u2014 no more phantom ticket consumption.", c(P.white), c(P.fixBg)),
  bulletItem("[FIX] Gacha pulls no longer fail silently when character data is loading. The game now properly waits for data before attempting any pull.", c(P.white), c(P.fixBg)),
  spacer(),

  // ── SECTION 4: Studio & Content ──
  sectionHeader("Studio & Content Quality", "\u{1F3AC}"),
  body("Content creation in the Studio is now smarter and more rewarding. Your VTubers' stats directly determine the quality of content they produce, and the trending system adds a strategic layer to station assignments."),
  bulletItem("[FIX] Content quality is now correctly calculated based on VTuber stats. Previously, all content was stuck at Tier D (Poor) regardless of how strong your VTubers were. That was... not great. Now it works as intended: SS, S, A, B, C, or D based on stat matchups.", c(P.white), c(P.fixBg)),
  bulletItem("[FIX] The Trending Stat bonus (1.5x reward multiplier when the rotating trend matches your station's specialty) now actually triggers. Trending stats rotate every 2 hours across TC, CH, VC, and MG.", c(P.white), c(P.fixBg)),
  bulletItem("[INFO] Content quality tiers and their multipliers: SS (Masterpiece, 5x), S (Excellent, 2.5x), A (Great, 1.5x), B (Good, 1.0x), C (Normal, 0.5x), D (Poor, 0.1x).", c(P.white), c(P.improveBg)),
  bulletItem("[INFO] Each station type favors different stats: Stream Room (CH + VC), Creative Corner (TC + MG), Practice Hall (ST + PS), Lounge (PS + CH with bonus VGems).", c(P.white), c(P.improveBg)),
  spacer(),

  // ── SECTION 5: Bond System ──
  sectionHeader("Bond Stat Bonuses", "\u{2764}"),
  body("Raising your bond level with a VTuber now provides meaningful stat bonuses to that VTuber's own capabilities. Higher bond = stronger stats = better content quality and performance."),
  bulletItem("[FIX] Bond level stat bonuses now correctly apply as per-stat boosts to the VTuber's own stats. Each bond level grants bonuses to ST, PS, TC, CH, VC, and MG independently.", c(P.white), c(P.fixBg)),
  bulletItem("[INFO] Bond levels range from 1 to 8, requiring Bond Points earned through interactions. Higher bond levels grant increasingly powerful stat bonuses.", c(P.white), c(P.improveBg)),
  bulletItem("[INFO] The Odekake (Going Out) feature, unlocked at Studio Level 10, will let you take VTubers on dates for Bond Points. Stay tuned!", c(P.white), c(P.improveBg)),
  spacer(),

  // ── SECTION 6: Economy ──
  sectionHeader("Currency & Economy", "\u{1F4B0}"),
  body("The economy has been streamlined with a clear set of currencies. Here's a quick refresher on what each one does and how you earn them."),
  bulletItem("[CURRENCY] VGems \u2014 The premium currency. Used to buy pull tickets (150 VGems per ticket). Earned from Stream Room, daily login rewards, Lounge bonuses, and offline earnings.", c(P.white), c(P.tagBg)),
  bulletItem("[CURRENCY] VRinggit \u2014 The everyday currency. Used for station upgrades and VTuber level-ups. Earned from Creative Corner content.", c(P.white), c(P.tagBg)),
  bulletItem("[CURRENCY] Blue Tickets \u2014 Standard pull tickets. One pull per ticket. Earned from daily login, Practice Hall content, and converted from VGems.", c(P.white), c(P.tagBg)),
  bulletItem("[CURRENCY] Red Tickets \u2014 Featured banner pull tickets. Required for rate-up banners. Earned from special events (coming soon).", c(P.white), c(P.tagBg)),
  bulletItem("[CURRENCY] LiveCache \u2014 Upgrade material. Used alongside VRinggit for VTuber level-ups. Earned when pulling duplicate E6 (max Echo) VTubers.", c(P.white), c(P.tagBg)),
  bulletItem("[NEW] Duplicate pulls of fully maxed VTubers (E6 / 6 Echoes) now convert into LiveCache instead of being wasted. The amount depends on rarity: R (20), SR (50), SSR (100), UR (200).", c(P.white), c(P.newBg)),
  spacer(),

  // ── SECTION 7: Roster ──
  sectionHeader("VTuber Roster & Portraits", "\u{1F4F7}"),
  body("The VTuber roster has been significantly expanded, and every character now has their own unique portrait image self-hosted in the game."),
  bulletItem("[NEW] 319 VTubers in the roster, each with unique portraits, rarity assignments (R / SR / SSR / UR), individual stat distributions across 6 stats (ST, PS, TC, CH, VC, MG), and agency affiliations.", c(P.white), c(P.newBg)),
  bulletItem("[NEW] All character portraits are now self-hosted, meaning they load faster and don't depend on external image sources.", c(P.white), c(P.newBg)),
  bulletItem("[FIX] Character stat keys have been normalized to lowercase (st, ps, tc, ch, vc, mg) across the entire codebase. This fixes a migration bug where echo stat gains were being stored with uppercase keys and not displaying correctly.", c(P.white), c(P.fixBg)),
  bulletItem("[FIX] VTuber base stats are now properly initialized from the character database during save migration, preventing broken stat displays for older saves.", c(P.white), c(P.fixBg)),
  spacer(),

  // ── SECTION 8: Technical ──
  sectionHeader("Under the Hood (Save Data)", "\u{1F527}"),
  body("Your save data has been automatically migrated to the latest format (v7). All your progress, VTubers, currencies, and settings have been preserved. Here's what changed behind the scenes."),
  bulletItem("[SYSTEM] Save format updated to v7, automatically migrating from any previous version. Your existing data is fully preserved.", c(P.white), c(P.improveBg)),
  bulletItem("[SYSTEM] Data loading now uses a shared Promise pattern instead of recursive timeouts. This means the game loads faster and more reliably \u2014 no more random loading failures.", c(P.white), c(P.improveBg)),
  bulletItem("[SYSTEM] Auto-save runs every 30 seconds to keep your progress safe.", c(P.white), c(P.improveBg)),
  bulletItem("[SYSTEM] Producer Level system is now functional with EXP tracking and milestone rewards (Blue Tickets at levels 10, 15, 20, 25, and 30). EXP sources are being wired up progressively.", c(P.white), c(P.improveBg)),
  spacer(),

  // ── SECTION 9: Known Issues ──
  sectionHeader("Known Issues & Coming Soon", "\u{1F4DD}"),
  body("While this overhaul addresses the major issues, here's what's still on our radar:"),
  bulletItem("Live!ON minigame is not yet accessible from the new landing page (button shows a toast for now).", c(P.secondary), c(P.tagBg)),
  bulletItem("Shop, Quests, and Friends buttons in the nav bar are placeholders \u2014 they'll show toasts when tapped.", c(P.secondary), c(P.tagBg)),
  bulletItem("Producer EXP gain sources (beyond the framework) are still being implemented. The level system works, but you won't see much EXP gain yet.", c(P.secondary), c(P.tagBg)),
  bulletItem("The Odekake (Going Out / Date) system is designed but not yet playable. Studio Level 10 will unlock it when ready.", c(P.secondary), c(P.tagBg)),
  spacer(),

  // ── Footer ──
  divider(),
  new Paragraph({
    spacing: { before: 200, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "Thank you for testing!", bold: true, size: 24, color: c(P.primary),
        font: { ascii: "Calibri" } }),
    ],
  }),
  new Paragraph({
    spacing: { after: 60 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "If you encounter any bugs or issues, please report them in the #myvt-gacha channel.", size: 20, color: c(P.secondary), font: { ascii: "Calibri" } }),
    ],
  }),
  new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "\u2014 The MyVT Dev Team", size: 20, color: c(P.secondary), italics: true, font: { ascii: "Calibri" } }),
    ],
  }),
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 22,
          color: c(P.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "MyVT Gacha Collection  \u2022  Patch Notes  \u2022  Overhaul  \u2022  Page ", size: 16, color: c(P.secondary), font: { ascii: "Calibri" } }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: c(P.secondary), font: { ascii: "Calibri" } }),
          ],
        })],
      }),
    },
    children: children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/z/my-project/download/MyVT_Update_Log_Overhaul.docx", buf);
  console.log("Document generated: /home/z/my-project/download/MyVT_Update_Log_Overhaul.docx");
});
