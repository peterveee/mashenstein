#!/usr/bin/env python3
"""Draw and apply the Finder icon for tools/Audition.command.

Cocoa drawing rather than an image file, so the icon lives in version control
as code and can be re-applied after a fresh checkout (custom icons are stored
in an extended attribute, which git does not carry).

    tools/.venv-audio/bin/python tools/audition_icon.py
"""
import math
import sys
from pathlib import Path

import AppKit
from Foundation import NSMakeRect, NSMakePoint

HERE = Path(__file__).parent
TARGETS = [HERE / "Audition.command"]
S = 1024.0

INK = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(0.075, 0.075, 0.165, 1)
ACCENT = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(0.42, 0.42, 0.92, 1)
KNOB = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(0.03, 0.03, 0.08, 1)
BRIGHT = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(1, 1, 1, 1)


def circle(cx, cy, r):
    return AppKit.NSBezierPath.bezierPathWithOvalInRect_(
        NSMakeRect(cx - r, cy - r, r * 2, r * 2)
    )


def draw():
    img = AppKit.NSImage.alloc().initWithSize_((S, S))
    img.lockFocus()

    # plate
    plate = AppKit.NSBezierPath.bezierPathWithRoundedRect_xRadius_yRadius_(
        NSMakeRect(40, 40, S - 80, S - 80), 210, 210
    )
    INK.set()
    plate.fill()
    ACCENT.colorWithAlphaComponent_(0.55).set()
    plate.setLineWidth_(14)
    plate.stroke()

    cx = cy = S / 2
    # Tick ring: fewer and fatter than looks right at 1024, because at Finder's
    # 32pt each tick lands on about one pixel and thin ones turn to mush.
    ACCENT.colorWithAlphaComponent_(0.9).set()
    for i in range(7):
        a = math.radians(210 - i * 40)
        p = AppKit.NSBezierPath.bezierPath()
        p.setLineWidth_(30)
        p.setLineCapStyle_(AppKit.NSLineCapStyleRound)
        p.moveToPoint_(NSMakePoint(cx + math.cos(a) * 378, cy + math.sin(a) * 378))
        p.lineToPoint_(NSMakePoint(cx + math.cos(a) * 340, cy + math.sin(a) * 340))
        p.stroke()

    # knob
    KNOB.set()
    circle(cx, cy, 268).fill()
    ACCENT.set()
    ring = circle(cx, cy, 268)
    ring.setLineWidth_(26)
    ring.stroke()

    # pointer, up and to the right like a knob turned past noon
    a = math.radians(62)
    ptr = AppKit.NSBezierPath.bezierPath()
    ptr.setLineWidth_(52)
    ptr.setLineCapStyle_(AppKit.NSLineCapStyleRound)
    BRIGHT.set()
    ptr.moveToPoint_(NSMakePoint(cx + math.cos(a) * 60, cy + math.sin(a) * 60))
    ptr.lineToPoint_(NSMakePoint(cx + math.cos(a) * 214, cy + math.sin(a) * 214))
    ptr.stroke()

    img.unlockFocus()
    return img


def main():
    img = draw()
    ws = AppKit.NSWorkspace.sharedWorkspace()
    ok = True
    for target in TARGETS:
        if not target.exists():
            print(f"missing: {target}")
            ok = False
            continue
        if ws.setIcon_forFile_options_(img, str(target), 0):
            print(f"icon applied: {target.name}")
        else:
            print(f"could not set icon on {target.name}")
            ok = False
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
