"""Generate Budget Dungeon pixel-art sprites as pixel-art-skill JSON.

Every sprite is drawn with shape primitives on one shared palette, then a
1px outline and a ground shadow are added automatically.

Usage: python3 build_sprites.py  -> writes json/*.json
"""

import json
from pathlib import Path

PALETTE = {
    "bg": None,
    "outline": "#1A1423",
    "purple": "#1F3FD8",
    "purple_dark": "#1733B5",
    "purple_light": "#8FA3FF",
    "gold": "#F2C14E",
    "gold_dark": "#C48A1C",
    "gold_light": "#FFE9A3",
    "red": "#E4572E",
    "red_dark": "#A33420",
    "green": "#6CC551",
    "green_dark": "#3D8A34",
    "skin": "#F5C9A0",
    "skin_dark": "#D39A6E",
    "stone": "#3B4458",
    "stone_light": "#5B6680",
    "white": "#F4F1EA",
    "shadow": "#120E19",
}

OUT = Path(__file__).parent / "json"


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [["bg"] * w for _ in range(h)]

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c

    def rect(self, x1, y1, x2, y2, c):
        for y in range(y1, y2 + 1):
            for x in range(x1, x2 + 1):
                self.px(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1:
                    self.px(x, y, c)

    def circle(self, cx, cy, r, c):
        self.ellipse(cx, cy, r, r, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def tri(self, apex_x, apex_y, base_y, half, c):
        """Isosceles triangle pointing up, apex at top."""
        for y in range(apex_y, base_y + 1):
            t = (y - apex_y) / max(1, base_y - apex_y)
            hw = round(half * t)
            self.rect(apex_x - hw, y, apex_x + hw, y, c)

    def mirror(self):
        """Copy left half onto right half."""
        for y in range(self.h):
            for x in range(self.w // 2):
                self.g[y][self.w - 1 - x] = self.g[y][x]

    def outline(self):
        filled = [[c not in ("bg", "shadow") for c in row] for row in self.g]
        for y in range(self.h):
            for x in range(self.w):
                if filled[y][x]:
                    continue
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < self.w and 0 <= ny < self.h and filled[ny][nx]:
                        self.g[y][x] = "outline"
                        break

    def ground_shadow(self, cx, cy, rx):
        for y in range(cy, cy + 2):
            for x in range(cx - rx, cx + rx + 1):
                if 0 <= x < self.w and 0 <= y < self.h and self.g[y][x] == "bg":
                    if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy - 0.5) / 1.5) ** 2 <= 1:
                        self.g[y][x] = "shadow"

    def shifted(self, dy):
        """Copy with non-shadow content moved by dy (for idle bob frames)."""
        out = Canvas(self.w, self.h)
        for y in range(self.h):
            for x in range(self.w):
                c = self.g[y][x]
                if c == "shadow":
                    out.g[y][x] = c
        for y in range(self.h):
            for x in range(self.w):
                c = self.g[y][x]
                if c != "shadow" and c != "bg":
                    out.px(x, y + dy, c)
        return out


def finish(c, shadow=None):
    c.outline()
    if shadow:
        c.ground_shadow(*shadow)
    return c


# ---------- heroes (32x32) ----------

def face(c, cx, cy, eye="outline"):
    c.circle(cx, cy, 5, "skin")
    c.rect(cx - 5, cy + 2, cx + 5, cy + 3, "skin")
    c.rect(cx + 3, cy - 2, cx + 5, cy + 4, "skin_dark")  # right-side shade
    c.rect(cx - 2, cy, cx - 2, cy + 1, eye)
    c.rect(cx + 2, cy, cx + 2, cy + 1, eye)
    c.rect(cx - 1, cy + 3, cx + 1, cy + 3, "skin_dark")


def legs(c, top, colour="stone", shoe="outline"):
    c.rect(12, top, 14, 27, colour)
    c.rect(17, top, 19, 27, colour)
    c.rect(11, 28, 14, 28, shoe)
    c.rect(17, 28, 20, 28, shoe)


def scholar():
    c = Canvas(32, 32)
    legs(c, 22)
    c.rect(10, 13, 21, 22, "purple")          # hoodie
    c.rect(18, 13, 21, 22, "purple_dark")
    c.rect(11, 13, 12, 18, "purple_light")
    c.rect(14, 13, 17, 15, "white")           # collar
    c.rect(7, 15, 9, 21, "purple")            # arm
    c.rect(22, 15, 24, 21, "purple_dark")
    c.rect(4, 17, 9, 23, "red")               # book
    c.rect(5, 18, 8, 22, "red_dark")
    c.rect(4, 17, 4, 23, "white")
    face(c, 16, 9)
    c.rect(10, 2, 21, 5, "outline")           # hair
    c.rect(10, 6, 11, 8, "outline")
    c.rect(11, 3, 12, 6, "outline")
    for gx in (12, 17):                        # round glasses, eyes visible
        c.rect(gx, 8, gx + 3, 8, "gold_dark")
        c.rect(gx, 11, gx + 3, 11, "gold_dark")
        c.rect(gx, 9, gx, 10, "gold_dark")
        c.rect(gx + 3, 9, gx + 3, 10, "gold_dark")
    c.rect(16, 9, 16, 9, "gold_dark")          # bridge
    c.rect(14, 1, 17, 1, "purple_dark")       # grad cap tassel
    c.rect(9, 0, 22, 1, "purple_dark")
    c.rect(22, 1, 22, 4, "gold")
    return finish(c, (16, 29, 8))


def freelancer():
    c = Canvas(32, 32)
    legs(c, 22, "purple_dark")
    c.rect(10, 13, 21, 22, "stone_light")     # hoodie
    c.rect(18, 13, 21, 22, "stone")
    c.rect(14, 13, 17, 15, "white")
    c.rect(7, 15, 9, 20, "stone_light")
    c.rect(22, 15, 24, 20, "stone")
    c.rect(6, 19, 25, 20, "stone")            # laptop base
    c.rect(8, 13, 23, 18, "outline")          # laptop lid (back)
    c.rect(9, 14, 22, 17, "stone_light")
    c.rect(15, 15, 16, 16, "gold")            # logo
    face(c, 16, 8)
    c.rect(10, 1, 21, 3, "red_dark")          # beanie
    c.rect(10, 4, 21, 4, "red")
    c.rect(15, 0, 16, 0, "red")
    c.rect(9, 6, 9, 10, "outline")            # headphones
    c.rect(22, 6, 22, 10, "outline")
    c.rect(8, 7, 9, 10, "purple")
    c.rect(22, 7, 23, 10, "purple")
    return finish(c, (16, 29, 8))


def home_cook():
    c = Canvas(32, 32)
    legs(c, 22)
    c.rect(10, 13, 21, 22, "white")           # chef jacket
    c.rect(18, 13, 21, 22, "stone_light")
    c.rect(12, 15, 19, 22, "gold")            # apron
    c.rect(17, 15, 19, 22, "gold_dark")
    c.rect(15, 13, 16, 14, "outline")         # buttons
    c.rect(7, 15, 9, 20, "white")
    c.rect(22, 15, 24, 20, "stone_light")
    c.rect(24, 17, 29, 18, "outline")         # pan handle
    c.ellipse(27, 15, 3, 2, "stone")          # pan
    c.rect(26, 14, 28, 14, "gold")            # egg yolk
    c.rect(25, 13, 29, 13, "white")
    face(c, 16, 9)
    c.rect(10, 4, 21, 5, "white")             # chef hat band
    c.circle(12, 2, 2, "white")
    c.circle(16, 1, 2, "white")
    c.circle(20, 2, 2, "white")
    c.rect(18, 3, 21, 5, "stone_light")
    return finish(c, (16, 29, 8))


# ---------- monsters (32x32) ----------

def impulse_goblin():
    c = Canvas(32, 32)
    c.rect(12, 23, 14, 27, "green_dark")      # legs
    c.rect(17, 23, 19, 27, "green_dark")
    c.rect(11, 28, 14, 28, "outline")
    c.rect(17, 28, 20, 28, "outline")
    c.rect(11, 15, 20, 23, "purple_dark")     # tunic
    c.circle(16, 10, 6, "green")              # head
    c.rect(19, 7, 22, 14, "green_dark")
    c.tri(6, 6, 10, 2, "green")               # ears
    c.tri(26, 6, 10, 2, "green_dark")
    c.rect(12, 9, 14, 10, "gold")             # greedy eyes
    c.rect(18, 9, 20, 10, "gold")
    c.rect(13, 9, 13, 10, "outline")
    c.rect(19, 9, 19, 10, "outline")
    c.rect(13, 13, 19, 13, "outline")         # grin
    c.rect(14, 13, 14, 13, "white")
    c.rect(18, 13, 18, 13, "white")
    c.rect(22, 15, 23, 21, "green")           # arm to bag
    c.rect(22, 17, 29, 26, "purple")          # shopping bag
    c.rect(26, 17, 29, 26, "purple_dark")
    c.line(23, 17, 25, 14, "outline")         # bag handle
    c.line(25, 14, 27, 17, "outline")
    c.rect(24, 20, 27, 22, "gold")            # "SALE" tag
    c.rect(8, 15, 10, 20, "green")            # other arm holding coin
    c.circle(7, 21, 2, "gold")
    return finish(c, (16, 29, 9))


def subscription_slime():
    c = Canvas(32, 32)
    c.ellipse(16, 20, 11, 8, "green")
    c.rect(5, 22, 27, 27, "green")
    c.ellipse(16, 12, 6, 5, "green")
    c.rect(19, 13, 27, 27, "green_dark")      # shaded side
    c.ellipse(11, 16, 2, 3, "white")          # shine
    c.rect(11, 19, 13, 21, "outline")         # eyes
    c.rect(19, 19, 21, 21, "outline")
    c.rect(11, 19, 11, 19, "white")
    c.rect(19, 19, 19, 19, "white")
    c.rect(14, 24, 18, 24, "outline")         # mouth
    c.circle(16, 6, 3, "gold")                # renewal coin on top
    c.rect(16, 4, 16, 8, "gold_dark")
    c.rect(24, 8, 27, 8, "purple_light")      # "repeat" arrows
    c.rect(27, 8, 27, 11, "purple_light")
    c.rect(26, 11, 27, 11, "purple_light")
    c.rect(5, 26, 6, 28, "green_dark")        # drip
    return finish(c, (16, 29, 11))


def craving_wraith():
    c = Canvas(32, 32)
    # ghost tail
    c.ellipse(16, 18, 8, 7, "white")
    for x, top in ((9, 24), (13, 26), (17, 24), (21, 26)):
        c.rect(x, 20, x + 2, top, "white")
    c.rect(20, 14, 24, 25, "purple_light")
    # burger head
    c.ellipse(16, 6, 9, 4, "gold_dark")       # top bun
    c.rect(7, 6, 25, 8, "gold_dark")
    c.rect(10, 3, 11, 3, "white")             # sesame
    c.rect(15, 2, 16, 2, "white")
    c.rect(20, 3, 21, 3, "white")
    c.rect(6, 9, 26, 9, "green")              # lettuce
    c.rect(7, 10, 25, 11, "red_dark")         # patty
    c.rect(6, 12, 26, 12, "gold")             # cheese
    c.rect(8, 13, 24, 14, "gold_dark")        # bottom bun
    # face on the ghost
    c.rect(12, 17, 13, 19, "outline")
    c.rect(19, 17, 20, 19, "outline")
    c.ellipse(16, 22, 2, 1, "outline")
    c.rect(7, 18, 8, 21, "white")             # reaching arms
    c.rect(24, 18, 25, 21, "purple_light")
    return finish(c, (16, 29, 8))


def grab_golem():
    c = Canvas(32, 32)
    c.rect(9, 24, 13, 27, "stone")            # legs
    c.rect(18, 24, 22, 27, "stone")
    c.rect(8, 28, 13, 28, "outline")
    c.rect(18, 28, 23, 28, "outline")
    c.rect(7, 11, 24, 24, "gold")             # taxi body
    c.rect(19, 11, 24, 24, "gold_dark")
    c.rect(7, 18, 24, 19, "outline")          # checker stripe
    for x in range(8, 24, 2):
        c.px(x, 18, "white")
        c.px(x + 1, 19, "white")
    c.rect(10, 5, 21, 11, "gold")             # cab / head
    c.rect(18, 5, 21, 11, "gold_dark")
    c.rect(11, 7, 20, 9, "stone_light")       # windscreen = visor
    c.rect(12, 8, 13, 8, "red")               # glowing eyes
    c.rect(18, 8, 19, 8, "red")
    c.rect(13, 2, 18, 4, "white")             # taxi sign
    c.rect(14, 3, 17, 3, "green")
    c.rect(3, 12, 6, 20, "gold")              # arms
    c.rect(25, 12, 28, 20, "gold_dark")
    c.circle(4, 22, 2, "stone")               # wheel fists
    c.circle(27, 22, 2, "stone")
    c.rect(4, 22, 4, 22, "stone_light")
    c.rect(27, 22, 27, 22, "stone_light")
    c.rect(9, 21, 11, 22, "white")            # headlights
    c.rect(20, 21, 22, 22, "white")
    return finish(c, (16, 29, 10))


def boredom_imp():
    c = Canvas(32, 32)
    c.rect(13, 24, 14, 27, "red_dark")        # legs
    c.rect(18, 24, 19, 27, "red_dark")
    c.ellipse(16, 20, 5, 5, "red")            # body
    c.rect(19, 17, 21, 24, "red_dark")
    c.circle(16, 11, 6, "red")                # head
    c.rect(19, 8, 22, 15, "red_dark")
    c.tri(11, 2, 6, 1, "outline")             # horns
    c.tri(21, 2, 6, 1, "outline")
    c.rect(12, 11, 14, 11, "outline")         # half-closed bored eyes
    c.rect(18, 11, 20, 11, "outline")
    c.rect(12, 10, 14, 10, "red_dark")
    c.rect(18, 10, 20, 10, "red_dark")
    c.rect(14, 14, 18, 14, "outline")         # flat mouth
    c.line(21, 22, 27, 18, "red_dark")        # tail
    c.tri(27, 15, 18, 1, "red_dark")
    c.rect(4, 17, 10, 26, "stone_light")      # phone
    c.rect(5, 18, 9, 24, "purple_light")
    c.rect(6, 20, 8, 22, "white")             # "scrolling" glyph
    c.rect(10, 19, 12, 21, "red")             # arm
    c.rect(24, 3, 27, 3, "white")             # zZ
    c.line(27, 3, 24, 6, "white")
    c.rect(24, 6, 27, 6, "white")
    return finish(c, (16, 29, 7))


def textbook_troll():
    c = Canvas(32, 32)
    c.rect(9, 23, 13, 27, "green_dark")       # legs
    c.rect(18, 23, 22, 27, "green_dark")
    c.rect(8, 28, 13, 28, "outline")
    c.rect(18, 28, 23, 28, "outline")
    c.ellipse(16, 17, 10, 8, "green")         # big body
    c.rect(20, 11, 26, 24, "green_dark")
    c.rect(9, 19, 22, 23, "stone")            # loincloth
    c.circle(16, 7, 5, "green")               # small head
    c.rect(19, 4, 21, 10, "green_dark")
    c.rect(13, 6, 14, 7, "gold")              # eyes
    c.rect(18, 6, 19, 7, "gold")
    c.rect(13, 10, 19, 10, "outline")
    c.rect(14, 10, 14, 11, "white")           # tusks
    c.rect(18, 10, 18, 11, "white")
    c.rect(1, 9, 9, 21, "red")                # giant textbook
    c.rect(2, 10, 8, 20, "red_dark")
    c.rect(1, 9, 1, 21, "white")
    c.rect(3, 12, 7, 13, "gold")              # "$$$" title band
    c.rect(4, 16, 6, 18, "gold_light")
    c.rect(27, 12, 30, 22, "green_dark")      # arm
    return finish(c, (16, 29, 11))


def late_fee_lich():
    c = Canvas(32, 32)
    c.tri(16, 9, 27, 10, "purple_dark")       # robe
    c.rect(6, 25, 26, 27, "purple_dark")
    c.tri(16, 11, 27, 6, "purple")
    c.rect(11, 22, 21, 27, "purple")
    c.rect(19, 12, 26, 27, "purple_dark")
    c.ellipse(16, 8, 6, 6, "purple_dark")     # hood
    c.ellipse(16, 9, 4, 4, "white")           # skull
    c.rect(14, 8, 15, 9, "outline")
    c.rect(17, 8, 18, 9, "outline")
    c.rect(14, 8, 14, 8, "red")               # ember eyes
    c.rect(18, 8, 18, 8, "red")
    c.rect(15, 12, 17, 12, "outline")
    c.rect(25, 3, 25, 27, "stone_light")      # staff
    c.circle(25, 3, 2, "red")                 # late-fee orb
    c.rect(25, 3, 25, 3, "gold_light")
    c.rect(2, 13, 8, 22, "white")             # overdue invoice scroll
    c.rect(3, 15, 7, 15, "outline")
    c.rect(3, 17, 6, 17, "outline")
    c.rect(3, 19, 7, 20, "red")
    c.rect(9, 15, 11, 17, "white")            # bony hand
    return finish(c, (16, 29, 10))


# ---------- Rent Dragon (64x64) ----------

def rent_dragon():
    c = Canvas(64, 64)
    # wings (back), rooted at the shoulders
    for side in (-1, 1):
        sx = 32 + side * 12                     # shoulder
        tip = 32 + side * 29                    # wing tip x
        for i in range(0, 22):                  # fill fan from shoulder to tip
            c.line(sx, 32, tip - side * i, 6 + i, "red_dark")
        for bone in (0, 8, 16):                 # wing bones
            c.line(sx, 32, tip - side * bone, 6 + bone, "outline")
    # tail
    c.ellipse(52, 50, 8, 4, "red")
    c.tri(60, 40, 47, 2, "gold")
    # body
    c.ellipse(32, 42, 16, 13, "red")
    c.rect(38, 30, 48, 54, "red_dark")
    c.ellipse(32, 45, 9, 8, "gold_light")     # belly scales
    for y in (40, 44, 48, 52):
        c.rect(25, y, 39, y, "gold")
    # legs
    c.rect(19, 52, 25, 59, "red")
    c.rect(39, 52, 45, 59, "red_dark")
    c.rect(18, 60, 26, 60, "outline")
    c.rect(38, 60, 46, 60, "outline")
    # neck + head
    c.rect(27, 20, 37, 32, "red")
    c.rect(34, 20, 37, 32, "red_dark")
    c.ellipse(32, 15, 11, 8, "red")
    c.rect(37, 10, 43, 22, "red_dark")
    c.rect(24, 19, 40, 22, "red_dark")        # jaw
    c.rect(26, 20, 38, 20, "white")           # teeth
    for x in range(26, 39, 3):
        c.px(x, 21, "white")
    c.tri(24, 2, 9, 2, "gold")                # horns
    c.tri(40, 2, 9, 2, "gold_dark")
    c.rect(26, 12, 29, 14, "gold")            # eyes
    c.rect(35, 12, 38, 14, "gold")
    c.rect(27, 12, 28, 14, "outline")
    c.rect(36, 12, 37, 14, "outline")
    c.rect(30, 17, 30, 17, "outline")         # nostrils
    c.rect(34, 17, 34, 17, "outline")
    # hoard: RENT invoice + coins
    c.rect(4, 44, 16, 58, "white")
    c.rect(6, 46, 14, 47, "red")
    c.rect(6, 50, 13, 50, "outline")
    c.rect(6, 52, 11, 52, "outline")
    c.rect(6, 55, 14, 56, "gold_dark")
    for cx in (50, 55, 59):
        c.circle(cx, 59, 2, "gold")
    c.rect(53, 56, 57, 57, "gold_dark")
    return finish(c, (32, 61, 22))


# ---------- items (16x16) ----------

def coin():
    c = Canvas(16, 16)
    c.circle(8, 7, 6, "gold")
    c.rect(10, 3, 13, 11, "gold_dark")
    c.circle(8, 7, 4, "gold_light")
    c.rect(6, 4, 10, 4, "gold_dark")           # "S" for Senbud
    c.rect(6, 5, 6, 6, "gold_dark")
    c.rect(6, 7, 10, 7, "gold_dark")
    c.rect(10, 8, 10, 9, "gold_dark")
    c.rect(6, 10, 10, 10, "gold_dark")
    return finish(c, (8, 14, 4))


def potion():
    c = Canvas(16, 16)
    c.rect(6, 1, 9, 3, "gold_dark")           # cork
    c.rect(6, 4, 9, 5, "white")               # neck
    c.circle(8, 10, 5, "purple")
    c.rect(10, 7, 13, 14, "purple_dark")
    c.rect(4, 11, 12, 14, "red")              # treat liquid
    c.rect(10, 11, 12, 14, "red_dark")
    c.rect(5, 8, 6, 9, "white")               # shine
    c.rect(7, 12, 8, 12, "gold_light")        # heart-ish sparkle
    return finish(c, (8, 15, 4))


def scroll():
    c = Canvas(16, 16)
    c.rect(3, 4, 12, 12, "white")
    c.rect(10, 4, 12, 12, "gold_light")
    c.rect(2, 2, 13, 4, "gold_dark")          # top roll
    c.rect(2, 12, 13, 14, "gold_dark")
    c.rect(5, 6, 10, 6, "purple")             # runes
    c.rect(5, 8, 9, 8, "purple")
    c.rect(5, 10, 8, 10, "purple_light")
    return finish(c)


def d20():
    c = Canvas(16, 16)
    # hexagon silhouette
    for y in range(1, 15):
        inset = max(0, 4 - y) if y < 4 else (max(0, y - 11) if y > 11 else 0)
        c.rect(2 + inset, y, 13 - inset, y, "purple_dark")
    # central triangle facet (lit) + upper facets
    c.tri(8, 3, 11, 5, "purple_light")
    c.line(2, 4, 8, 3, "purple")
    c.line(13, 4, 8, 3, "purple")
    c.rect(3, 12, 12, 13, "purple")
    # "20"
    c.rect(6, 7, 7, 7, "outline")
    c.rect(7, 8, 7, 8, "outline")
    c.rect(6, 9, 7, 9, "outline")
    c.rect(9, 7, 10, 9, "outline")
    c.rect(9, 8, 9, 8, "purple_light")
    return finish(c)


# ---------- dungeon background (160x90) ----------

def dungeon():
    c = Canvas(160, 90)
    c.rect(0, 0, 159, 89, "stone")
    # brick rows
    for row, y in enumerate(range(0, 60, 6)):
        c.rect(0, y, 159, y, "outline")
        off = 0 if row % 2 == 0 else 6
        for x in range(off, 160, 12):
            c.rect(x, y, x, y + 5, "outline")
            c.rect(x + 1, y + 1, x + 4, y + 1, "stone_light")
    # floor
    c.rect(0, 60, 159, 89, "stone_light")
    for y in range(60, 90, 5):
        c.rect(0, y, 159, y, "stone")
    for x in range(0, 160, 16):
        c.line(80 + (x - 80) // 3, 60, x, 89, "stone")
    # arched doorway (back)
    c.ellipse(80, 30, 14, 14, "outline")
    c.rect(66, 30, 94, 60, "outline")
    c.ellipse(80, 30, 11, 11, "shadow")
    c.rect(69, 30, 91, 60, "shadow")
    # torches
    for tx in (36, 124):
        c.rect(tx, 26, tx + 1, 34, "gold_dark")
        c.ellipse(tx, 22, 2, 4, "red")
        c.ellipse(tx, 23, 1, 2, "gold")
    # banner with Senbud purple
    for bx in (16, 136):
        c.rect(bx, 6, bx + 8, 24, "purple")
        c.rect(bx + 5, 6, bx + 8, 24, "purple_dark")
        c.tri(bx + 4, 20, 26, 4, "stone")
        c.circle(bx + 4, 12, 2, "gold")
    # scattered coins on the floor
    for x, y in ((30, 78), (34, 80), (128, 76), (132, 79), (110, 84)):
        c.rect(x, y, x + 1, y, "gold")
    return c  # no outline pass for backgrounds


SPRITES = {
    "hero_scholar": (scholar, True),
    "hero_freelancer": (freelancer, True),
    "hero_home_cook": (home_cook, True),
    "monster_impulse_goblin": (impulse_goblin, True),
    "monster_subscription_slime": (subscription_slime, True),
    "monster_craving_wraith": (craving_wraith, True),
    "monster_grab_golem": (grab_golem, True),
    "monster_boredom_imp": (boredom_imp, True),
    "monster_textbook_troll": (textbook_troll, True),
    "monster_late_fee_lich": (late_fee_lich, True),
    "boss_rent_dragon": (rent_dragon, True),
    "item_coin": (coin, False),
    "item_treat_potion": (potion, False),
    "item_spell_scroll": (scroll, False),
    "item_d20": (d20, False),
    "bg_dungeon": (dungeon, False),
}


def to_json(frames, w, h):
    used = {k for f in frames for row in f.g for k in row}
    palette = {k: v for k, v in PALETTE.items() if k in used or k == "bg"}
    return {
        "version": "1",
        "width": w,
        "height": h,
        "palette": palette,
        "frames": [{"duration": 400, "grid": f.g} for f in frames],
    }


def main():
    OUT.mkdir(exist_ok=True)
    for name, (fn, idle) in SPRITES.items():
        base = fn()
        frames = [base, base.shifted(-1)] if idle else [base]
        data = to_json(frames, base.w, base.h)
        (OUT / f"{name}.json").write_text(json.dumps(data))
        print(f"{name}: {base.w}x{base.h}, {len(frames)} frame(s)")


if __name__ == "__main__":
    main()
