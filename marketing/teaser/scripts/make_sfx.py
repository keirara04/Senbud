"""Synthesise the teaser's SFX bed (assets/sfx.wav). Stdlib only, seeded, so it rebuilds identically.

Event times mirror the GSAP timeline in index.html; change both together.
Run: python3 scripts/make_sfx.py
"""
import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
LEN = 22.0
rng = random.Random(7)
buf = [0.0] * int(SR * LEN)


def add(t, samples, gain=1.0):
    i0 = int(t * SR)
    for i, s in enumerate(samples):
        if 0 <= i0 + i < len(buf):
            buf[i0 + i] += s * gain


def noise(n):
    return [rng.uniform(-1, 1) for _ in range(n)]


def lowpass(xs, alpha_fn):
    y, out = 0.0, []
    for i, x in enumerate(xs):
        y += alpha_fn(i) * (x - y)
        out.append(y)
    return out


def sweep(f0, f1, dur, decay):
    n, ph, out = int(dur * SR), 0.0, []
    for i in range(n):
        f = f0 + (f1 - f0) * i / n
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-decay * i / SR))
    return out


def whoosh(dur=0.5, rising=False):
    n = int(dur * SR)
    def alpha(i):
        p = i / n
        p = p if rising else 1 - abs(2 * p - 1)
        return 0.02 + 0.25 * p
    xs = lowpass(noise(n), alpha)
    return [x * math.sin(math.pi * i / n) ** 2 * 2.2 for i, x in enumerate(xs)]


def click():
    n = int(0.018 * SR)
    xs = noise(n)
    return [(xs[i] - (xs[i - 1] if i else 0)) * 0.5 * math.exp(-i / (0.004 * SR)) for i in range(n)]


def thock():
    body = sweep(180, 90, 0.12, 30)
    return [b + c for b, c in zip(body, click() + [0.0] * len(body))]


def tick(f=1800):
    return sweep(f, f, 0.03, 120)


def chime(notes=(1318.5, 1975.5), dur=0.9):
    n = int(dur * SR)
    return [sum(math.sin(2 * math.pi * f * i / SR) for f in notes) / len(notes) * math.exp(-5 * i / SR) for i in range(n)]


def impact():
    n = int(0.4 * SR)
    sub = sweep(90, 45, 0.4, 9)
    nz = lowpass(noise(n), lambda i: 0.08)
    return [sub[i] + nz[i] * 1.5 * math.exp(-i / (0.05 * SR)) for i in range(n)]


def swipe(dur=0.3):
    n = int(dur * SR)
    xs = noise(n)
    hp = [xs[i] - (xs[i - 1] if i else 0) for i in range(n)]
    return [h * 0.4 * math.sin(math.pi * i / n) for i, h in enumerate(hp)]


def printer(dur=0.7):
    n = int(dur * SR)
    xs = noise(n)
    return [x * (1 if (i // int(SR / 45)) % 2 == 0 else 0.15) * 0.35 * math.sin(math.pi * i / n) ** 0.5 for i, x in enumerate(xs)]


def type_times(text, start, step):
    t, out = start, []
    for i, _ in enumerate(text):
        out.append(t)
        t += step * (1 + 0.35 * math.sin(i * 2.3))
    return out


# --- Events, in timeline order ---
add(0.25, tick(2200), 0.15)
add(0.15, whoosh(0.4, rising=True), 0.2)
add(1.25, sweep(520, 160, 0.4, 6), 0.3)  # "boring." sags
for t in (2.25, 8.85, 11.85, 14.25):
    add(t, whoosh(0.5), 0.55)
add(3.15, swipe(), 0.6)  # marker
add(4.45, whoosh(0.55, rising=True), 0.5)  # zoom-through
for t in type_times("lunch 12, grab 8", 5.2, 0.068):
    add(t, click(), 0.7)
add(6.85, thock(), 0.6)  # enter
add(7.05, printer(), 0.6)
for t in (7.35, 7.55):
    add(t, tick(1500), 0.25)
add(7.9, tick(2000), 0.25)
for k in range(18):  # one tick per equal value step of the power3.out count-up
    add(9.45 + 1.3 * (1 - (1 - k / 18) ** (1 / 3)), tick(1700 + 30 * k), 0.12)
add(10.75, chime(), 0.35)
add(12.65, swipe(), 0.5)
for t in (12.95, 13.17, 13.39):
    add(t, tick(1300), 0.25)
add(13.7, chime((1046.5, 1568.0), 0.6), 0.25)
for t in type_times("Can I afford it?", 14.6, 0.045):
    add(t, click(), 0.6)
for t in type_times("40", 15.45, 0.14):
    add(t, click(), 0.7)
add(15.85, thock(), 0.6)
add(16.0, sweep(400, 900, 0.07, 30), 0.3)
for t in (17.4, 18.1, 18.8):
    add(t, impact(), 0.8)
add(19.55, sweep(300, 1100, 0.09, 25), 0.35)  # logo pop
add(19.95, swipe(0.25), 0.5)
add(20.95, chime((1318.5, 1975.5, 2637.0), 1.0), 0.35)
add(21.2, swipe(0.6), 0.25)

peak = max(abs(s) for s in buf) or 1
out = Path(__file__).resolve().parent.parent / "assets" / "sfx.wav"
out.parent.mkdir(exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(math.tanh(s / peak * 1.2) * 0.8 * 32767)) for s in buf))
print("wrote", out)
