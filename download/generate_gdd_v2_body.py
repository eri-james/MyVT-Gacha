#!/usr/bin/env python3
"""Generate the body PDF for MyVT Gacha Collection GDD v2.0."""
import sys, os, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('DejaVuSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerifBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMonoBold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
registerFontFamily('DejaVuSerif', normal='DejaVuSerif', bold='DejaVuSerifBold')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito')
registerFontFamily('DejaVuMono', normal='DejaVuMono', bold='DejaVuMonoBold')

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#3089a6')
TEXT_PRIMARY = colors.HexColor('#252421')
TEXT_MUTED = colors.HexColor('#837e76')
BG_SURFACE = colors.HexColor('#dfdad2')
BG_PAGE = colors.HexColor('#f4f3f1')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Page Setup ━━
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.85 * inch
BOT_M = 0.85 * inch
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M
MAX_KEEP_HEIGHT = A4[1] * 0.4

# ━━ Styles ━━
FONT = 'DejaVuSerif'

sH1 = ParagraphStyle('H1', fontName=FONT, fontSize=20, leading=26,
    textColor=ACCENT, spaceBefore=20, spaceAfter=10, alignment=TA_LEFT)
sH2 = ParagraphStyle('H2', fontName=FONT, fontSize=14, leading=19,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT)
sH3 = ParagraphStyle('H3', fontName=FONT, fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT)
sBody = ParagraphStyle('Body', fontName=FONT, fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_JUSTIFY)
sBodyLeft = ParagraphStyle('BodyL', fontName=FONT, fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_LEFT)
sMuted = ParagraphStyle('Muted', fontName=FONT, fontSize=9.5, leading=14,
    textColor=TEXT_MUTED, spaceAfter=4, alignment=TA_LEFT)
sCaption = ParagraphStyle('Cap', fontName=FONT, fontSize=9, leading=13,
    textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6, alignment=TA_CENTER)
sTH = ParagraphStyle('TH', fontName=FONT, fontSize=10,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER)
sCell = ParagraphStyle('TC', fontName=FONT, fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, leading=14)
sCellL = ParagraphStyle('TCL', fontName=FONT, fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=14)
sCode = ParagraphStyle('Code', fontName='DejaVuMono', fontSize=8.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13,
    leftIndent=12, spaceBefore=4, spaceAfter=4)

# ━━ Helpers ━━
_table_num = [0]

def next_table_num():
    _table_num[0] += 1
    return _table_num[0]

def h1(text):
    key = 'h1_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), sH1)
    p.bookmark_name = text; p.bookmark_level = 0; p.bookmark_text = text; p.bookmark_key = key
    return p

def h2(text):
    key = 'h2_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), sH2)
    p.bookmark_name = text; p.bookmark_level = 1; p.bookmark_text = text; p.bookmark_key = key
    return p

def h3(text):
    return Paragraph('<b>%s</b>' % text, sH3)

def body(text):
    return Paragraph(text, sBody)

def muted(text):
    return Paragraph(text, sMuted)

def bullet(text):
    return Paragraph(text, sBodyLeft)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BG_SURFACE, spaceBefore=12, spaceAfter=12)

def caption(text):
    return Paragraph(text, sCaption)

def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(AVAIL_W, A4[1])
        total += h
    if total <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

def make_table(data, col_ratios, has_header=True):
    widths = [r * AVAIL_W for r in col_ratios]
    t = Table(data, colWidths=widths, hAlign='CENTER')
    cmds = [
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if has_header:
        cmds.append(('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR))
        cmds.append(('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT))
        for i in range(1, len(data)):
            bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
            cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(cmds))
    return t

# ━━ TocDocTemplate ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

    def handle_pageBegin(self):
        SimpleDocTemplate.handle_pageBegin(self)
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(BG_PAGE)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # Accent line at top
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        canvas.line(LEFT_M, PAGE_H - TOP_M + 14, PAGE_W - RIGHT_M, PAGE_H - TOP_M + 14)
        canvas.restoreState()

    def afterPage(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFont(FONT, 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawCentredString(PAGE_W / 2, 0.45 * inch, "MyVT Gacha Collection - GDD v2.0")
        canvas.drawRightString(PAGE_W - RIGHT_M, 0.45 * inch, f"{self.page}")
        canvas.restoreState()

# ━━ Build Document ━━
OUTPUT = '/home/z/my-project/download/gdd_body.pdf'

doc = TocDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='MyVT Gacha Collection - Game Design Document v2.0',
    author='Eri James / MyVT',
    creator='Z.ai'
)

story = []

# ━━━━ TABLE OF CONTENTS ━━━━
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName=FONT, fontSize=12, leftIndent=20,
        textColor=ACCENT, spaceBefore=4, spaceAfter=2),
    ParagraphStyle('TOC2', fontName=FONT, fontSize=10, leftIndent=40,
        textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=1),
]
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TOCTitle',
    fontName=FONT, fontSize=20, textColor=ACCENT, spaceAfter=14, alignment=TA_LEFT)))
story.append(toc)
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# SECTION 1: GAME OVERVIEW
# ══════════════════════════════════════════════════════════════
story.append(h1('1. Game Overview'))

story.append(body(
    'MyVT Gacha Collection is a browser-based idle gacha collection game themed around the '
    'Malaysian VTuber (MyVT) community. Players collect virtual cards featuring real Malaysian '
    'VTubers by pulling from gacha banners, then manage a virtual studio where assigned VTubers '
    'generate resources passively. Built entirely with vanilla HTML, CSS, and JavaScript, the '
    'game is hosted on GitHub Pages and requires no installation, no backend server, and no '
    'database. All game state is persisted using the browser\'s localStorage, making it a truly '
    'zero-friction experience that players can enjoy on any device with a modern browser.'
))
story.append(body(
    'The roster features 319 Malaysian VTubers sourced from hololist.net, spanning independent '
    'creators and members of various agencies including VGakuenLive, HoloDream, MyHolo TV '
    '(VILIT), Projek Hikayat, and Phase Connect. Each VTuber is represented by a character card '
    'with portrait art from their hololist entry, and cards can be pulled in three variant tiers: '
    'Normal, SR (Super Rare), and SSR (Super Super Rare). The variant tier determines the card\'s '
    'visual frame, resource output multiplier, and level cap, creating a compelling collection '
    'and progression system built around the diverse Malaysian VTuber community.'
))
story.append(body(
    'The game design is guided by five core pillars: Accessibility, meaning zero install and any-browser '
    'compatibility; Community Celebration, showcasing the vibrant MyVT scene to a wider audience; '
    'Idle-Friendliness, where progress continues even when the player is offline; Collection Satisfaction, '
    'with 319 characters and variant upgrades providing long-term goals; and Skill Development, as the '
    'project serves as a practical learning exercise for web game development using vanilla technologies.'
))
story.append(body(
    'The primary target audience consists of members of the MyVT community, including VTubers themselves, '
    'their fans, and supporters of the Malaysian VTuber scene. Secondary audience members include general '
    'gacha game enthusiasts and idle game players who may discover the game through community sharing. The '
    'game is designed to be approachable for newcomers while offering enough depth to retain experienced '
    'gacha players. All text in the game is presented in English, reflecting the multilingual nature of '
    'the Malaysian VTuber community.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 2: CORE GAME LOOP
# ══════════════════════════════════════════════════════════════
story.append(h1('2. Core Game Loop'))

story.append(body(
    'The core gameplay loop of MyVT Gacha Collection revolves around a seven-step cycle that '
    'intertwines gacha pulling, idle resource generation, and character progression. Players begin '
    'by spending Stars on gacha pulls to acquire VTuber character cards. These cards are then assigned '
    'to Studio Room stations, where they passively generate resources even when the player is offline. '
    'Accumulated resources are reinvested to level up characters, ascend them to higher variant tiers, '
    'upgrade studio stations, and ultimately unlock new features and stations. The loop is designed to '
    'be simple enough to understand in seconds but deep enough to sustain engagement over weeks and '
    'months of regular play, with each step feeding naturally into the next.'
))
story.append(body(
    'New players start with 1,000 Stars, enough for approximately 10 single pulls on the Standard '
    'Banner. The first few pulls will typically yield Normal variant characters, which the player can '
    'immediately assign to the Stream Room station to begin generating Stars passively. This establishes '
    'the resource generation foundation that fuels the rest of the gameplay loop. As players progress, '
    'they unlock additional station types, each producing different currencies required for character '
    'progression, creating a web of interdependencies that keeps all game systems relevant throughout '
    'the play experience.'
))

loop_data = [
    [Paragraph('<b>Step</b>', sTH), Paragraph('<b>Action</b>', sTH),
     Paragraph('<b>Description</b>', sTH)],
    [Paragraph('1', sCell), Paragraph('Pull', sCell),
     Paragraph('Spend Stars on gacha banners to acquire VTuber character cards.', sCellL)],
    [Paragraph('2', sCell), Paragraph('Assign', sCell),
     Paragraph('Place collected characters into Studio Room stations to generate resources.', sCellL)],
    [Paragraph('3', sCell), Paragraph('Earn', sCell),
     Paragraph('Resources accumulate passively (idle), even while the player is offline.', sCellL)],
    [Paragraph('4', sCell), Paragraph('Level Up', sCell),
     Paragraph('Spend Star Dust and Stars to increase character levels, boosting station output.', sCellL)],
    [Paragraph('5', sCell), Paragraph('Ascend', sCell),
     Paragraph('Spend Star Fragments to upgrade Normal to SR and SR to SSR variants.', sCellL)],
    [Paragraph('6', sCell), Paragraph('Expand', sCell),
     Paragraph('Upgrade Studio Level to unlock new stations, slots, and features.', sCellL)],
    [Paragraph('7', sCell), Paragraph('Repeat', sCell),
     Paragraph('Continue pulling to fill collection gaps; aim for 100% SSR completion.', sCellL)],
]
tn = next_table_num()
story.append(Spacer(1, 12))
story.append(make_table(loop_data, [0.07, 0.12, 0.81]))
story.append(caption(f'Table {tn}: The Seven-Step Core Game Loop'))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 3: GACHA PULL SYSTEM
# ══════════════════════════════════════════════════════════════
story.append(h1('3. Gacha Pull System'))

story.append(body(
    'The gacha pull system is the primary mechanism through which players acquire new character cards. '
    'It features two banner types, three variant tiers with distinct drop rates, a pity system to prevent '
    'excessive bad luck, and a duplicate handling system that ensures every pull produces meaningful '
    'value. The system is designed to create excitement and anticipation with each pull while maintaining '
    'fairness and long-term progression for dedicated players.'
))

story.append(h2('3.1 Banner Types'))
story.append(body(
    'The gacha system features two types of banners. The Standard Banner contains all 319 Malaysian VTubers '
    'from the hololist roster and is permanently available, serving as the primary source of new characters. '
    'The Featured Banner is a rotating limited-time banner that highlights 3-4 specific VTubers with '
    'increased drop rates on a weekly rotation. Both banners draw from the full 319-character pool for '
    'character selection, meaning that any character can be pulled from either banner. The Featured Banner\'s '
    'rate-up characters simply have a higher probability of appearing, making it the preferred choice for '
    'players seeking specific VTubers for their collection.'
))

tn = next_table_num()
banner_data = [
    [Paragraph('<b>Banner Type</b>', sTH), Paragraph('<b>Pool Size</b>', sTH),
     Paragraph('<b>Featured Characters</b>', sTH), Paragraph('<b>Rotation</b>', sTH)],
    [Paragraph('Standard', sCell), Paragraph('319', sCell),
     Paragraph('None (equal rates)', sCellL), Paragraph('Permanent', sCell)],
    [Paragraph('Featured', sCell), Paragraph('319', sCell),
     Paragraph('3-4 rate-up VTubers', sCellL), Paragraph('Weekly', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(banner_data, [0.20, 0.15, 0.35, 0.30]))
story.append(caption(f'Table {tn}: Banner Types Overview'))

story.append(h2('3.2 Pull Rates'))
story.append(body(
    'Each pull yields one character card with a randomly determined variant tier. The variant system does '
    'not affect which character is obtained; rather, it determines the rarity and visual quality of that '
    'character\'s card. Normal cards appear at a base rate of 82%, SR cards at 15%, and SSR cards at 3%. '
    'This means that on average, a player will see an SSR card roughly once every 33 pulls, though the pity '
    'system ensures that no player goes more than 50 pulls without an SSR. The 10x multi-pull additionally '
    'guarantees at least one SR or above card, providing a reliable floor for multi-pull investments.'
))

tn = next_table_num()
rates_data = [
    [Paragraph('<b>Variant</b>', sTH), Paragraph('<b>Drop Rate</b>', sTH),
     Paragraph('<b>Card Frame</b>', sTH), Paragraph('<b>Pull Guarantee</b>', sTH)],
    [Paragraph('Normal', sCell), Paragraph('82%', sCell),
     Paragraph('Grey border, standard art', sCellL), Paragraph('Always obtainable', sCell)],
    [Paragraph('SR', sCell), Paragraph('15%', sCell),
     Paragraph('Silver border with glow', sCellL), Paragraph('1 per 10x pull', sCell)],
    [Paragraph('SSR', sCell), Paragraph('3%', sCell),
     Paragraph('Gold border with shine', sCellL), Paragraph('Pity at 50 pulls', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(rates_data, [0.15, 0.15, 0.40, 0.30]))
story.append(caption(f'Table {tn}: Pull Rates by Variant Tier'))

story.append(h2('3.3 Pull Costs'))
story.append(body(
    'Pulling from either banner costs Stars, the game\'s primary currency. A single pull costs 100 Stars, '
    'while a ten-pull costs 1,000 Stars (equivalent to 10 single pulls with no discount). The pricing is '
    'intentionally simple and consistent across both banner types, ensuring that players can easily calculate '
    'how many pulls they can afford at any given time. The starting bonus of 1,000 Stars provides enough for '
    'either 10 single pulls or one multi-pull, giving new players an immediate and meaningful introduction '
    'to the gacha mechanic.'
))

tn = next_table_num()
pull_cost_data = [
    [Paragraph('<b>Pull Type</b>', sTH), Paragraph('<b>Cost (Stars)</b>', sTH),
     Paragraph('<b>Guarantee</b>', sTH)],
    [Paragraph('Single Pull (1x)', sCell), Paragraph('100', sCell), Paragraph('None', sCell)],
    [Paragraph('Multi Pull (10x)', sCell), Paragraph('1,000', sCell), Paragraph('At least 1 SR or above', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(pull_cost_data, [0.30, 0.30, 0.40]))
story.append(caption(f'Table {tn}: Pull Costs'))

story.append(h2('3.4 Pity System'))
story.append(body(
    'A pity system ensures that players are guaranteed an SSR variant after 50 consecutive pulls without '
    'obtaining one. The pity counter tracks pulls across all banners and resets every time an SSR variant '
    'is pulled, regardless of which banner it came from. This cross-banner tracking means that players '
    'cannot accidentally lose their pity progress by switching banners, and it prevents excessively unlucky '
    'streaks from undermining the player experience. Additionally, the 10x multi-pull guarantees at least '
    'one SR or above card, providing a reliable floor for multi-pull investments and ensuring that even '
    'unlucky multi-pulls yield at least one notable result.'
))

story.append(h2('3.5 Duplicate Handling'))
story.append(body(
    'When a player pulls a character they already own at the same variant tier, the duplicate is converted '
    'into Shards. Shards serve as a universal resource that can be exchanged for Star Dust or Star Fragments '
    'at a conversion rate displayed in the in-game interface. If a player already owns a character at SSR '
    'tier and pulls that same character at any tier again, the duplicate is automatically converted into '
    'bonus Stars instead of Shards, providing a meaningful endgame resource sink. This duplicate handling '
    'system ensures that every pull produces value, even when the character pool has been largely exhausted, '
    'which is especially important given the relatively small roster of 319 characters.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 4: STUDIO ROOM MANAGEMENT
# ══════════════════════════════════════════════════════════════
story.append(h1('4. Studio Room Management'))

story.append(body(
    'The Studio Room is the management hub of MyVT Gacha Collection, providing the idle resource generation '
    'layer that transforms the game from a simple pull simulator into an engaging management experience. '
    'Players assign their collected VTuber characters to various Stations, each of which produces a different '
    'type of resource. The strategic decision of which characters to assign to which stations, combined with '
    'station upgrades and character progression, creates a deep and satisfying management loop that rewards '
    'thoughtful planning and long-term engagement.'
))

story.append(h2('4.1 Station Types'))
story.append(body(
    'Each station represents a different activity that VTubers might engage in, and each produces a unique '
    'resource. Players start with the Stream Room station unlocked at Studio Level 1 and gradually unlock '
    'additional stations by increasing their Studio Level. Every station can hold exactly one assigned '
    'VTuber at a time, and the player may reassign characters freely with no cooldown or penalty. The output '
    'of each station scales with the assigned character\'s variant tier and level, as well as the station\'s '
    'own upgrade level, creating multiple axes of optimization for players to explore.'
))

tn = next_table_num()
station_data = [
    [Paragraph('<b>Station</b>', sTH), Paragraph('<b>Resource</b>', sTH),
     Paragraph('<b>Primary Use</b>', sTH), Paragraph('<b>Unlock</b>', sTH)],
    [Paragraph('Stream Room', sCell), Paragraph('Stars', sCell),
     Paragraph('Gacha pulls, station upgrades', sCellL), Paragraph('Studio Lv 1', sCell)],
    [Paragraph('Creative Corner', sCell), Paragraph('Star Dust', sCell),
     Paragraph('Character levelling', sCellL), Paragraph('Studio Lv 2', sCell)],
    [Paragraph('Practice Hall', sCell), Paragraph('Star Fragments', sCell),
     Paragraph('Ascension material', sCellL), Paragraph('Studio Lv 4', sCell)],
    [Paragraph('Lounge', sCell), Paragraph('Bond Points', sCell),
     Paragraph('Studio Level EXP', sCellL), Paragraph('Studio Lv 6', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(station_data, [0.20, 0.18, 0.37, 0.25]))
story.append(caption(f'Table {tn}: Station Types and Their Resources'))

story.append(h2('4.2 Station Upgrades'))
story.append(body(
    'Each station can be upgraded from Level 1 through Level 5. Upgrading increases the station\'s output '
    'multiplier, meaning that the same assigned character will produce more resources per minute at higher '
    'station levels. The output multiplier progresses as follows: Level 1 provides a x1 multiplier, Level 2 '
    'provides x1.5, Level 3 provides x2, Level 4 provides x3, and Level 5 provides x5. This exponential '
    'scaling means that maxing out a station is a significant long-term investment that dramatically increases '
    'resource generation, and the scaling costs ensure that players must carefully prioritise which stations '
    'to upgrade first.'
))

tn = next_table_num()
upg_data = [
    [Paragraph('<b>Level</b>', sTH), Paragraph('<b>Multiplier</b>', sTH),
     Paragraph('<b>Cost (Stars)</b>', sTH), Paragraph('<b>Cost (Fragments)</b>', sTH)],
    [Paragraph('1', sCell), Paragraph('x1', sCell), Paragraph('(Base)', sCell), Paragraph('(Base)', sCell)],
    [Paragraph('2', sCell), Paragraph('x1.5', sCell), Paragraph('500', sCell), Paragraph('50', sCell)],
    [Paragraph('3', sCell), Paragraph('x2', sCell), Paragraph('2,000', sCell), Paragraph('200', sCell)],
    [Paragraph('4', sCell), Paragraph('x3', sCell), Paragraph('8,000', sCell), Paragraph('800', sCell)],
    [Paragraph('5', sCell), Paragraph('x5', sCell), Paragraph('30,000', sCell), Paragraph('3,000', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(upg_data, [0.12, 0.18, 0.35, 0.35]))
story.append(caption(f'Table {tn}: Station Upgrade Costs and Multipliers'))

story.append(h2('4.3 Resource Output Calculation'))
story.append(body(
    'The resource output per minute for any station is determined by a multiplicative formula: '
    'Output = Base Rate x Character Variant Multiplier x Character Level Bonus x Station Level Multiplier. '
    'The base rate differs per station type. Character variant multipliers are x1 for Normal, x2 for SR, and '
    'x5 for SSR. The character level bonus is calculated as 1 + (Level x 0.02), meaning a Level 50 SSR '
    'character at a Level 5 station produces (Base Rate x 5 x 2 x 5) = 50x the base rate. This formula '
    'ensures that every aspect of character progression meaningfully contributes to resource generation, '
    'making both pulling higher-tier cards and investing in levelling feel rewarding.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 5: CURRENCY SYSTEM
# ══════════════════════════════════════════════════════════════
story.append(h1('5. Currency System'))

story.append(body(
    'MyVT Gacha Collection features five distinct currencies, each serving a unique purpose within the game '
    'economy. This multi-currency design ensures that players must engage with all aspects of the game to '
    'progress, preventing the common gacha game problem of a single currency becoming irrelevant after the '
    'early game. Four of the five currencies are produced by studio stations, while the fifth, Gems, is a '
    'premium currency earned primarily through the Super Chat Toss minigame and collection milestones. Each '
    'currency feeds into different progression systems, creating interdependencies that make the gameplay '
    'loop feel cohesive and rewarding throughout the entire play experience.'
))

tn = next_table_num()
curr_data = [
    [Paragraph('<b>Currency</b>', sTH), Paragraph('<b>Symbol</b>', sTH),
     Paragraph('<b>Source</b>', sTH), Paragraph('<b>Primary Use</b>', sTH)],
    [Paragraph('Stars', sCell), Paragraph('*', sCell),
     Paragraph('Stream Room, Daily Login, Duplicate SSR', sCellL), Paragraph('Gacha pulls, Station upgrades', sCellL)],
    [Paragraph('Star Dust', sCell), Paragraph('+', sCell),
     Paragraph('Creative Corner, Shard conversion', sCellL), Paragraph('Character levelling', sCellL)],
    [Paragraph('Star Fragments', sCell), Paragraph('#', sCell),
     Paragraph('Practice Hall, Shard conversion', sCellL), Paragraph('Ascension crafting', sCellL)],
    [Paragraph('Bond Points', sCell), Paragraph('~', sCell),
     Paragraph('Lounge station, Odekake outings', sCellL), Paragraph('Studio Level EXP', sCellL)],
    [Paragraph('Gems', sCell), Paragraph('<b>$</b>', sCell),
     Paragraph('Minigame, Milestones', sCellL), Paragraph('Premium rewards, exchange', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(curr_data, [0.16, 0.08, 0.38, 0.38]))
story.append(caption(f'Table {tn}: Currency Types, Sources, and Uses'))

story.append(body(
    'New players receive a starting package of 1,000 Stars to immediately begin pulling on banners. No '
    'other currencies are provided at the start; players must progress through the early game to unlock '
    'stations and begin generating secondary currencies. The Daily Login Bonus provides 100 Stars as a base '
    'amount, increasing by 50 Stars per consecutive day of login, with a daily cap of 500 Stars after a '
    '9-day streak. Missing a day resets the streak to day 1, creating a gentle but meaningful incentive '
    'for regular engagement. Gems, the premium currency, are earned by playing the Super Chat Toss minigame '
    'and by reaching collection milestones, providing an additional progression path beyond passive resource '
    'generation.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 6: CHARACTER PROGRESSION
# ══════════════════════════════════════════════════════════════
story.append(h1('6. Character Progression'))

story.append(body(
    'Characters in MyVT Gacha Collection progress through two interconnected systems: levelling and '
    'ascension. Levelling strengthens a character within its current variant tier, increasing its resource '
    'output when assigned to a station. Ascension upgrades a character to a higher variant tier (Normal to '
    'SR, or SR to SSR), unlocking a new card frame, higher level caps, and significantly increased output '
    'multipliers. Both systems require different currencies, ensuring that players must engage with multiple '
    'station types to fully develop their roster. The progression system is designed to provide constant '
    'short-term goals while maintaining compelling long-term targets for dedicated players.'
))

story.append(h2('6.1 Character Levelling'))
story.append(body(
    'Each character can be levelled from Level 1 up to a maximum level determined by their current variant '
    'tier. Normal variant characters have a level cap of 20, SR characters can reach Level 35, and SSR '
    'characters can reach Level 50. Levelling requires spending Star Dust and Stars, with costs scaling '
    'based on the target level. Each level increases the character\'s resource output by approximately 2% '
    '(the level bonus formula is 1 + Level x 0.02), making levelling a consistent and predictable '
    'investment that pays dividends across all station types where the character might be assigned.'
))

tn = next_table_num()
level_data = [
    [Paragraph('<b>Variant</b>', sTH), Paragraph('<b>Level Cap</b>', sTH),
     Paragraph('<b>Cost (Star Dust)</b>', sTH), Paragraph('<b>Cost (Stars)</b>', sTH)],
    [Paragraph('Normal', sCell), Paragraph('20', sCell), Paragraph('10 + (Lvl x 5)', sCell), Paragraph('20 + (Lvl x 10)', sCell)],
    [Paragraph('SR', sCell), Paragraph('35', sCell), Paragraph('30 + (Lvl x 10)', sCell), Paragraph('50 + (Lvl x 20)', sCell)],
    [Paragraph('SSR', sCell), Paragraph('50', sCell), Paragraph('80 + (Lvl x 20)', sCell), Paragraph('100 + (Lvl x 40)', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(level_data, [0.15, 0.15, 0.35, 0.35]))
story.append(caption(f'Table {tn}: Levelling Costs by Variant Tier'))

story.append(h2('6.2 Character Ascension'))
story.append(body(
    'Ascension is the process of upgrading a character to a higher variant tier. To ascend a Normal '
    'character to SR, the character must be at maximum level (20) and the player must spend 100 Star '
    'Fragments. To ascend an SR character to SSR, the character must be at its maximum SR level (35) and '
    'the player must spend 500 Star Fragments. Ascension changes the character\'s card frame, increases '
    'the variant output multiplier (from x1 to x2 for Normal-to-SR, and from x2 to x5 for SR-to-SSR), '
    'raises the level cap, and increases Studio EXP contribution. This dual-gate system (max level + '
    'fragment cost) ensures that ascension is a significant milestone that requires sustained investment '
    'in each individual character.'
))

tn = next_table_num()
asc_data = [
    [Paragraph('<b>Ascension</b>', sTH), Paragraph('<b>Required Level</b>', sTH),
     Paragraph('<b>Cost (Fragments)</b>', sTH), Paragraph('<b>New Level Cap</b>', sTH)],
    [Paragraph('Normal to SR', sCell), Paragraph('Lv 20', sCell), Paragraph('100', sCell), Paragraph('35', sCell)],
    [Paragraph('SR to SSR', sCell), Paragraph('Lv 35', sCell), Paragraph('500', sCell), Paragraph('50', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(asc_data, [0.25, 0.25, 0.30, 0.20]))
story.append(caption(f'Table {tn}: Ascension Requirements'))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 7: STUDIO LEVEL AND FEATURE UNLOCKS
# ══════════════════════════════════════════════════════════════
story.append(h1('7. Studio Level and Feature Unlocks'))

story.append(body(
    'The Studio Level serves as the overarching progression gate for the game. Unlike character levels or '
    'station upgrades, the Studio Level does not directly improve resource generation rates. Instead, it '
    'unlocks new features, stations, and station slots, providing a structured sense of progression that '
    'guides players through the game\'s systems at a measured pace. Studio EXP is earned passively from '
    'assigned characters in stations, with SSR characters contributing more EXP than SR, and SR contributing '
    'more than Normal. The Studio Level ensures that new players are not overwhelmed by too many systems at '
    'once while providing experienced players with clear goals to work toward over the course of their '
    'playthrough.'
))

tn = next_table_num()
studio_data = [
    [Paragraph('<b>Studio Lv</b>', sTH), Paragraph('<b>Unlocks</b>', sTH),
     Paragraph('<b>EXP Required</b>', sTH)],
    [Paragraph('1', sCell), Paragraph('Stream Room + 2 station slots', sCellL), Paragraph('0', sCell)],
    [Paragraph('2', sCell), Paragraph('Creative Corner station', sCellL), Paragraph('200', sCell)],
    [Paragraph('3', sCell), Paragraph('3rd station slot', sCellL), Paragraph('600', sCell)],
    [Paragraph('4', sCell), Paragraph('Practice Hall station', sCellL), Paragraph('1,500', sCell)],
    [Paragraph('5', sCell), Paragraph('4th station slot', sCellL), Paragraph('3,500', sCell)],
    [Paragraph('6', sCell), Paragraph('Lounge station', sCellL), Paragraph('7,000', sCell)],
    [Paragraph('7', sCell), Paragraph('Character detail stats', sCellL), Paragraph('12,000', sCell)],
    [Paragraph('8', sCell), Paragraph('5th station slot', sCellL), Paragraph('20,000', sCell)],
    [Paragraph('9', sCell), Paragraph('Agency filter', sCellL), Paragraph('35,000', sCell)],
    [Paragraph('10', sCell), Paragraph('Odekake (Going Out)', sCellL), Paragraph('60,000', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(studio_data, [0.15, 0.55, 0.30]))
story.append(caption(f'Table {tn}: Studio Level Progression and Unlocks'))

story.append(h2('7.1 Odekake (Going Out) - Planned Feature'))
story.append(body(
    'At Studio Level 10, players unlock the Odekake feature, inspired by the training camp system in Uma '
    'Musume. Odekake allows players to send a character on a timed "outing" lasting between 1 and 4 hours. '
    'During this time, the character cannot be assigned to any station. When the outing concludes, the '
    'character returns with Bond Points, Studio EXP, and occasionally rare crafting materials. Repeated '
    'outings with the same character build a Bond Level, which unlocks character-specific bonuses such as '
    'increased output multipliers or reduced ascension costs. This feature adds an emotional attachment '
    'layer to the game, encouraging players to invest in their favourite characters beyond mere numerical '
    'optimization. The Bond Level system provides a long-term progression goal that extends beyond the '
    'collection and variant upgrade mechanics, giving players a reason to continue engaging with the game '
    'even after achieving a high collection completion percentage.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 8: COLLECTION GALLERY
# ══════════════════════════════════════════════════════════════
story.append(h1('8. Collection Gallery'))

story.append(body(
    'The Collection Gallery is the player\'s visual archive of all 319 Malaysian VTubers in the game. It '
    'displays every character as a card in a responsive grid layout, with distinct visual indicators showing '
    'which characters the player owns, which variant tiers they have obtained, and which characters remain '
    'undiscovered. The gallery serves as both a progress tracker and a showcase of the player\'s collection '
    'achievements, providing a clear visual representation of how far the player has come and what remains '
    'to be collected.'
))
story.append(body(
    'The gallery provides multiple filter options to help players navigate the large roster. Ownership filters '
    'allow viewing All, Owned, or Unowned characters. Variant filters narrow results by highest owned variant '
    '(Normal, SR, or SSR). An Agency filter, unlocked at Studio Level 9, enables filtering by agency affiliation '
    'such as Independent, VGakuenLive, VILIT, and others. A Station filter shows characters by assignment '
    'status (Any, Currently Assigned, or Unassigned). Players can also search by VTuber name and sort by Name '
    'or Variant tier. The gallery displays 40 characters per page with pagination controls.'
))
story.append(body(
    'A collection progress bar at the top of the gallery shows overall completion percentage alongside '
    'per-variant completion stats (for example, 45/319 SSR, 120/319 SR, 280/319 Normal). Collection '
    'milestones at 10, 25, 50, 100, 150, 200, 250, 300, and 319 owned characters reward players with bonus '
    'resources and Gems, providing structured goals and celebration moments throughout the collection journey. '
    'Clicking any character card opens a detail popup showing the character\'s pull history, current stats, '
    'all owned variants, and variant-specific information.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 9: UI/UX DESIGN
# ══════════════════════════════════════════════════════════════
story.append(h1('9. UI/UX Design'))

story.append(body(
    'The game\'s user interface is built around a dark theme that follows the visual language common in '
    'anime-style gacha games, creating an immersive and familiar aesthetic for the target audience. The '
    'primary background is a deep dark grey (#0e0e0c), with card backgrounds in slightly lighter tones to '
    'create visual depth. Purple accents (#896fd9) are used for interactive elements and headers, teal/green '
    'accents (#5dd499) highlight positive feedback such as resource gains, and gold tones are reserved for '
    'SSR-tier elements to convey rarity and premium quality.'
))

story.append(h2('9.1 Navigation'))
story.append(body(
    'The user interface employs a tab-based navigation system with five primary sections: Home, Pull, '
    'Collection, Studio, and Minigame. A persistent top navigation bar displays these tabs along with the '
    'player\'s current resource counts (Stars, Star Dust, Star Fragments, Bond Points) and a stamina bar. '
    'A settings overlay accessible from the navigation bar provides save, export, import, device transfer, '
    'and reset functionality. The navigation is designed to be thumb-friendly on mobile devices, with tabs '
    'positioned at the bottom on narrow viewports and at the top on wider screens.'
))

tn = next_table_num()
nav_data = [
    [Paragraph('<b>Tab</b>', sTH), Paragraph('<b>Content</b>', sTH),
     Paragraph('<b>Key Interactions</b>', sTH)],
    [Paragraph('Home', sCell),
     Paragraph('Stats, daily login, offline earnings, studio overview', sCellL),
     Paragraph('Claim offline earnings, view progress', sCellL)],
    [Paragraph('Pull', sCell),
     Paragraph('Banner selection, pull animation, results', sCellL),
     Paragraph('Single/multi pull, banner switching', sCellL)],
    [Paragraph('Collection', sCell),
     Paragraph('Character gallery grid with filters', sCellL),
     Paragraph('Filter, sort, view character details', sCellL)],
    [Paragraph('Studio', sCell),
     Paragraph('Stations, assignment, upgrades', sCellL),
     Paragraph('Assign characters, upgrade stations', sCellL)],
    [Paragraph('Minigame', sCell),
     Paragraph('Super Chat Toss game screen', sCellL),
     Paragraph('Play rounds, view high scores', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(nav_data, [0.12, 0.44, 0.44]))
story.append(caption(f'Table {tn}: Navigation Tabs and Their Content'))

story.append(h2('9.2 Card Design'))
story.append(body(
    'Character cards are the central visual element of the game. Each card displays the VTuber\'s portrait '
    'image from hololist.net, their name, agency, and variant tier badge. Normal cards have a simple grey '
    'border, SR cards feature a silver border with a subtle glow effect, and SSR cards display a gold border '
    'with an animated shine effect. Cards are sized at approximately 120x160 pixels in the gallery grid and '
    'scale up to 200x280 pixels in single-pull reveal and 120x168 pixels in 10-pull reveal. The pull '
    'animation features a sequential slide-in with a 3D flip reveal, where cards appear one at a time from '
    'below the screen and flip to reveal the character. Single pulls take approximately 1 second for a '
    'dramatic reveal, while 10-pulls complete in about 8 seconds total with an option to tap and skip.'
))

story.append(h2('9.3 Pull Animation'))
story.append(body(
    'The pull animation system employs a sequential slide-in combined with a 3D card flip. Cards appear '
    'one at a time from below the viewport, slide up to the centre, and flip to reveal the character. '
    'For single pulls, this takes approximately 1 second with a dramatic pause before the flip. For 10-pulls, '
    'the total animation runs for about 8 seconds with cards appearing in rapid succession. Players can tap '
    'to skip the animation at any point. SR pulls trigger a silver screen flash effect, and SSR pulls '
    'trigger a golden screen flash accompanied by an animated golden glow ring around the card. These visual '
    'effects create moments of excitement and celebration that reinforce the emotional reward of pulling '
    'higher-tier cards.'
))

story.append(h2('9.4 Responsive Design'))
story.append(body(
    'The game is designed to be fully responsive, adapting to screen sizes from 320px mobile screens to '
    '1920px desktop displays. On mobile, the gallery grid displays 3 cards per row with a bottom navigation '
    'bar. On tablet, the grid expands to 4-5 cards per row. On desktop, up to 8 cards per row are shown '
    'with a horizontal top navigation bar. The Studio Room layout adapts similarly, showing stations in a '
    'vertical stack on mobile and a grid on desktop. All interactive elements have touch targets of at least '
    '44x44 pixels for comfortable mobile interaction.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 10: SUPER CHAT TOSS MINIGAME
# ══════════════════════════════════════════════════════════════
story.append(h1('10. Super Chat Toss Minigame'))

story.append(body(
    'The Super Chat Toss is a tap-based 30-second minigame accessible from the Minigame navigation tab. '
    'It provides an active gameplay alternative to the idle resource generation of the studio system, '
    'offering players a skill-based way to earn Stars and Gems. The minigame features five bubble types '
    'that float across the screen: Coin bubbles grant +10 Stars, Premium bubbles grant +25 Stars, Gem '
    'bubbles grant +1 Gem, Landmine bubbles penalise the player with -15% of their current score, and '
    'Gift bubbles add +3 seconds to the remaining time, extending the play session.'
))
story.append(body(
    'A boost meter fills as the player taps bubbles. When the meter reaches 100%, it triggers Super Chat '
    'Mode for 5 seconds, during which all Coin and Premium bubbles are worth 5 times their normal value. '
    'This creates exciting moments of high-scoring potential that reward sustained accuracy and quick '
    'reflexes. Before each round, the player selects an owned VTuber as their "streamer lead," whose '
    'variant tier determines a score multiplier: Normal characters provide x1, SR characters provide x1.5, '
    'and SSR characters provide x2. This character lead system adds a strategic layer, encouraging players '
    'to invest in and use their highest-tier characters during minigame rounds.'
))
story.append(body(
    'Each round of Super Chat Toss costs 15 stamina points. The results screen at the end of each round '
    'displays the Stars earned, Gems earned, and Bond Points gained (+10 per round). High scores are '
    'tracked locally, giving players a personal best to beat. The minigame serves multiple design purposes: '
    'it provides active engagement for players who want more than idle gameplay, it creates a meaningful '
    'use for stamina, it offers a path to earn the premium Gem currency, and it gives owned characters '
    'additional utility beyond studio station assignment.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 11: STAMINA SYSTEM
# ══════════════════════════════════════════════════════════════
story.append(h1('11. Stamina System'))

story.append(body(
    'The stamina system governs access to the Super Chat Toss minigame, adding a resource management layer '
    'to the active gameplay experience. Players have a maximum of 200 stamina points, which regenerate at '
    'a rate of 1 point every 4 minutes (approximately 360 points per day at full regeneration). Each round '
    'of Super Chat Toss costs 15 stamina, meaning a fully charged stamina bar allows for approximately 13 '
    'consecutive rounds of play before the player must wait for regeneration.'
))
story.append(body(
    'The stamina bar is prominently displayed in both the navigation bar and the minigame start screen, '
    'alongside a timer showing the time until the next point of recovery. When the player loads the game '
    'after being offline, the system calculates offline recovery based on the elapsed time since the last '
    'save, ensuring that players do not lose any regeneration progress during breaks. This offline recovery '
    'calculation is capped to prevent excessive accumulation during very long absences. The stamina system '
    'creates a natural cadence for minigame engagement, preventing the minigame from becoming the sole focus '
    'of gameplay while still providing regular opportunities for active play sessions.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 12: TECHNICAL ARCHITECTURE
# ══════════════════════════════════════════════════════════════
story.append(h1('12. Technical Architecture'))

story.append(body(
    'The game is built entirely with vanilla web technologies: HTML5 for structure, CSS3 for styling and '
    'animations, and JavaScript ES6+ for game logic. No frameworks, libraries, or build tools are required, '
    'making the project accessible to developers of all skill levels and easy to deploy on any static hosting '
    'platform. The only external dependency is the character portrait images hosted on hololist.net, which '
    'are loaded dynamically via URLs stored in the game\'s character data file. This zero-dependency approach '
    'was chosen deliberately to keep the project simple, educational, and easy to maintain.'
))

story.append(h2('12.1 Technology Stack'))
tn = next_table_num()
tech_data = [
    [Paragraph('<b>Technology</b>', sTH), Paragraph('<b>Purpose</b>', sTH),
     Paragraph('<b>Rationale</b>', sTH)],
    [Paragraph('HTML5', sCell), Paragraph('Page structure', sCellL),
     Paragraph('Universal browser support', sCellL)],
    [Paragraph('CSS3', sCell), Paragraph('Styling, animations, responsive layout', sCellL),
     Paragraph('Card flip, dark theme, media queries', sCellL)],
    [Paragraph('JavaScript ES6+', sCell), Paragraph('Game logic, state, DOM', sCellL),
     Paragraph('No framework overhead', sCellL)],
    [Paragraph('localStorage', sCell), Paragraph('Client-side persistence', sCellL),
     Paragraph('No backend, instant save/load', sCellL)],
    [Paragraph('JSON', sCell), Paragraph('Character roster data', sCellL),
     Paragraph('Human-readable, easy updates', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(tech_data, [0.20, 0.40, 0.40]))
story.append(caption(f'Table {tn}: Technology Stack'))

story.append(h2('12.2 File Structure'))
story.append(body(
    'The project follows a clean, modular file structure that separates concerns for maintainability and '
    'readability. Each JavaScript file handles a distinct area of game functionality, and the character data '
    'is stored in a separate JSON file that can be updated independently. Note that the original GDD listed '
    'js/studio.js and js/firebase.js, which do not exist in the current codebase. Studio logic is handled '
    'within game.js, and Firebase cloud save has not been implemented beyond placeholder UI buttons in the '
    'settings modal.'
))

tn = next_table_num()
files_data = [
    [Paragraph('<b>File</b>', sTH), Paragraph('<b>Purpose</b>', sTH)],
    [Paragraph('index.html', sCellL), Paragraph('Main page, loads all scripts', sCellL)],
    [Paragraph('css/style.css', sCellL), Paragraph('All styles: dark theme, animations, responsive', sCellL)],
    [Paragraph('js/data.js', sCellL), Paragraph('Character data loader (fetches characters.json)', sCellL)],
    [Paragraph('js/game.js', sCellL), Paragraph('Core state, save/load, tick, currencies, stamina, studio, milestones', sCellL)],
    [Paragraph('js/gacha.js', sCellL), Paragraph('Pull logic, rates, pity, featured banner, Fisher-Yates shuffle', sCellL)],
    [Paragraph('js/characters.js', sCellL), Paragraph('Levelling, ascension, shards, variant management', sCellL)],
    [Paragraph('js/minigame.js', sCellL), Paragraph('Super Chat Toss engine (bubbles, boost, scoring)', sCellL)],
    [Paragraph('js/ui.js', sCellL), Paragraph('UI rendering, navigation, pull animation, gallery, studio UI, toasts', sCellL)],
    [Paragraph('data/characters.json', sCellL), Paragraph('319 VTuber entries (name, slug, image, agency, url)', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(files_data, [0.30, 0.70]))
story.append(caption(f'Table {tn}: Project File Structure'))

story.append(h2('12.3 Save/Load System'))
story.append(body(
    'All game state is persisted to the browser\'s localStorage under a single JSON key. The game auto-saves '
    'every 30 seconds and on every significant player action, ensuring minimal data loss. Players can also '
    'manually save via a button in the settings overlay. Export and import functionality allows players to '
    'transfer save data between devices using Base64-encoded save codes. A migration system handles save '
    'version updates, automatically converting old save data to the latest format when the game loads. Error '
    'resilience is built into the initialisation process: a try-catch block on startup catches any corruption '
    'or compatibility issues and displays an error message directing the player to check the browser console, '
    'rather than showing an infinite "Loading..." screen.'
))

story.append(h2('12.4 Game Tick System'))
story.append(body(
    'A 1-second interval game tick runs whenever the game is open, updating resource generation, stamina '
    'recovery, and the user interface. When the player closes the game and returns later, offline earnings '
    'are calculated based on the elapsed time since the last save, with a cap of 12 hours of offline '
    'resource accumulation. This ensures that extended offline periods do not result in excessively large '
    'resource windfalls that could unbalance the game economy. The tick system also handles cooldown timers, '
    'UI refreshes, and any time-dependent game events.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 13: DEVELOPMENT STATUS AND SPRINT PLAN
# ══════════════════════════════════════════════════════════════
story.append(h1('13. Development Status and Sprint Plan'))

story.append(body(
    'The original 9-sprint development plan has been partially completed with significant scope changes. '
    'The first four sprints (Core UI Shell, Gacha Pull System, Collection Gallery, and Studio Room) have '
    'been fully completed, establishing the core gameplay loop. Sprint 5 was reimplemented as Profile and '
    'History (originally planned as Currency and Idle System, but most of that functionality was integrated '
    'into earlier sprints). Sprint 8 (Super Chat Toss) was pulled forward and completed, displacing the '
    'originally planned Polish and Save/Load sprint. The remaining sprints show varying levels of completion.'
))

tn = next_table_num()
sprint_data = [
    [Paragraph('<b>Sprint</b>', sTH), Paragraph('<b>Focus</b>', sTH),
     Paragraph('<b>Status</b>', sTH)],
    [Paragraph('1', sCell), Paragraph('Core UI Shell', sCellL), Paragraph('Completed', sCell)],
    [Paragraph('2', sCell), Paragraph('Gacha Pull System', sCellL), Paragraph('Completed', sCell)],
    [Paragraph('3', sCell), Paragraph('Collection Gallery', sCellL), Paragraph('Completed', sCell)],
    [Paragraph('4', sCell), Paragraph('Studio Room', sCellL), Paragraph('Completed', sCell)],
    [Paragraph('5', sCell), Paragraph('Profile and History', sCellL), Paragraph('Completed / Partial', sCell)],
    [Paragraph('6', sCell), Paragraph('Character Progression', sCellL), Paragraph('Partial', sCell)],
    [Paragraph('7', sCell), Paragraph('Studio Progression', sCellL), Paragraph('Partial', sCell)],
    [Paragraph('8', sCell), Paragraph('Super Chat Toss', sCellL), Paragraph('Completed', sCell)],
    [Paragraph('9', sCell), Paragraph('Cloud Save Sync', sCellL), Paragraph('Not Started', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(sprint_data, [0.10, 0.50, 0.40]))
story.append(caption(f'Table {tn}: Sprint Status Overview'))

story.append(body(
    'Several code review items have been deferred to future sprints. High-priority deferred items include '
    'XSS vulnerabilities in user-facing text (HP-03) and deprecated API usage (HP-05). Medium-priority items '
    'include an auto-backup system (V4-08). Low-priority polish items (LP-01 through LP-05) include various '
    'UI refinements and edge-case handling improvements. These items are documented in the code review '
    'tracker and will be addressed in a dedicated code quality sprint.'
))
story.append(body(
    'Proposed future sprints include Sprint 10 (Code Quality and Security), Sprint 11 (Odekake Going Out '
    'feature requiring Studio Level 10), Sprint 12 (Social Features including leaderboards and friend lists), '
    'and Sprint 13 (Content Updates with new VTuber additions, seasonal events, and limited-time banners). '
    'These sprints represent the long-term development roadmap beyond the initial release, extending the '
    'game\'s content and feature set based on player feedback and community engagement.'
))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 14: CHARACTER DATA
# ══════════════════════════════════════════════════════════════
story.append(h1('14. Character Data'))

story.append(body(
    'The character roster is sourced from hololist.net, which maintains a comprehensive database of '
    'Malaysian VTubers. Each character entry in the data file (characters.json) contains five fields: name, '
    'slug, image URL, agency, and profile URL. The slug serves as a unique identifier used for internal '
    'game logic and save data references, while the image URL points to the character\'s portrait on '
    'hololist.net. The agency field is used for filtering in the Collection Gallery (unlocked at Studio '
    'Level 9) and for display on character cards.'
))

story.append(h2('14.1 Agency Distribution'))
story.append(body(
    'The 319-character roster is heavily weighted toward independent creators, who make up approximately '
    '79.6% of the total roster. This distribution reflects the current state of the Malaysian VTuber '
    'scene, where independent creators form the overwhelming majority. The largest agency represented is '
    'VGakuenLive with 7 members (2.2%), followed by HoloDream with 6 members (1.9%), Slice of Six Crew '
    'with 5 members (1.6%), and AmaiUsagi with 4 members (1.3%). The remaining 43 characters (13.5%) '
    'belong to various smaller agencies and groups.'
))

tn = next_table_num()
agency_data = [
    [Paragraph('<b>Agency</b>', sTH), Paragraph('<b>Count</b>', sTH),
     Paragraph('<b>Percentage</b>', sTH)],
    [Paragraph('Independent', sCell), Paragraph('254', sCell), Paragraph('79.6%', sCell)],
    [Paragraph('VGakuenLive', sCell), Paragraph('7', sCell), Paragraph('2.2%', sCell)],
    [Paragraph('HoloDream', sCell), Paragraph('6', sCell), Paragraph('1.9%', sCell)],
    [Paragraph('Slice of Six Crew', sCell), Paragraph('5', sCell), Paragraph('1.6%', sCell)],
    [Paragraph('AmaiUsagi', sCell), Paragraph('4', sCell), Paragraph('1.3%', sCell)],
    [Paragraph('Others (combined)', sCell), Paragraph('43', sCell), Paragraph('13.5%', sCell)],
    [Paragraph('<b>Total</b>', sCell), Paragraph('<b>319</b>', sCell), Paragraph('<b>100%</b>', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(agency_data, [0.40, 0.25, 0.35]))
story.append(caption(f'Table {tn}: Agency Distribution'))
story.append(hr())

# ══════════════════════════════════════════════════════════════
# SECTION 15: APPENDIX - KEY DATA STRUCTURES
# ══════════════════════════════════════════════════════════════
story.append(h1('15. Appendix: Key Data Structures'))

story.append(body(
    'The game state is stored as a single JSON object in localStorage. Below is the current state structure '
    'showing all top-level fields and their types. This reference is intended for developers working on the '
    'codebase who need to understand the save data format. The structure includes fields for player '
    'resources, character collection, studio configuration, gacha state, minigame statistics, stamina, '
    'milestone tracking, and pull history.'
))

story.append(body(
    'The top-level game state object contains the following fields: <b>stars</b> (number), <b>starDust</b> '
    '(number), <b>starFragments</b> (number), <b>bondPoints</b> (number), <b>gems</b> (number), '
    '<b>characters</b> (object keyed by slug, each with level, variant, shards, and ascension status), '
    '<b>studio</b> (object with level, exp, station assignments and upgrade levels), <b>gacha</b> '
    '(object with pityCounter and lastPullTimestamp), <b>stamina</b> (object with current value and '
    'lastRecoveryTimestamp), <b>minigame</b> (object with highScore, totalRoundsPlayed, and totalStarsEarned), '
    '<b>milestones</b> (array of claimed milestone IDs), <b>pullHistory</b> (array of pull records with '
    'timestamp, banner, and results), <b>lastSave</b> (ISO timestamp), <b>dailyLogin</b> (object with '
    'current streak and lastClaimDate), and <b>version</b> (string indicating save data schema version).'
))
story.append(body(
    'The migration system uses the version field to detect when save data needs to be upgraded. When a player '
    'loads the game with an older save format, the migration code transforms the data to the latest schema '
    'before initialising the game state. This approach ensures backward compatibility and allows the save '
    'format to evolve across releases without requiring players to manually reset their progress.'
))

# ━━ Build ━━
doc.multiBuild(story)
print(f'Body PDF generated: {OUTPUT}')
