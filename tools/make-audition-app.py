#!/usr/bin/env python3
"""Build tools/Audition.app — a double-clickable launcher with no Terminal.

A .command file always drags a Terminal window along with it. A real bundle
runs the tool as its own app: icon in the Dock, windows that come to the
front, and nothing else on screen. Output still goes to a log, and a failure
raises an alert rather than vanishing silently.

    tools/.venv-audio/bin/python tools/make-audition-app.py
"""
import plistlib
import shutil
import subprocess
import sys
from pathlib import Path

import AppKit

sys.path.insert(0, str(Path(__file__).parent))
from audition_icon import draw  # noqa: E402

HERE = Path(__file__).parent
APP = HERE / "Audition.app"
CONTENTS = APP / "Contents"
MACOS = CONTENTS / "MacOS"
RESOURCES = CONTENTS / "Resources"
LOG = "/tmp/mashenstein-audition.log"

LAUNCHER = f"""#!/bin/sh
# Contents/MacOS -> Audition.app -> tools -> repo root
REPO=$(cd "$(dirname "$0")/../../../.." && pwd)
PY="$REPO/tools/.venv-audio/bin/python"
LOG="{LOG}"

if [ ! -x "$PY" ]; then
  osascript -e 'display alert "Audition can not start" message "Missing tools/.venv-audio — run: python3 -m venv tools/.venv-audio && tools/.venv-audio/bin/pip install pedalboard pyobjc-framework-Cocoa"'
  exit 1
fi

echo "--- $(date) ---" >> "$LOG"

# LaunchServices can start this bundle under Rosetta, and the system python is
# universal, so it would then run as x86_64 while the venv's numpy is arm64.
# Note uname -m reports x86_64 inside Rosetta; hw.optional.arm64 tells the
# truth either way.
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then
  arch -arm64 "$PY" "$REPO/tools/audition.py" "$@" >> "$LOG" 2>&1
else
  "$PY" "$REPO/tools/audition.py" "$@" >> "$LOG" 2>&1
fi
STATUS=$?
if [ $STATUS -ne 0 ]; then
  TAIL=$(tail -n 6 "$LOG" | tr '"' "'")
  osascript -e "display alert \\"Audition exited with status $STATUS\\" message \\"$TAIL\\""
fi
exit $STATUS
"""

ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024]


def write_icns(dest):
    """iconutil wants a .iconset folder of exact-size PNGs."""
    iconset = dest.parent / "audition.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir(parents=True)

    img = draw()
    for size in ICON_SIZES:
        rep = AppKit.NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel_(
            None, size, size, 8, 4, True, False, AppKit.NSDeviceRGBColorSpace, 0, 0
        )
        ctx = AppKit.NSGraphicsContext.graphicsContextWithBitmapImageRep_(rep)
        AppKit.NSGraphicsContext.saveGraphicsState()
        AppKit.NSGraphicsContext.setCurrentContext_(ctx)
        img.drawInRect_(AppKit.NSMakeRect(0, 0, size, size))
        AppKit.NSGraphicsContext.restoreGraphicsState()
        png = rep.representationUsingType_properties_(AppKit.NSBitmapImageFileTypePNG, {})

        # Retina slots are the same pixels under a @2x name one step down.
        png.writeToFile_atomically_(str(iconset / f"icon_{size}x{size}.png"), True)
        if size >= 32:
            png.writeToFile_atomically_(
                str(iconset / f"icon_{size // 2}x{size // 2}@2x.png"), True
            )

    r = subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(dest)],
        capture_output=True,
        text=True,
    )
    shutil.rmtree(iconset)
    if r.returncode != 0:
        raise SystemExit(f"iconutil failed: {r.stderr.strip()}")


def main():
    if APP.exists():
        shutil.rmtree(APP)
    MACOS.mkdir(parents=True)
    RESOURCES.mkdir(parents=True)

    launcher = MACOS / "audition-launch"
    launcher.write_text(LAUNCHER)
    launcher.chmod(0o755)

    write_icns(RESOURCES / "audition.icns")

    plist = {
        "CFBundleName": "Audition",
        "CFBundleDisplayName": "Audition",
        "CFBundleExecutable": "audition-launch",
        "CFBundleIdentifier": "com.mashenstein.audition",
        "CFBundleIconFile": "audition.icns",
        "CFBundlePackageType": "APPL",
        "CFBundleShortVersionString": "1.0",
        "CFBundleVersion": "1",
        "LSMinimumSystemVersion": "12.0",
        "NSHighResolutionCapable": True,
        # No LSRequiresNativeExecution / LSArchitecturePriority here: this
        # bundle's executable is a shell script rather than a Mach-O, and
        # LaunchServices silently refuses to launch it when asked to satisfy
        # an architecture requirement it cannot read. The arch -arm64 call in
        # the launcher is what actually keeps python off Rosetta.
    }
    (CONTENTS / "Info.plist").write_bytes(plistlib.dumps(plist))

    # Nudge LaunchServices so Finder picks up the icon straight away rather
    # than showing a stale generic one.
    subprocess.run(["touch", str(APP)], check=False)
    print(f"built {APP}")
    print(f"log:   {LOG}")


if __name__ == "__main__":
    main()
