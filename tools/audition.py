#!/usr/bin/env python3
"""Audition audio through an AU/VST3 plugin with its real GUI open.

A transport bar is glued to the bottom edge of the plugin's own window, with
popup selectors for the plugin and the source track, sliders to pick the
preview excerpt, and OK/Cancel. OK prompts for a save location, renders the
full track, and writes the plugin state beside it as a real .aupreset.

    tools/audition                                  # Ozone 12, shop theme, 2 loops
    tools/audition --plugin "ValhallaSupermassive"  # any AU/VST3 by fuzzy name
    tools/audition --loops 4                        # loop before the plugin sees it
    tools/audition --preset "SHOPPING WASH"         # start from a saved preset
    tools/audition --src dist/food-court.wav        # any source file
    tools/audition --plugin "WaveShell1-AU 16.7" --list   # inspect a shell

Three things here are load-bearing and non-obvious:

* Everything runs in ONE process. show_editor() blocks the main thread but
  pumps the shared Cocoa run loop, so our NSTimer, windows and buttons stay
  live and can touch the plugin object directly.
* The bar is a child window, not a view inside the plugin's window. Embedding
  was tried and lost: JUCE re-lays its editor out to fill the frame from its
  own resize handler, reclaiming the space even with autoresizing disabled.
* Switching plugin cannot happen in place, because show_editor() owns the main
  thread until it returns. Instead the bar asks main() to close the editor and
  the outer loop reopens with the new plugin.
"""
import argparse
import json
import plistlib
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import AppKit
import numpy as np
import objc
from Foundation import NSMakeRect, NSObject, NSOperationQueue, NSTimer
from pedalboard import load_plugin
from pedalboard.io import AudioFile

HERE = Path(__file__).parent
REPO = HERE.parent
COMPONENTS = Path("/Library/Audio/Plug-Ins/Components")
VST3 = Path("/Library/Audio/Plug-Ins/VST3")
PRESETS = Path.home() / "Library/Audio/Presets"
SCRATCH = Path(tempfile.gettempdir())  # previews are throwaway; keep them out of the repo
RENDER_DIR = REPO / "dist"  # where render-track.js already writes, and gitignored
LOAD_ITEM = "Load audio file…"
DEFAULT_TRACK = "shop"
DEFAULT_PLUGIN = "Ozone 12"
DEFAULT_LOOPS = 2
LOOP_CHOICES = [1, 2, 3, 4, 6, 8]

TAIL = 6.0
BAR_H = 112
MIN_BAR_W = 660  # below this the transport row cannot be laid out legibly


def fmt_time(seconds):
    return f"{int(seconds) // 60}:{int(seconds) % 60:02d}"


# --------------------------------------------------------------------- lookup
def norm(s):
    """Vendors spell things every which way: iZOzone12AUHook vs 'Ozone 12'."""
    s = s.lower().replace("auhook", "")
    return "".join(ch for ch in s if ch.isalnum())


def all_plugins():
    """Every installed AU/VST3, AU preferred where both formats exist."""
    cands = []
    for root, ext in ((COMPONENTS, ".component"), (VST3, ".vst3")):
        if root.is_dir():
            cands += [c for c in root.iterdir() if c.suffix == ext]
    by_norm = {}
    for c in cands:
        by_norm.setdefault(norm(c.stem), []).append(c)
    for v in by_norm.values():
        v.sort(key=lambda c: c.suffix != ".component")  # .aupreset state is AU's
    return by_norm


def resolve_plugin(name):
    p = Path(name)
    if p.exists():
        return p
    by_norm = all_plugins()
    q = norm(name)
    if q in by_norm:
        return by_norm[q][0]
    # Shortest first, so "ozone12" lands on Ozone 12 not Ozone 12 Bass Control.
    hits = sorted(
        (v[0] for k, v in by_norm.items() if q in k),
        key=lambda c: (len(norm(c.stem)), c.stem),
    )
    if not hits:
        sys.exit(f"no plugin matching {name!r}")
    # Only flag ambiguity when the shortest match isn't a clear winner. "Ozone
    # 12" matches 21 plugins but beats every module variant outright, and
    # that is the default, so warning every launch is just noise.
    if len(hits) > 1 and len(norm(hits[0].stem)) == len(norm(hits[1].stem)):
        print(f"  {len(hits)} matches for {name!r}, using {hits[0].stem}")
        for c in hits[1:5]:
            print(f"    also: {c.stem}")
    return hits[0]


def resolve_preset(name):
    if not name:
        return None
    p = Path(name)
    if p.exists():
        return p
    hits = [f for f in PRESETS.rglob("*.aupreset") if name.lower() in f.stem.lower()]
    hits += [f for f in REPO.rglob("*.aupreset") if name.lower() in f.stem.lower()]
    if not hits:
        sys.exit(f"no preset matching {name!r}")
    if len(hits) > 1:
        print(f"  {len(hits)} preset matches, using {hits[0].stem}")
    return hits[0]


RECENTS_FILE = HERE / ".audition-recents.json"
MAX_RECENTS = 6


def load_recents():
    try:
        return json.loads(RECENTS_FILE.read_text())[:MAX_RECENTS]
    except Exception:
        return []


def push_recent(stem):
    """Most-recent-first, no duplicates, capped — written on every plugin open."""
    recents = [r for r in load_recents() if r != stem]
    recents.insert(0, stem)
    try:
        RECENTS_FILE.write_text(json.dumps(recents[:MAX_RECENTS], indent=1))
    except Exception:
        pass  # a picker convenience is never worth failing the session over


_NODE = None


def find_node():
    """Locate node without trusting PATH.

    Finder hands a launched app PATH=/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin
    with no Homebrew on it, so a bare "node" resolves fine from a shell and
    not at all from a double-click.
    """
    global _NODE
    if _NODE:
        return _NODE
    found = shutil.which("node")
    if not found:
        candidates = [
            Path("/opt/homebrew/bin/node"),
            Path("/usr/local/bin/node"),
            Path("/usr/bin/node"),
            *sorted(Path.home().glob(".nvm/versions/node/*/bin/node"), reverse=True),
        ]
        found = next((str(c) for c in candidates if c.exists()), None)
    _NODE = found
    return found


def list_tracks():
    """The music banks defined in code, straight from tools/lib/tracks.js.

    Asking node rather than reimplementing the id rules keeps this from
    drifting away from render-track.js, which is the whole point of tracks.js.
    """
    node = find_node()
    if not node:
        print("could not find node — track list unavailable")
        return []
    r = subprocess.run(
        [
            node,
            "-e",
            "import('./tools/lib/tracks.js')"
            ".then(m => console.log(JSON.stringify(m.listTracks())))",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(f"could not list tracks: {r.stderr.strip()}")
        return []
    return json.loads(r.stdout)


def ensure_rendered(track, loops=DEFAULT_LOOPS, status=lambda s: None):
    """A bank is code, not audio — render it to a WAV the first time it's asked for.

    Loop count has to happen here rather than by tiling the audio afterwards:
    the point of looping before the plugin is that reverb and delay tails
    carry across the loop boundary instead of restarting at it.
    """
    # 2x is render-track.js's own default and what dist/<slug>.wav already
    # holds, so reuse that file rather than rendering a duplicate beside it.
    name = track["slug"] if loops == DEFAULT_LOOPS else f"{track['slug']}-x{loops}"
    out = RENDER_DIR / f"{name}.wav"
    if out.exists():
        return out
    node = find_node()
    if not node:
        status("could not find node — cannot render that track")
        return None
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    status(f"rendering {track['title']} ×{loops}…")
    r = subprocess.run(
        [node, "tools/render-track.js", track["id"], str(loops), str(out)],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0 or not out.exists():
        status(f"render failed: {(r.stderr or r.stdout).strip()[:80]}")
        return None
    return out


# ---------------------------------------------------------------------- audio
def load_audio(src):
    with AudioFile(str(src)) as f:
        audio = f.read(f.frames)
        sr = f.samplerate
    if audio.shape[0] == 1:  # stereo plugins need a real stereo field
        audio = np.repeat(audio, 2, axis=0)
    return audio, sr


def pad(audio, sr, seconds=TAIL):
    return np.concatenate(
        [audio, np.zeros((audio.shape[0], int(seconds * sr)), dtype=audio.dtype)], axis=1
    )


def on_main(fn):
    NSOperationQueue.mainQueue().addOperationWithBlock_(fn)


# -------------------------------------------------------------------------- ui
class PanelWindow(AppKit.NSWindow):
    # Borderless windows refuse key status by default, which would stop the
    # popup menus and buttons taking keyboard input.
    def canBecomeKeyWindow(self):
        return True


class Bar(NSObject):
    def initWithCtx_(self, ctx):
        self = objc.super(Bar, self).init()
        self.ctx = ctx
        self.attached = False
        self.player = None
        self.panel = None
        self.plugin_window = None
        # Preview restarts on every click, so an in-flight render has to be
        # able to discover it has been superseded and bow out.
        self.gen = 0
        self.render_lock = threading.Lock()
        return self

    # --- helpers (plain Python, not selectors) --------------------------
    @objc.python_method
    def status(self, text):
        on_main(lambda: self.status_label.setStringValue_(text))

    @objc.python_method
    def stop_playback(self):
        # Bumping the generation also cancels a render that hasn't reached
        # playback yet, so Stop means stop even mid-render.
        self.gen += 1
        if self.player and self.player.poll() is None:
            self.player.terminate()
            self.player = None
            return True
        return False

    @objc.python_method
    def render_and_play(self, start, dur, gen):
        c = self.ctx
        a = c["audio"][:, int(start * c["sr"]) : int((start + dur) * c["sr"])]
        if a.shape[1] == 0:
            self.status("past end of file")
            return
        # One render at a time; the plugin instance is not reentrant.
        with self.render_lock:
            if gen != self.gen:
                return  # superseded while queued
            try:
                wet = c["plugin"](pad(a, c["sr"], 4.0), c["sr"], reset=True)
            except Exception as e:
                self.status(f"render failed: {e}")
                return
        if gen != self.gen:
            return  # superseded while rendering
        path = SCRATCH / f"audition-preview-{gen % 4}.wav"
        with AudioFile(str(path), "w", c["sr"], wet.shape[0]) as f:
            f.write(wet)
        if gen != self.gen:
            return
        self.player = subprocess.Popen(
            ["afplay", str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        self.status(f"playing {fmt_time(start)} +{dur:.0f}s")

    @objc.python_method
    def teardown(self):
        """Unglue and hide the bar so a plugin switch can build a fresh one."""
        self.stop_playback()
        if self.panel:
            if self.plugin_window:
                self.plugin_window.removeChildWindow_(self.panel)
            self.panel.orderOut_(None)

    # --- button actions -------------------------------------------------
    def preview_(self, sender):
        # Always restart: kill whatever is playing, invalidate any in-flight
        # render, and start fresh from the current knob positions.
        self.stop_playback()
        self.gen += 1
        self.status("rendering…")
        threading.Thread(
            target=self.render_and_play,
            args=(self.from_slider.doubleValue(), self.len_slider.doubleValue(), self.gen),
            daemon=True,
        ).start()

    def stop_(self, sender):
        self.status("stopped" if self.stop_playback() else "nothing playing")

    def sliderChanged_(self, sender):
        self.from_value.setStringValue_(fmt_time(self.from_slider.doubleValue()))
        self.len_value.setStringValue_(f"{self.len_slider.doubleValue():.0f}s")

    def pluginChanged_(self, sender):
        path = self.ctx["plugin_map"].get(sender.titleOfSelectedItem())
        if not path or path == self.ctx["plugin_path"]:
            return
        # Can't swap in place: show_editor owns the main thread until it
        # returns, so hand the job to main()'s loop.
        self.ctx["switch_to"] = path
        self.teardown()
        self.ctx["close_event"].set()

    def songChanged_(self, sender):
        title = sender.titleOfSelectedItem()
        if title == LOAD_ITEM:
            op = AppKit.NSOpenPanel.openPanel()
            op.setTitle_("Load audio file")
            op.setAllowedFileTypes_(["wav", "aif", "aiff", "mp3", "m4a", "flac"])
            op.setDirectoryURL_(AppKit.NSURL.fileURLWithPath_(str(RENDER_DIR)))
            if op.runModal() != AppKit.NSModalResponseOK:
                self.select_song(self.ctx["song_title"])  # put the popup back
                return
            path = Path(op.URL().path())
            self.stop_playback()
            self.adopt_song(path, path.name)
            return

        track = self.ctx["track_map"].get(title)
        if not track or title == self.ctx["song_title"]:
            return
        self.stop_playback()
        # Rendering shells out to node and can take a few seconds; keep the UI
        # responsive and let the status line carry the news.
        threading.Thread(target=self.load_track, args=(track, title), daemon=True).start()

    def loopsChanged_(self, sender):
        loops = LOOP_CHOICES[sender.indexOfSelectedItem()]
        if loops == self.ctx["loops"]:
            return
        self.stop_playback()
        self.ctx["loops"] = loops
        track = self.ctx["track"]
        if track:
            threading.Thread(
                target=self.load_track,
                args=(track, self.ctx["song_title"]),
                daemon=True,
            ).start()
        else:
            # A loaded file has no bank to re-render, so tile it instead.
            self.adopt_song(self.ctx["src"], self.ctx["song_title"])

    @objc.python_method
    def load_track(self, track, title):
        path = ensure_rendered(track, self.ctx["loops"], self.status)
        if path:
            on_main(lambda: self.adopt_song(path, title, track=track))
        else:
            on_main(lambda: self.select_song(self.ctx["song_title"]))

    @objc.python_method
    def select_song(self, title):
        if self.song_popup.indexOfItemWithTitle_(title) >= 0:
            self.song_popup.selectItemWithTitle_(title)

    @objc.python_method
    def adopt_song(self, path, title, track=None):
        try:
            audio, sr = load_audio(path)
        except Exception as e:
            self.status(f"could not load: {e}")
            self.select_song(self.ctx["song_title"])
            return
        # Tracks are rendered at the loop count; plain files get tiled here.
        if track is None and self.ctx["loops"] > 1:
            audio = np.tile(audio, (1, self.ctx["loops"]))
        if self.song_popup.indexOfItemWithTitle_(title) < 0:
            self.song_popup.insertItemWithTitle_atIndex_(title, 0)
        self.select_song(title)
        self.ctx.update(
            src=path,
            song_title=title,
            track=track,
            audio=audio,
            sr=sr,
            duration=audio.shape[1] / sr,
            default_name=f"{path.stem}--{self.ctx['plugin_path'].stem}.wav",
            default_dir=path.parent,
        )
        total = self.ctx["duration"]
        self.from_slider.setMaxValue_(max(1.0, total - 1))
        if self.from_slider.doubleValue() > total - 1:
            self.from_slider.setDoubleValue_(0)
        self.len_slider.setMaxValue_(min(45.0, max(6.0, total)))
        self.sliderChanged_(None)
        self.status(f"{path.name} — {fmt_time(total)}")

    def ok_(self, sender):
        self.stop_playback()
        # Runs on the main thread inside show_editor's loop, so a modal panel
        # nests cleanly rather than deadlocking.
        sp = AppKit.NSSavePanel.savePanel()
        sp.setTitle_("Save rendered audio")
        sp.setMessage_("Render the full track through this plugin to:")
        sp.setNameFieldStringValue_(self.ctx["default_name"])
        sp.setAllowedFileTypes_(["wav"])
        sp.setDirectoryURL_(AppKit.NSURL.fileURLWithPath_(str(self.ctx["default_dir"])))
        if sp.runModal() != AppKit.NSModalResponseOK:
            self.status("save cancelled — still auditioning")
            return
        self.ctx["out_path"] = Path(sp.URL().path())
        self.ctx["committed"] = True
        self.teardown()
        self.ctx["close_event"].set()

    def cancel_(self, sender):
        self.ctx["committed"] = False
        self.teardown()
        self.ctx["close_event"].set()

    # --- glue the bar on once the editor exists --------------------------
    def tick_(self, timer):
        if self.attached:
            return
        for w in AppKit.NSApp().windows():
            if w.className().startswith("JUCEWindow"):
                self.attach(w)
                return

    @objc.python_method
    def attach(self, plugin_window):
        f = plugin_window.frame()
        # Match the plugin's width exactly so the two read as one unit; only
        # exceed it if the plugin is too narrow to lay the transport row out.
        width = max(f.size.width, MIN_BAR_W)
        panel = PanelWindow.alloc().initWithContentRect_styleMask_backing_defer_(
            NSMakeRect(f.origin.x, f.origin.y - BAR_H, width, BAR_H),
            AppKit.NSWindowStyleMaskBorderless,
            AppKit.NSBackingStoreBuffered,
            False,
        )
        # Dark appearance so the bar reads as part of the plugin rather than a
        # stray system window; controls then style themselves to match.
        panel.setAppearance_(
            AppKit.NSAppearance.appearanceNamed_(AppKit.NSAppearanceNameDarkAqua)
        )
        panel.setBackgroundColor_(
            AppKit.NSColor.colorWithCalibratedRed_green_blue_alpha_(0.11, 0.11, 0.13, 1.0)
        )
        panel.setHasShadow_(True)
        v = panel.contentView()

        ROW_TOP, ROW_BOT, STATUS_Y = 82, 44, 8

        def label(text, x, w, mid, size=11, dim=True, bold=False, align=None):
            h = 16
            t = AppKit.NSTextField.alloc().initWithFrame_(NSMakeRect(x, mid - h / 2, w, h))
            t.setStringValue_(text)
            t.setBezeled_(False)
            t.setDrawsBackground_(False)
            t.setEditable_(False)
            t.setSelectable_(False)
            t.setFont_(
                AppKit.NSFont.systemFontOfSize_weight_(size, AppKit.NSFontWeightSemibold)
                if bold
                else AppKit.NSFont.systemFontOfSize_(size)
            )
            t.setTextColor_(
                AppKit.NSColor.tertiaryLabelColor() if dim else AppKit.NSColor.labelColor()
            )
            if align is not None:
                t.setAlignment_(align)
            v.addSubview_(t)
            return t

        def button(title, x, w, action, key=""):
            h = 28
            b = AppKit.NSButton.alloc().initWithFrame_(NSMakeRect(x, ROW_BOT - h / 2, w, h))
            b.setTitle_(title)
            b.setBezelStyle_(AppKit.NSBezelStyleRounded)
            b.setTarget_(self)
            b.setAction_(action)
            if key:
                b.setKeyEquivalent_(key)
            v.addSubview_(b)
            return b

        def popup(x, w, titles, selected, action, extra=None, leading=None):
            h = 24
            p = AppKit.NSPopUpButton.alloc().initWithFrame_pullsDown_(
                NSMakeRect(x, ROW_TOP - h / 2, w, h), False
            )
            # Built as a raw NSMenu because NSPopUpButton.addItemWithTitle:
            # de-duplicates by title — adding the full list would silently
            # delete the recents pinned above it.
            menu = AppKit.NSMenu.alloc().init()

            def add(title):
                menu.addItem_(
                    AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
                        title, None, ""
                    )
                )

            for item in leading or []:
                add(item)
            if leading:
                menu.addItem_(AppKit.NSMenuItem.separatorItem())
            for item in titles:
                add(item)
            for item in extra or []:
                menu.addItem_(AppKit.NSMenuItem.separatorItem())
                add(item)
            p.setMenu_(menu)
            if selected in titles or (leading and selected in leading):
                p.selectItemWithTitle_(selected)
            p.setTarget_(self)
            p.setAction_(action)
            v.addSubview_(p)
            return p

        def slider(x, w, lo, hi, val):
            h = 20
            s = AppKit.NSSlider.alloc().initWithFrame_(NSMakeRect(x, ROW_BOT - h / 2, w, h))
            s.setMinValue_(lo)
            s.setMaxValue_(hi)
            s.setDoubleValue_(val)
            s.setContinuous_(True)
            s.setTarget_(self)
            s.setAction_("sliderChanged:")
            v.addSubview_(s)
            return s

        # hairline separating the bar from the plugin above it
        rule = AppKit.NSView.alloc().initWithFrame_(NSMakeRect(0, BAR_H - 1, width, 1))
        rule.setWantsLayer_(True)
        rule.layer().setBackgroundColor_(
            AppKit.NSColor.colorWithCalibratedWhite_alpha_(1.0, 0.10).CGColor()
        )
        v.addSubview_(rule)

        c = self.ctx
        PAD = 16

        # --- row 1: what we're processing, and through what ---------------
        label("PLUGIN", PAD, 48, ROW_TOP, size=9, bold=True)
        plugin_w = min(250, (width - 2 * PAD - 48 - 40 - 24) * 0.42)
        recents = [r for r in load_recents() if r in c["plugin_map"]]
        self.plugin_popup = popup(
            PAD + 52,
            plugin_w,
            sorted(c["plugin_map"]),
            c["plugin_path"].stem,
            "pluginChanged:",
            leading=recents,
        )
        # LOOPS is pinned to the right edge; SONG takes whatever is left.
        loops_w, loops_cap = 60, 44
        loops_x = width - PAD - loops_w
        label("LOOPS", loops_x - 4 - loops_cap, loops_cap, ROW_TOP, size=9, bold=True)
        self.loops_popup = popup(
            loops_x,
            loops_w,
            [str(n) for n in LOOP_CHOICES],
            str(c["loops"]),
            "loopsChanged:",
        )

        song_x = PAD + 52 + plugin_w + 20
        label("SONG", song_x, 38, ROW_TOP, size=9, bold=True)
        self.song_popup = popup(
            song_x + 42,
            (loops_x - 4 - loops_cap - 16) - (song_x + 42),
            sorted(c["track_map"]),
            c["song_title"],
            "songChanged:",
            extra=[LOAD_ITEM],
        )

        # --- row 2: transport ---------------------------------------------
        # Fixed clusters at each end; the FROM/LEN block absorbs whatever is
        # left, so an 820pt plugin and a 1200pt one both lay out cleanly.
        total = c["duration"]
        button("▶ Preview", PAD, 92, "preview:", key="\r")
        button("■ Stop", PAD + 100, 68, "stop:")

        ok_w, cancel_w = 118, 72
        ok_x = width - PAD - ok_w
        cancel_x = ok_x - 8 - cancel_w
        button("OK — Render…", ok_x, ok_w, "ok:")
        button("Cancel", cancel_x, cancel_w, "cancel:", key="\x1b")

        mid_x = PAD + 100 + 68 + 20
        avail = cancel_x - 16 - mid_x
        tight = avail < 300  # drop the FROM/LEN captions before squashing the sliders
        cap_w = 0 if tight else 38
        val_w = 42
        group = (avail - 12) / 2

        x = mid_x
        if cap_w:
            label("FROM", x, cap_w, ROW_BOT, size=9, bold=True)
        self.from_slider = slider(
            x + cap_w + 4, group - cap_w - val_w - 8, 0, max(1.0, total - 1), 20.0
        )
        self.from_value = label(
            fmt_time(20.0), x + group - val_w, val_w, ROW_BOT,
            dim=False, align=AppKit.NSTextAlignmentRight,
        )

        x = mid_x + group + 12
        if cap_w:
            label("LEN", x, 28, ROW_BOT, size=9, bold=True)
        self.len_slider = slider(
            x + (28 if cap_w else 0) + 4,
            group - (28 if cap_w else 0) - val_w - 8,
            2,
            min(45.0, max(6.0, total)),
            12.0,
        )
        self.len_value = label(
            "12s", x + group - val_w, val_w, ROW_BOT,
            dim=False, align=AppKit.NSTextAlignmentRight,
        )

        self.status_label = label("ready", PAD, width - 2 * PAD, STATUS_Y + 8, size=10)

        panel.orderFront_(None)
        # Child window: moves, raises and closes with the plugin's own window.
        plugin_window.addChildWindow_ordered_(panel, AppKit.NSWindowAbove)
        self.panel = panel
        self.plugin_window = plugin_window
        self.attached = True



# ----------------------------------------------------------------------- main
def open_plugin(path, sub=None):
    try:
        return load_plugin(str(path), plugin_name=sub) if sub else load_plugin(str(path))
    except Exception as e:
        try:
            from pedalboard import AudioUnitPlugin

            names = AudioUnitPlugin.get_plugin_names_for_file(str(path))
        except Exception:
            names = []
        if names:
            print(f"{path.name} is a shell of {len(names)} plugins; pass --sub:")
            for n in names:
                print(f"  --sub {n!r}")
            return None
        print(f"could not load {path.name}: {e}")
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plugin", default=DEFAULT_PLUGIN)
    ap.add_argument("--preset", default=None, help="load an .aupreset by name")
    ap.add_argument("--track", default=DEFAULT_TRACK, help="track id from tools/lib/tracks.js")
    ap.add_argument(
        "--loops",
        type=int,
        default=DEFAULT_LOOPS,
        help="loop the song this many times before the plugin sees it",
    )
    ap.add_argument("--src", default=None, help="audition an audio file instead of a track")
    ap.add_argument("--save-preset", default=None, help="install to your AU preset library")
    ap.add_argument("--sub", default=None, help="sub-plugin inside a shell (WaveShell etc.)")
    ap.add_argument("--list", action="store_true", help="list a shell's contents and exit")
    ap.add_argument("--tracks", action="store_true", help="list available tracks and exit")
    args = ap.parse_args()

    tracks = list_tracks()
    track_map = {t["title"]: t for t in tracks}

    if args.tracks:
        for t in tracks:
            print(f"  {t['id']:24} {t['title']}")
        return

    plugin_path = resolve_plugin(args.plugin)

    if args.list:
        from pedalboard import AudioUnitPlugin

        for n in AudioUnitPlugin.get_plugin_names_for_file(str(plugin_path)):
            print(f"  {n}")
        return

    loops = args.loops if args.loops in LOOP_CHOICES else DEFAULT_LOOPS
    if loops != args.loops:
        print(f"--loops must be one of {LOOP_CHOICES}; using {loops}")

    current_track = None
    if args.src:
        src = Path(args.src)
        if not src.is_absolute():
            src = REPO / src
        if not src.exists():
            sys.exit(f"no such source file: {src}")
        song_title_now = src.name
    else:
        current_track = next((t for t in tracks if t["id"] == args.track), None)
        if not current_track:
            sys.exit(f"unknown track {args.track!r} — try --tracks for the list")
        src = ensure_rendered(current_track, loops, print)
        if not src:
            sys.exit("could not render that track")
        song_title_now = current_track["title"]

    plugin_map = {v[0].stem: v[0] for v in all_plugins().values()}
    preset = resolve_preset(args.preset)

    app = AppKit.NSApplication.sharedApplication()
    # Launched from the .app bundle there is no Terminal to inherit focus
    # from, so claim it explicitly or the editor opens behind everything.
    app.setActivationPolicy_(AppKit.NSApplicationActivationPolicyRegular)
    app.activateIgnoringOtherApps_(True)
    # The .app bundle runs python as a child, so the Dock tile belongs to
    # python and shows its generic icon. Paint ours onto it at runtime.
    try:
        sys.path.insert(0, str(HERE))
        from audition_icon import draw

        app.setApplicationIconImage_(draw())
    except Exception:
        pass  # cosmetic only
    audio, sr = load_audio(src)
    if current_track is None and loops > 1:
        audio = np.tile(audio, (1, loops))  # a plain file has no bank to re-render

    while True:
        plugin = open_plugin(plugin_path, args.sub)
        if plugin is None:
            return
        print(f"plugin: {plugin.name}  ({plugin_path.name})")
        push_recent(plugin_path.stem)
        if preset:
            plugin.raw_state = preset.read_bytes()
            print(f"preset: {preset.stem}")
            preset = None  # only seeds the first plugin
        print(f"source: {src.name}  {audio.shape[1] / sr:.1f}s @ {sr} Hz")

        ctx = {
            "plugin": plugin,
            "plugin_path": plugin_path,
            "plugin_map": plugin_map,
            "track_map": track_map,
            "src": src,
            "song_title": song_title_now,
            "track": current_track,
            "loops": loops,
            "audio": audio,
            "sr": sr,
            "duration": audio.shape[1] / sr,
            "close_event": threading.Event(),
            "committed": False,
            "switch_to": None,
            "out_path": None,
            "default_name": f"{src.stem}--{plugin_path.stem}.wav",
            "default_dir": src.parent,
        }

        bar = Bar.alloc().initWithCtx_(ctx)
        # show_editor blocks the main thread but pumps this run loop, so the
        # timer still fires and can glue the bar on once the editor exists.
        timer = NSTimer.scheduledTimerWithTimeInterval_target_selector_userInfo_repeats_(
            0.25, bar, "tick:", None, True
        )
        print("\n>>> Plugin + transport bar open. OK renders, Cancel discards.\n")
        plugin.show_editor(ctx["close_event"])
        timer.invalidate()
        bar.teardown()

        # The song popup may have swapped these out from under us.
        src, audio, sr = ctx["src"], ctx["audio"], ctx["sr"]
        song_title_now = ctx["song_title"]
        current_track, loops = ctx["track"], ctx["loops"]

        if ctx["switch_to"]:
            plugin_path = ctx["switch_to"]
            args.sub = None  # a shell pick would need its own --sub
            print(f"switching to {plugin_path.stem}…")
            continue
        break

    if not ctx["committed"]:
        print("cancelled — nothing written")
        return

    out = ctx["out_path"]
    print("rendering full track…")
    wet = plugin(pad(audio, sr), sr, reset=True)
    with AudioFile(str(out), "w", sr, wet.shape[0]) as f:
        f.write(wet)
    print(f"wrote {out}  ({wet.shape[1] / sr:.1f}s, {wet.shape[0]} ch)")

    # Settings land beside the audio, so a render is never orphaned from the
    # state that produced it.
    pl = plistlib.loads(plugin.raw_state)
    pl["name"] = args.save_preset or out.stem
    blob = plistlib.dumps(pl, fmt=plistlib.FMT_BINARY)
    preset_out = out.with_suffix(".aupreset")
    preset_out.write_bytes(blob)
    print(f"wrote {preset_out.name}")

    if args.save_preset:
        dest = PRESETS / "Claude" / plugin.name / f"{args.save_preset}.aupreset"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(blob)
        print(f"installed to preset library: {dest}")


if __name__ == "__main__":
    main()
