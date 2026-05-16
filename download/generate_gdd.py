import sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import hashlib

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')
registerFontFamily('DejaVuMono', normal='DejaVuMono', bold='DejaVuMono')

# ━━ Color Palette (cascade dark mode) ━━
PAGE_BG       = colors.HexColor('#0e0e0c')
SECTION_BG    = colors.HexColor('#222220')
CARD_BG       = colors.HexColor('#1c1b18')
TABLE_STRIPE  = colors.HexColor('#1d1d1a')
HEADER_FILL   = colors.HexColor('#4b4534')
COVER_BLOCK   = colors.HexColor('#474132')
BORDER_CLR    = colors.HexColor('#564f3c')
ICON_CLR      = colors.HexColor('#c5b176')
ACCENT        = colors.HexColor('#896fd9')
ACCENT2       = colors.HexColor('#5dd499')
TEXT_PRI      = colors.HexColor('#f1f1f0')
TEXT_MUT      = colors.HexColor('#908e87')
SUCCESS       = colors.HexColor('#7cb58f')
WARNING       = colors.HexColor('#c19f5d')
ERROR_CLR     = colors.HexColor('#cc837c')
INFO_CLR      = colors.HexColor('#809fbe')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = TEXT_PRI
TABLE_ROW_EVEN     = CARD_BG
TABLE_ROW_ODD      = TABLE_STRIPE

# ━━ Page Setup ━━
PAGE_W, PAGE_H = A4
LEFT_M = 0.9 * inch
RIGHT_M = 0.9 * inch
TOP_M = 0.8 * inch
BOT_M = 0.8 * inch
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M

# ━━ Styles ━━
sH1 = ParagraphStyle('H1', fontName='DejaVuSans', fontSize=20, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT)
sH2 = ParagraphStyle('H2', fontName='DejaVuSans', fontSize=15, leading=20,
    textColor=ICON_CLR, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT)
sH3 = ParagraphStyle('H3', fontName='DejaVuSans', fontSize=12, leading=16,
    textColor=TEXT_PRI, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT)
sBody = ParagraphStyle('Body', fontName='DejaVuSans', fontSize=10.5, leading=17,
    textColor=TEXT_PRI, spaceAfter=6, alignment=TA_JUSTIFY)
sBodyLeft = ParagraphStyle('BodyL', fontName='DejaVuSans', fontSize=10.5, leading=17,
    textColor=TEXT_PRI, spaceAfter=6, alignment=TA_LEFT)
sMuted = ParagraphStyle('Muted', fontName='DejaVuSans', fontSize=9.5, leading=14,
    textColor=TEXT_MUT, spaceAfter=4, alignment=TA_LEFT)
sCaption = ParagraphStyle('Cap', fontName='DejaVuSans', fontSize=9, leading=13,
    textColor=TEXT_MUT, spaceBefore=3, spaceAfter=6, alignment=TA_CENTER)
sHeader = ParagraphStyle('TH', fontName='DejaVuSans', fontSize=10,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER)
sCell = ParagraphStyle('TC', fontName='DejaVuSans', fontSize=9.5,
    textColor=TEXT_PRI, alignment=TA_CENTER, leading=14)
sCellL = ParagraphStyle('TCL', fontName='DejaVuSans', fontSize=9.5,
    textColor=TEXT_PRI, alignment=TA_LEFT, leading=14)

# ━━ Helpers ━━
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

def make_table(data, col_ratios, has_header=True):
    widths = [r * AVAIL_W for r in col_ratios]
    t = Table(data, colWidths=widths, hAlign='CENTER')
    style_cmds = [
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_CLR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if has_header:
        style_cmds.append(('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR))
        style_cmds.append(('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT))
        for i in range(1, len(data)):
            bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━ TOC Doc Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

    def handle_pageBegin(self):
        SimpleDocTemplate.handle_pageBegin(self)
        # dark background on every page
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(PAGE_BG)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.restoreState()

# ━━ Build Document ━━
output_path = '/home/z/my-project/download/MyVT_Gacha_GDD.pdf'

doc = TocDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='MyVT Gacha Collection - Game Design Document',
    author='Eri James / MyVT',
    creator='Z.ai'
)

story = []

# ━━━━ TOC ━━━━
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName='DejaVuSans', fontSize=12, leftIndent=20,
        textColor=ACCENT, spaceBefore=4, spaceAfter=2),
    ParagraphStyle('TOC2', fontName='DejaVuSans', fontSize=10, leftIndent=40,
        textColor=TEXT_PRI, spaceBefore=2, spaceAfter=1),
]
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TOCTitle',
    fontName='DejaVuSans', fontSize=18, textColor=ACCENT, spaceAfter=12, alignment=TA_LEFT)))
story.append(toc)
story.append(PageBreak())

# ━━━━ 1. GAME OVERVIEW ━━━━
story.append(h1('1. Game Overview'))

story.append(body(
    'MyVT Gacha Collection is a browser-based idle gacha collection game themed around '
    'the Malaysian VTuber (MyVT) community. Players collect virtual cards featuring real '
    'Malaysian VTubers by pulling from gacha banners, then manage a virtual studio where '
    'assigned VTubers generate resources passively. The game combines the excitement of '
    'gacha pulls with idle management mechanics, creating an engaging gameplay loop that '
    'rewards both short sessions and long-term dedication.'
))
story.append(body(
    'The game is built entirely with vanilla HTML, CSS, and JavaScript, making it '
    'lightweight, accessible, and hostable on any static web hosting platform such as '
    'GitHub Pages or Neocities. No backend server or database is required; all game state '
    'is persisted using the browser\'s localStorage. The roster of characters is sourced '
    'from hololist.net, which currently lists 319 Malaysian VTubers spanning independent '
    'creators and members of various agencies including VGakuenLive, HoloDream, '
    'MyHolo TV (VILIT), Projek Hikayat, and Phase Connect.'
))
story.append(body(
    'The visual style follows an anime-game aesthetic with a dark theme using purple and '
    'blue accent colours. Character cards feature the VTubers\' portrait images sourced '
    'from hololist, with decorative frames that change based on the card\'s variant tier. '
    'The UI is designed to be responsive, working seamlessly on both desktop browsers and '
    'mobile devices, ensuring that members of the MyVT community can enjoy the game '
    'regardless of their preferred platform.'
))

story.append(h2('1.1 Design Pillars'))
story.append(bullet('- <b>Accessibility</b>: No install required, runs in any modern browser, zero cost to play.'))
story.append(bullet('- <b>Community Celebration</b>: Showcases Malaysian VTubers and raises awareness of the scene.'))
story.append(bullet('- <b>Idle-Friendly</b>: Progress continues even when offline, rewarding regular check-ins.'))
story.append(bullet('- <b>Collection Satisfaction</b>: 319 characters with variant upgrades provide long-term goals.'))
story.append(bullet('- <b>Skill Development</b>: Serves as a learning project for web game development.'))

story.append(h2('1.2 Target Audience'))
story.append(body(
    'The primary audience consists of members of the MyVT community, including VTubers '
    'themselves, their fans, and supporters of the Malaysian VTuber scene. Secondary '
    'audience members include general gacha game enthusiasts and idle game players who may '
    'discover the game through community sharing. The game is designed to be approachable '
    'for newcomers while offering enough depth to retain experienced gacha players. All '
    'text in the game is presented in English, reflecting the multilingual nature of the '
    'Malaysian VTuber community.'
))

# ━━━━ 2. CORE GAME LOOP ━━━━
story.append(h1('2. Core Game Loop'))
story.append(body(
    'The core gameplay loop of MyVT Gacha Collection revolves around a cycle of pulling '
    'characters, assigning them to studio stations, earning resources passively, and '
    'reinvesting those resources to pull more characters and strengthen existing ones. '
    'This loop is designed to be simple enough to understand in seconds but deep enough '
    'to sustain engagement over weeks and months of play.'
))

loop_data = [
    [Paragraph('<b>Step</b>', sHeader), Paragraph('<b>Action</b>', sHeader),
     Paragraph('<b>Description</b>', sHeader)],
    [Paragraph('1', sCell), Paragraph('Pull', sCell),
     Paragraph('Spend Stars on gacha banners to acquire VTuber character cards.', sCellL)],
    [Paragraph('2', sCell), Paragraph('Assign', sCell),
     Paragraph('Place collected characters into Studio Room stations to generate resources.', sCellL)],
    [Paragraph('3', sCell), Paragraph('Earn', sCell),
     Paragraph('Resources accumulate passively (idle), even while the player is offline.', sCellL)],
    [Paragraph('4', sCell), Paragraph('Level Up', sCell),
     Paragraph('Spend Star Dust and Stars to increase character levels, boosting station output.', sCellL)],
    [Paragraph('5', sCell), Paragraph('Ascend', sCell),
     Paragraph('Spend Star Fragments to upgrade Normal cards to SR and SR to SSR variants.', sCellL)],
    [Paragraph('6', sCell), Paragraph('Expand', sCell),
     Paragraph('Upgrade Studio Level to unlock new stations, slots, and future features.', sCellL)],
    [Paragraph('7', sCell), Paragraph('Repeat', sCell),
     Paragraph('Continue pulling to fill collection gaps; aim for 100% SSR completion.', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(loop_data, [0.07, 0.12, 0.81]))
story.append(Paragraph('Table 1: The Seven-Step Core Game Loop', sCaption))

story.append(body(
    'New players begin with 1,000 Stars, enough for approximately 10 single pulls on the '
    'standard banner. This immediate access to gacha pulls is intentional, as it allows '
    'players to experience the core excitement of the game within seconds of starting. '
    'The first few pulls will typically yield Normal variant characters, which the player '
    'can immediately assign to the Stream Room station to begin generating Stars passively. '
    'This establishes the resource generation foundation that fuels the rest of the gameplay loop.'
))

# ━━━━ 3. GACHA PULL SYSTEM ━━━━
story.append(h1('3. Gacha Pull System'))

story.append(h2('3.1 Banner Types'))
story.append(body(
    'The gacha system features two types of banners that players can pull from. The '
    'Standard Banner contains all 319 Malaysian VTubers from the hololist roster, making '
    'it the primary source of new characters. The Featured Banner is a rotating limited-time '
    'banner that highlights 3-4 specific VTubers with increased drop rates, providing '
    'focused collection opportunities for players seeking specific characters.'
))

banner_data = [
    [Paragraph('<b>Banner Type</b>', sHeader), Paragraph('<b>Pool Size</b>', sHeader),
     Paragraph('<b>Featured Characters</b>', sHeader), Paragraph('<b>Rotation</b>', sHeader)],
    [Paragraph('Standard', sCell), Paragraph('319', sCell),
     Paragraph('None (equal rates)', sCellL), Paragraph('Permanent', sCell)],
    [Paragraph('Featured', sCell), Paragraph('319', sCell),
     Paragraph('3-4 rate-up VTubers', sCellL), Paragraph('Weekly', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(banner_data, [0.20, 0.15, 0.35, 0.30]))
story.append(Paragraph('Table 2: Banner Types Overview', sCaption))

story.append(h2('3.2 Pull Rates'))
story.append(body(
    'Each pull yields one character card with a randomly determined variant tier. The variant '
    'system does not affect which character is obtained; rather, it determines the rarity '
    'and visual quality of that character\'s card. This design means that every character is '
    'equally obtainable, and the excitement of pulling comes from the variant tier reveal '
    'rather than character exclusivity.'
))

rates_data = [
    [Paragraph('<b>Variant</b>', sHeader), Paragraph('<b>Drop Rate</b>', sHeader),
     Paragraph('<b>Card Frame</b>', sHeader), Paragraph('<b>Pull Guarantee</b>', sHeader)],
    [Paragraph('Normal', sCell), Paragraph('82%', sCell),
     Paragraph('Grey border, standard art', sCellL), Paragraph('Always obtainable', sCell)],
    [Paragraph('SR', sCell), Paragraph('15%', sCell),
     Paragraph('Silver border with glow, alt art', sCellL), Paragraph('1 per 10x pull', sCell)],
    [Paragraph('SSR', sCell), Paragraph('3%', sCell),
     Paragraph('Gold border with shine, premium art', sCellL), Paragraph('Pity at 50 pulls', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(rates_data, [0.15, 0.15, 0.40, 0.30]))
story.append(Paragraph('Table 3: Pull Rates by Variant Tier', sCaption))

story.append(h2('3.3 Pull Costs'))
pull_cost_data = [
    [Paragraph('<b>Pull Type</b>', sHeader), Paragraph('<b>Cost (Stars)</b>', sHeader),
     Paragraph('<b>Guarantee</b>', sHeader)],
    [Paragraph('Single Pull (1x)', sCell), Paragraph('100', sCell),
     Paragraph('None', sCell)],
    [Paragraph('Multi Pull (10x)', sCell), Paragraph('1,000', sCell),
     Paragraph('At least 1 SR or above', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(pull_cost_data, [0.30, 0.30, 0.40]))
story.append(Paragraph('Table 4: Pull Costs', sCaption))

story.append(h2('3.4 Pity System'))
story.append(body(
    'A pity system ensures that players are guaranteed an SSR variant after 50 consecutive '
    'pulls without obtaining one. The pity counter tracks pulls across all banners and resets '
    'every time an SSR variant is pulled, regardless of which banner it came from. This '
    'prevents excessively unlucky streaks and ensures that dedicated players always make '
    'meaningful progress toward high-tier characters. Additionally, the 10x multi-pull '
    'guarantees at least one SR or above card, providing a reliable floor for multi-pull '
    'investments.'
))

story.append(h2('3.5 Duplicate Handling'))
story.append(body(
    'When a player pulls a character they already own (same character and same variant tier), '
    'the duplicate is converted into Shards specific to that character. Shards serve as a '
    'universal resource that can be exchanged for Star Dust or Star Fragments at a conversion '
    'rate displayed in the in-game shop. If a player already owns a character at SSR tier and '
    'pulls that same character at any tier again, the duplicate is automatically converted '
    'into bonus Stars instead of Shards, providing a meaningful endgame resource sink.'
))

# ━━━━ 4. STUDIO ROOM MANAGEMENT ━━━━
story.append(h1('4. Studio Room Management'))

story.append(body(
    'The Studio Room is the management hub of MyVT Gacha Collection. It is a visual space '
    'where players assign their collected VTuber characters to various Stations, each of '
    'which produces a different type of resource. The Studio provides the idle management '
    'layer that transforms the game from a simple pull simulator into an engaging resource '
    'management experience. Players must strategically decide which characters to assign to '
    'which stations based on their current needs and long-term goals.'
))

story.append(h2('4.1 Station Types'))
story.append(body(
    'Each station represents a different activity that VTubers might engage in, and each '
    'produces a unique resource. Players start with the Stream Room station unlocked and '
    'gradually unlock additional stations by increasing their Studio Level. Every station '
    'can hold exactly one assigned VTuber at a time, and the player may reassign characters '
    'freely with no cooldown or penalty. The output of each station scales with the assigned '
    'character\'s variant tier and level, as well as the station\'s own upgrade level.'
))

station_data = [
    [Paragraph('<b>Station</b>', sHeader), Paragraph('<b>Resource</b>', sHeader),
     Paragraph('<b>Primary Use</b>', sHeader), Paragraph('<b>Unlock</b>', sHeader)],
    [Paragraph('Stream Room', sCell), Paragraph('Stars', sCell),
     Paragraph('Gacha pulls, station upgrades', sCellL), Paragraph('Studio Lv 1', sCell)],
    [Paragraph('Creative Corner', sCell), Paragraph('Star Dust', sCell),
     Paragraph('Character levelling XP', sCellL), Paragraph('Studio Lv 2', sCell)],
    [Paragraph('Practice Hall', sCell), Paragraph('Star Fragments', sCell),
     Paragraph('Ascension material crafting', sCellL), Paragraph('Studio Lv 4', sCell)],
    [Paragraph('Lounge', sCell), Paragraph('Bond Points', sCell),
     Paragraph('Studio Level EXP', sCellL), Paragraph('Studio Lv 6', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(station_data, [0.20, 0.18, 0.37, 0.25]))
story.append(Paragraph('Table 5: Station Types and Their Resources', sCaption))

story.append(h2('4.2 Station Upgrades'))
story.append(body(
    'Each station can be upgraded from Level 1 through Level 5. Upgrading a station '
    'increases its output multiplier, meaning that the same assigned character will '
    'produce more resources per minute at higher station levels. The upgrade costs scale '
    'with each level, requiring increasing amounts of Stars and Star Fragments. The '
    'output multiplier progresses as follows: Level 1 provides a x1 multiplier, Level 2 '
    'provides x1.5, Level 3 provides x2, Level 4 provides x3, and Level 5 provides x5. '
    'This exponential scaling means that maxing out a station is a significant long-term '
    'investment that dramatically increases resource generation.'
))

station_upg_data = [
    [Paragraph('<b>Level</b>', sHeader), Paragraph('<b>Multiplier</b>', sHeader),
     Paragraph('<b>Upgrade Cost (Stars)</b>', sHeader), Paragraph('<b>Upgrade Cost (Fragments)</b>', sHeader)],
    [Paragraph('1', sCell), Paragraph('x1', sCell), Paragraph('(Base)', sCell), Paragraph('(Base)', sCell)],
    [Paragraph('2', sCell), Paragraph('x1.5', sCell), Paragraph('500', sCell), Paragraph('50', sCell)],
    [Paragraph('3', sCell), Paragraph('x2', sCell), Paragraph('2,000', sCell), Paragraph('200', sCell)],
    [Paragraph('4', sCell), Paragraph('x3', sCell), Paragraph('8,000', sCell), Paragraph('800', sCell)],
    [Paragraph('5', sCell), Paragraph('x5', sCell), Paragraph('30,000', sCell), Paragraph('3,000', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(station_upg_data, [0.12, 0.18, 0.35, 0.35]))
story.append(Paragraph('Table 6: Station Upgrade Costs and Multipliers', sCaption))

story.append(h2('4.3 Resource Output Calculation'))
story.append(body(
    'The resource output per minute for any station is determined by the following formula: '
    'Output = Base Rate x Character Variant Multiplier x Character Level Bonus x Station Level '
    'Multiplier. The base rate differs per station type. Character variant multipliers are '
    'x1 for Normal, x2 for SR, and x5 for SSR. The character level bonus is calculated as '
    '1 + (Level x 0.02), meaning a Level 50 character provides a x2 bonus on top of the '
    'variant multiplier. This formula ensures that every aspect of character progression '
    'meaningfully contributes to resource generation, making both pulling and upgrading '
    'feel rewarding.'
))

# ━━━━ 5. CURRENCY SYSTEM ━━━━
story.append(h1('5. Currency System'))

story.append(body(
    'MyVT Gacha Collection features four distinct currencies, each produced by a different '
    'studio station and serving a unique purpose within the game economy. This multi-currency '
    'design ensures that players must engage with all aspects of the game to progress, '
    'preventing the common gacha game problem of a single currency becoming irrelevant '
    'after the early game. Each currency feeds into different progression systems, creating '
    'interdependencies that make the gameplay loop feel cohesive and rewarding.'
))

curr_data = [
    [Paragraph('<b>Currency</b>', sHeader), Paragraph('<b>Symbol</b>', sHeader),
     Paragraph('<b>Source</b>', sHeader), Paragraph('<b>Primary Use</b>', sHeader)],
    [Paragraph('Stars', sCell), Paragraph('*', sCell),
     Paragraph('Stream Room, Daily Login, Duplicate SSR', sCellL), Paragraph('Gacha pulls, Station upgrades', sCellL)],
    [Paragraph('Star Dust', sCell), Paragraph('+', sCell),
     Paragraph('Creative Corner, Shard conversion', sCellL), Paragraph('Character levelling', sCellL)],
    [Paragraph('Star Fragments', sCell), Paragraph('#', sCell),
     Paragraph('Practice Hall, Shard conversion', sCellL), Paragraph('Ascension crafting', sCellL)],
    [Paragraph('Bond Points', sCell), Paragraph('~', sCell),
     Paragraph('Lounge station', sCellL), Paragraph('Studio Level EXP', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(curr_data, [0.16, 0.08, 0.38, 0.38]))
story.append(Paragraph('Table 7: Currency Types, Sources, and Uses', sCaption))

story.append(h2('5.1 Starting Resources'))
story.append(body(
    'New players receive a starting package of 1,000 Stars to immediately begin pulling on '
    'banners. No other currencies are provided at the start; players must progress through '
    'the early game to unlock stations and begin generating secondary currencies. This design '
    'intentionally front-loads the gacha experience, allowing new players to experience the '
    'excitement of pulling within their first minute of gameplay. The 1,000 Star starting '
    'bonus provides enough for 10 single pulls or 1 multi-pull, giving players a meaningful '
    'initial collection to work with.'
))

story.append(h2('5.2 Daily Login Bonus'))
story.append(body(
    'Players receive a Daily Login Bonus of Stars that scales with their consecutive login '
    'streak. The bonus starts at 100 Stars for the first day and increases by 50 Stars per '
    'consecutive day, capping at 500 Stars per day after a 9-day streak. Missing a day '
    'resets the streak to day 1. This system encourages regular engagement without being '
    'overly punitive, as even a single day\'s bonus provides enough for one pull after a '
    'few days of accumulation.'
))

# ━━━━ 6. CHARACTER PROGRESSION ━━━━
story.append(h1('6. Character Progression'))

story.append(body(
    'Characters in MyVT Gacha Collection progress through two interconnected systems: '
    'levelling and ascension. Levelling strengthens a character within its current variant '
    'tier, increasing its resource output when assigned to a station. Ascension upgrades a '
    'character to a higher variant tier (Normal to SR, or SR to SSR), unlocking a new card '
    'frame, new artwork, higher level caps, and significantly increased output multipliers. '
    'Both systems require different currencies, ensuring that players must engage with '
    'multiple station types to fully develop their roster.'
))

story.append(h2('6.1 Character Levelling'))
story.append(body(
    'Each character can be levelled from Level 1 up to a maximum level determined by their '
    'current variant tier. Normal variant characters have a level cap of 20, SR characters '
    'can reach Level 35, and SSR characters can reach Level 50. Levelling requires spending '
    'Star Dust and Stars, with costs scaling based on the target level. Each level increases '
    'the character\'s resource output by approximately 2% (the level bonus formula is '
    '1 + Level x 0.02), making levelling a consistent and predictable investment.'
))

level_data = [
    [Paragraph('<b>Variant</b>', sHeader), Paragraph('<b>Level Cap</b>', sHeader),
     Paragraph('<b>Cost per Level (Star Dust)</b>', sHeader), Paragraph('<b>Cost per Level (Stars)</b>', sHeader)],
    [Paragraph('Normal', sCell), Paragraph('20', sCell), Paragraph('10 + (Lvl x 5)', sCell), Paragraph('20 + (Lvl x 10)', sCell)],
    [Paragraph('SR', sCell), Paragraph('35', sCell), Paragraph('30 + (Lvl x 10)', sCell), Paragraph('50 + (Lvl x 20)', sCell)],
    [Paragraph('SSR', sCell), Paragraph('50', sCell), Paragraph('80 + (Lvl x 20)', sCell), Paragraph('100 + (Lvl x 40)', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(level_data, [0.15, 0.15, 0.35, 0.35]))
story.append(Paragraph('Table 8: Levelling Costs by Variant Tier', sCaption))

story.append(h2('6.2 Character Ascension'))
story.append(body(
    'Ascension is the process of upgrading a character to a higher variant tier. This is '
    'the primary long-term progression goal for each character in the collection. To ascend '
    'a Normal character to SR, the character must be at maximum level (20) and the player '
    'must spend Star Fragments. To ascend an SR character to SSR, the character must be at '
    'its maximum SR level (35) and the player must spend a larger quantity of Star Fragments. '
    'Ascension changes the character\'s card frame, unlocks new artwork, increases the '
    'variant output multiplier, raises the level cap, and increases Studio EXP contribution.'
))

asc_data = [
    [Paragraph('<b>Ascension</b>', sHeader), Paragraph('<b>Required Level</b>', sHeader),
     Paragraph('<b>Cost (Star Fragments)</b>', sHeader), Paragraph('<b>New Level Cap</b>', sHeader)],
    [Paragraph('Normal to SR', sCell), Paragraph('Lv 20', sCell), Paragraph('100', sCell), Paragraph('35', sCell)],
    [Paragraph('SR to SSR', sCell), Paragraph('Lv 35', sCell), Paragraph('500', sCell), Paragraph('50', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(asc_data, [0.25, 0.25, 0.30, 0.20]))
story.append(Paragraph('Table 9: Ascension Requirements', sCaption))

# ━━━━ 7. STUDIO LEVEL & UNLOCKS ━━━━
story.append(h1('7. Studio Level and Feature Unlocks'))

story.append(body(
    'The Studio Level serves as the overarching progression gate for the game. Unlike '
    'character levels or station upgrades, the Studio Level does not directly improve '
    'resource generation rates. Instead, it unlocks new features, stations, and station '
    'slots, providing a structured sense of progression that guides players through the '
    'game\'s systems at a measured pace. Studio EXP is earned passively from assigned '
    'characters in stations, with SSR characters contributing more EXP than SR, and SR '
    'contributing more than Normal. The Studio Level ensures that new players are not '
    'overwhelmed by too many systems at once while providing experienced players with '
    'clear goals to work toward.'
))

studio_data = [
    [Paragraph('<b>Studio Lv</b>', sHeader), Paragraph('<b>Unlocks</b>', sHeader),
     Paragraph('<b>EXP Required</b>', sHeader)],
    [Paragraph('1', sCell), Paragraph('Stream Room + 2 station slots (starting state)', sCellL), Paragraph('0', sCell)],
    [Paragraph('2', sCell), Paragraph('Creative Corner station unlocked', sCellL), Paragraph('200', sCell)],
    [Paragraph('3', sCell), Paragraph('3rd station slot', sCellL), Paragraph('600', sCell)],
    [Paragraph('4', sCell), Paragraph('Practice Hall station unlocked', sCellL), Paragraph('1,500', sCell)],
    [Paragraph('5', sCell), Paragraph('4th station slot', sCellL), Paragraph('3,500', sCell)],
    [Paragraph('6', sCell), Paragraph('Lounge station unlocked', sCellL), Paragraph('7,000', sCell)],
    [Paragraph('7', sCell), Paragraph('Character detail stats in gallery', sCellL), Paragraph('12,000', sCell)],
    [Paragraph('8', sCell), Paragraph('5th station slot', sCellL), Paragraph('20,000', sCell)],
    [Paragraph('9', sCell), Paragraph('Collection filter by agency', sCellL), Paragraph('35,000', sCell)],
    [Paragraph('10', sCell), Paragraph('Odekake (Going Out) feature unlocked', sCellL), Paragraph('60,000', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(studio_data, [0.15, 0.55, 0.30]))
story.append(Paragraph('Table 10: Studio Level Progression and Unlocks', sCaption))

story.append(h2('7.1 Future Feature: Odekake (Going Out)'))
story.append(body(
    'At Studio Level 10, players unlock the Odekake feature, inspired by the training '
    'camp system in Uma Musume. Odekake allows players to send a character on a timed '
    '"outing" lasting between 1 and 4 hours. During this time, the character cannot be '
    'assigned to any station. When the outing concludes, the character returns with Bond '
    'Points, Studio EXP, and occasionally rare crafting materials. Repeated outings with '
    'the same character build a Bond Level, which unlocks character-specific bonuses such '
    'as increased output multipliers or reduced ascension costs. This feature adds an '
    'emotional attachment layer to the game, encouraging players to invest in their '
    'favourite characters beyond mere numerical optimization.'
))

# ━━━━ 8. COLLECTION GALLERY ━━━━
story.append(h1('8. Collection Gallery'))

story.append(body(
    'The Collection Gallery is the player\'s visual archive of all 319 Malaysian VTubers '
    'in the game. It displays every character as a card in a responsive grid layout, with '
    'distinct visual indicators showing which characters the player owns, which variant '
    'tiers they have obtained, and which characters remain undiscovered. The gallery serves '
    'as both a progress tracker and a showcase of the player\'s collection achievements.'
))

story.append(h2('8.1 Gallery Features'))
story.append(bullet('- <b>Grid View</b>: All 319 characters displayed as cards with portrait images from hololist.net.'))
story.append(bullet('- <b>Ownership Filter</b>: Filter to show Owned only, Unowned only, or All characters.'))
story.append(bullet('- <b>Agency Filter</b>: Filter by agency (Independent, VGakuenLive, VILIT, etc.). Unlocked at Studio Level 9.'))
story.append(bullet('- <b>Variant Filter</b>: Filter by highest owned variant (Normal, SR, SSR).'))
story.append(bullet('- <b>Character Detail Popup</b>: Click any card to view full details including all owned variants, current level, ascension status, and stat breakdown.'))
story.append(bullet('- <b>Collection Completion</b>: Percentage tracker showing overall completion and per-variant completion (e.g., 45/319 SSR, 120/319 SR, 280/319 Normal).'))

# ━━━━ 9. UI/UX DESIGN ━━━━
story.append(h1('9. UI/UX Design'))

story.append(h2('9.1 Visual Theme'))
story.append(body(
    'The game uses a dark theme with purple and blue accent colours, following the visual '
    'language common in anime-style gacha games. The primary background is a deep dark grey '
    '(approximately #0e0e0c), with card backgrounds in slightly lighter tones to create '
    'visual depth. Purple accents (#896fd9) are used for interactive elements, headers, '
    'and SSR indicators, while teal/green accents (#5dd499) highlight positive feedback '
    'such as resource gains and collection milestones. Gold tones are reserved for SSR-tier '
    'elements to convey rarity and premium quality.'
))

story.append(h2('9.2 Navigation'))
story.append(body(
    'The user interface employs a tab-based navigation system with four primary sections: '
    'Home, Pull, Collection, and Studio. A persistent top navigation bar displays these '
    'tabs along with the player\'s current resource counts (Stars, Star Dust, Star '
    'Fragments, Bond Points) for quick reference. The navigation is designed to be thumb-'
    'friendly on mobile devices, with tabs positioned at the bottom of the screen on '
    'narrow viewports and at the top on wider screens. A profile/stats overlay is accessible '
    'from a settings icon in the navigation bar.'
))

nav_data = [
    [Paragraph('<b>Tab</b>', sHeader), Paragraph('<b>Content</b>', sHeader),
     Paragraph('<b>Key Interactions</b>', sHeader)],
    [Paragraph('Home', sCell),
     Paragraph('Player stats, daily login, offline earnings collection, studio overview', sCellL),
     Paragraph('Claim offline earnings, view progress summary', sCellL)],
    [Paragraph('Pull', sCell),
     Paragraph('Gacha banner selection, pull animation, result display', sCellL),
     Paragraph('Single/multi pull, banner switching, pull history', sCellL)],
    [Paragraph('Collection', sCell),
     Paragraph('Character gallery grid with filters', sCellL),
     Paragraph('Filter, sort, view character details', sCellL)],
    [Paragraph('Studio', sCell),
     Paragraph('Studio Room with station slots and assignment interface', sCellL),
     Paragraph('Assign/reassign characters, upgrade stations', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(nav_data, [0.12, 0.44, 0.44]))
story.append(Paragraph('Table 11: Navigation Tabs and Their Content', sCaption))

story.append(h2('9.3 Card Design'))
story.append(body(
    'Character cards are the central visual element of the game. Each card displays the '
    'VTuber\'s portrait image from hololist.net, their name, agency, and variant tier badge. '
    'The card frame changes based on variant tier: Normal cards have a simple grey border, '
    'SR cards feature a silver border with a subtle glow effect, and SSR cards display a '
    'gold border with an animated shine effect. Cards are sized at approximately 120x160 '
    'pixels in the gallery grid and scale up to 200x280 pixels in pull results and detail '
    'views. The pull animation features a card flip reveal, where the card starts face-down '
    'and flips to reveal the character with a brief particle burst effect for SR and SSR pulls.'
))

story.append(h2('9.4 Responsive Design'))
story.append(body(
    'The game is designed to be fully responsive, adapting seamlessly to screen sizes from '
    '320px mobile screens to 1920px desktop displays. On mobile, the gallery grid displays '
    '3 cards per row with a bottom tab bar for navigation. On tablet, the grid expands to '
    '4-5 cards per row with a side tab bar. On desktop, the grid can display up to 8 cards '
    'per row with a horizontal top navigation bar. The Studio Room layout also adapts, '
    'showing stations in a vertical stack on mobile and a 2x2 grid on desktop. All interactive '
    'elements are sized with touch targets of at least 44x44 pixels to ensure comfortable '
    'mobile interaction.'
))

# ━━━━ 10. TECHNICAL ARCHITECTURE ━━━━
story.append(h1('10. Technical Architecture'))

story.append(h2('10.1 Technology Stack'))
story.append(body(
    'The game is built entirely with vanilla web technologies: HTML5 for structure, CSS3 '
    'for styling and animations, and JavaScript (ES6+) for game logic. No frameworks, '
    'libraries, or build tools are required, making the project accessible to developers '
    'of all skill levels and easy to deploy on any static hosting platform. The only '
    'external dependency is the character portrait images hosted on hololist.net, which are '
    'loaded dynamically via URLs stored in the game\'s character data file.'
))

tech_data = [
    [Paragraph('<b>Technology</b>', sHeader), Paragraph('<b>Purpose</b>', sHeader),
     Paragraph('<b>Rationale</b>', sHeader)],
    [Paragraph('HTML5', sCell), Paragraph('Page structure and semantic markup', sCellL),
     Paragraph('Universal browser support, no build step', sCellL)],
    [Paragraph('CSS3', sCell), Paragraph('Styling, animations, responsive layout', sCellL),
     Paragraph('Card flip animations, dark theme, media queries', sCellL)],
    [Paragraph('JavaScript ES6+', sCell), Paragraph('Game logic, state management, DOM manipulation', sCellL),
     Paragraph('No framework overhead, full control', sCellL)],
    [Paragraph('localStorage', sCell), Paragraph('Client-side persistence', sCellL),
     Paragraph('No backend required, instant save/load', sCellL)],
    [Paragraph('JSON', sCell), Paragraph('Character roster data format', sCellL),
     Paragraph('Human-readable, easy to update roster', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(tech_data, [0.20, 0.40, 0.40]))
story.append(Paragraph('Table 12: Technology Stack', sCaption))

story.append(h2('10.2 File Structure'))
story.append(body(
    'The project follows a clean, modular file structure that separates concerns for '
    'maintainability and readability. Each JavaScript file handles a distinct area of '
    'game functionality, and the character data is stored in a separate JSON file that '
    'can be updated independently of the game logic. This structure is designed to be '
    'approachable for developers learning web game development, with clear file names '
    'that indicate each file\'s purpose.'
))

files_data = [
    [Paragraph('<b>File</b>', sHeader), Paragraph('<b>Purpose</b>', sHeader)],
    [Paragraph('index.html', sCellL), Paragraph('Main game page, loads all scripts and stylesheets', sCellL)],
    [Paragraph('css/style.css', sCellL), Paragraph('All styles: dark theme, card frames, animations, responsive', sCellL)],
    [Paragraph('js/data.js', sCellL), Paragraph('Character roster data loader from JSON', sCellL)],
    [Paragraph('js/game.js', sCellL), Paragraph('Core game state, save/load, tick loop, currency calculations', sCellL)],
    [Paragraph('js/gacha.js', sCellL), Paragraph('Pull logic, rate calculation, pity system, duplicate handling', sCellL)],
    [Paragraph('js/studio.js', sCellL), Paragraph('Station assignment, upgrades, resource output calculation', sCellL)],
    [Paragraph('js/characters.js', sCellL), Paragraph('Levelling, ascension, shard conversion, variant management', sCellL)],
    [Paragraph('js/ui.js', sCellL), Paragraph('DOM rendering, tab navigation, pull animations, gallery grid', sCellL)],
    [Paragraph('data/characters.json', sCellL), Paragraph('319 VTuber entries with name, image URL, agency, slug', sCellL)],
]
story.append(Spacer(1, 12))
story.append(make_table(files_data, [0.30, 0.70]))
story.append(Paragraph('Table 13: Project File Structure', sCaption))

story.append(h2('10.3 Save/Load System'))
story.append(body(
    'All game state is persisted to the browser\'s localStorage under a single JSON key. '
    'The save data includes the player\'s owned characters (with variant, level, and '
    'shard counts), currency balances, station assignments and upgrade levels, Studio Level '
    'and EXP, pity counter, daily login streak, last online timestamp (for offline earnings '
    'calculation), and profile statistics (total pulls, highest SSR streak, collection '
    'completion). The game auto-saves every 30 seconds and on every meaningful action (pull, '
    'level up, ascension, station change). A manual save button is also available. On load, '
    'the game calculates offline earnings based on the time elapsed since the last save and '
    'presents the accumulated resources to the player.'
))

story.append(h2('10.4 Game Tick System'))
story.append(body(
    'A core game tick runs every second when the game is open, updating resource counters, '
    'calculating per-second income from all assigned stations, and updating the UI. When '
    'the game is closed, the last known timestamp is saved. Upon reopening, the game '
    'calculates the total offline earnings by multiplying the elapsed time (in seconds) '
    'by the per-second income rate and presents the result to the player as an "Offline '
    'Earnings" popup. Offline earnings are capped at a maximum of 12 hours to prevent '
    'excessive accumulation during extended absences, encouraging regular check-ins while '
    'still rewarding intermittent players.'
))

# ━━━━ 11. CHARACTER DATA ━━━━
story.append(h1('11. Character Data'))

story.append(body(
    'The character roster is sourced from hololist.net, a comprehensive VTuber directory '
    'that lists 319 Malaysian VTubers as of the data extraction date. Each character entry '
    'includes their name, a unique slug identifier, a portrait image URL hosted on '
    'hololist.net, their agency affiliation, and a link to their hololist profile page. '
    'The data is stored in a JSON file (characters.json) that is loaded by the game at '
    'startup. This file can be easily updated to add new VTubers or modify existing entries '
    'without changing any game code.'
))

story.append(h2('11.1 Data Schema'))
story.append(body(
    'Each character in the JSON file follows a consistent schema structure. The name field '
    'contains the VTuber\'s display name as listed on hololist. The slug is a URL-friendly '
    'identifier derived from the name, used as a unique key for tracking ownership and '
    'progression. The image field contains the full URL to the VTuber\'s 300x300 portrait '
    'image on hololist.net. The agency field indicates their current affiliation, with '
    '"Independent" being the most common value (254 of 319 characters). The url field '
    'provides a direct link to the character\'s full hololist profile for players who '
    'want to learn more about a specific VTuber.'
))

story.append(h2('11.2 Agency Distribution'))
agency_data = [
    [Paragraph('<b>Agency</b>', sHeader), Paragraph('<b>Count</b>', sHeader),
     Paragraph('<b>Percentage</b>', sHeader)],
    [Paragraph('Independent', sCell), Paragraph('254', sCell), Paragraph('79.6%', sCell)],
    [Paragraph('VGakuenLive', sCell), Paragraph('7', sCell), Paragraph('2.2%', sCell)],
    [Paragraph('HoloDream', sCell), Paragraph('6', sCell), Paragraph('1.9%', sCell)],
    [Paragraph('Slice of Six Crew', sCell), Paragraph('5', sCell), Paragraph('1.6%', sCell)],
    [Paragraph('AmaiUsagi', sCell), Paragraph('4', sCell), Paragraph('1.3%', sCell)],
    [Paragraph('Others (37 agencies)', sCell), Paragraph('43', sCell), Paragraph('13.5%', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(agency_data, [0.45, 0.25, 0.30]))
story.append(Paragraph('Table 14: VTuber Agency Distribution (Top 5 + Others)', sCaption))

# ━━━━ 12. SPRINT DEVELOPMENT PLAN ━━━━
story.append(h1('12. Sprint Development Plan'))

story.append(body(
    'Development is organized into 8 sprints, each focusing on a self-contained feature '
    'area. Each sprint produces a playable, testable increment of the game. The sprints '
    'are ordered to build foundational systems first and progressively add complexity. '
    'After each sprint, a preview build will be provided for review and feedback. The '
    'estimated complexity ratings (Low, Medium, High) reflect the technical difficulty '
    'and scope of each sprint, helping to set expectations for review timelines.'
))

sprint_data = [
    [Paragraph('<b>Sprint</b>', sHeader), Paragraph('<b>Feature</b>', sHeader),
     Paragraph('<b>Deliverables</b>', sHeader), Paragraph('<b>Complexity</b>', sHeader)],
    [Paragraph('1', sCell), Paragraph('Core UI Shell', sCellL),
     Paragraph('Navigation tabs, dark theme, responsive layout, data loading', sCellL),
     Paragraph('Low', sCell)],
    [Paragraph('2', sCell), Paragraph('Gacha Pull System', sCellL),
     Paragraph('Banner UI, pull logic, rates, pity, card flip animation', sCellL),
     Paragraph('Medium', sCell)],
    [Paragraph('3', sCell), Paragraph('Collection Gallery', sCellL),
     Paragraph('Character grid, filters, detail popup, completion tracker', sCellL),
     Paragraph('Medium', sCell)],
    [Paragraph('4', sCell), Paragraph('Studio Room', sCellL),
     Paragraph('Station UI, character assignment, resource output display', sCellL),
     Paragraph('Medium', sCell)],
    [Paragraph('5', sCell), Paragraph('Currency and Idle System', sCellL),
     Paragraph('4 currencies, tick loop, offline earnings, daily login', sCellL),
     Paragraph('Medium', sCell)],
    [Paragraph('6', sCell), Paragraph('Character Progression', sCellL),
     Paragraph('Levelling, ascension, shard system, variant upgrades', sCellL),
     Paragraph('High', sCell)],
    [Paragraph('7', sCell), Paragraph('Studio Progression', sCellL),
     Paragraph('Studio levels, feature unlocks, station upgrades', sCellL),
     Paragraph('Medium', sCell)],
    [Paragraph('8', sCell), Paragraph('Polish and Save/Load', sCellL),
     Paragraph('Auto-save, manual save, stats, import/export, bug fixes', sCellL),
     Paragraph('Low', sCell)],
]
story.append(Spacer(1, 12))
story.append(make_table(sprint_data, [0.08, 0.22, 0.52, 0.18]))
story.append(Paragraph('Table 15: Sprint Development Plan', sCaption))

story.append(h2('12.1 Development Workflow'))
story.append(body(
    'Each sprint follows a consistent workflow: (1) the AI agent implements the sprint\'s '
    'features based on this GDD, (2) a preview build is deployed for testing, (3) feedback '
    'is collected and addressed, and (4) the sprint is marked complete. The game owner '
    'reviews each preview build and provides feedback via simple commands such as "looks '
    'good" to approve or "change X" to request modifications. This lightweight review '
    'process ensures quality oversight without requiring deep technical involvement from '
    'the game owner, who can focus on design direction and player experience feedback.'
))

# ━━━━ 13. APPENDIX: DATA STRUCTURES ━━━━
story.append(h1('13. Appendix: Key Data Structures'))

story.append(h2('13.1 Game State Object'))
story.append(body(
    'The following represents the top-level structure of the game state object that is '
    'serialized to localStorage. All nested objects follow the same pattern of storing '
    'character data keyed by their unique slug identifier.'
))

story.append(muted(
    '{<br/>'
    '&nbsp;&nbsp;"version": 1,<br/>'
    '&nbsp;&nbsp;"currencies": { "stars": 1000, "starDust": 0, "starFragments": 0, "bondPoints": 0 },<br/>'
    '&nbsp;&nbsp;"characters": {<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;"eri-james": { "owned": true, "variants": ["normal"], "level": 1, "shards": 0 },<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;...<br/>'
    '&nbsp;&nbsp;},<br/>'
    '&nbsp;&nbsp;"studio": {<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;"level": 1, "exp": 0,<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;"stations": {<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"streamRoom": { "level": 1, "assigned": null },<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
    '&nbsp;&nbsp;},<br/>'
    '&nbsp;&nbsp;"stats": { "totalPulls": 0, "ssrStreak": 0, "lastOnline": 1778900000 },<br/>'
    '&nbsp;&nbsp;"dailyLogin": { "streak": 0, "lastClaim": "2026-05-16" }<br/>'
    '}'
))

# ━━━━ BUILD ━━━━
doc.multiBuild(story)
print(f"GDD PDF generated: {output_path}")
