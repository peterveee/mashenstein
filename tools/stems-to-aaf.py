#!/usr/bin/env python3
"""A folder of stems from tools/render-stems.js, as one AAF with the audio embedded.

Run through tools/render-aaf.js, which renders the stems first. Needs pyaaf2 in the
tools/.venv-audio virtualenv:

    tools/.venv-audio/bin/pip install pyaaf2

Usage: tools/.venv-audio/bin/python tools/stems-to-aaf.py <stemsDir> <out.aaf>
           [--title NAME] [--interleaved]

Every stem lands on its own track starting at 01:00:00:00, which is bar 1 of a new
Logic project. The stems are rendered at the mix's own gain, so at unity they keep
the mix's balance. Each one went through the song's master chain on its own, though,
so where that chain compresses or saturates, the sum is close to the mix but not equal
to it. render-stems.js prints the residual.

AAF has no stereo track. The convention every DAW reads (Pro Tools, Media Composer,
and Logic's importer) is dual mono: one mono essence per channel, on adjacent mono
tracks of the same length and position, named <stem>.L and <stem>.R. Logic folds a
pair like that back into one stereo region on import. --interleaved writes each stem
as a single two-channel essence on one track instead, which is legal AAF but not
what most importers expect. It's there in case an importer refuses the pairs.

The full mix (00-full-mix.wav) is left out. Summed with the stems, it would play
the song twice.
"""
import argparse
import os
import re
import sys
import wave

try:
    import aaf2
except ImportError:
    sys.exit('stems-to-aaf: pyaaf2 is not installed in this python. Run:\n'
             '  tools/.venv-audio/bin/pip install pyaaf2')
import numpy as np

# 01:00:00:00, Logic's (and Pro Tools') default SMPTE for bar 1. A start of zero would
# leave everything an hour before an importer's song start.
TC_FPS = 25
TC_START = TC_FPS * 60 * 60
CHANNEL_NAMES = {1: [''], 2: ['.L', '.R']}


def stem_files(folder):
    """Every stem WAV, in render order, except the full mix."""
    names = sorted(n for n in os.listdir(folder) if n.lower().endswith('.wav'))
    return [n for n in names if not n.startswith('00-')]


def stem_label(filename):
    # "03-lead.wav" → "lead". The number only keeps the folder in render order, and
    # the track order already carries that.
    return re.sub(r'^\d+-', '', os.path.splitext(filename)[0])


def read_wav(path):
    with wave.open(path, 'rb') as w:
        if w.getsampwidth() != 2:
            sys.exit(f'stems-to-aaf: {path} is not 16-bit PCM')
        rate, nch, frames = w.getframerate(), w.getnchannels(), w.getnframes()
        data = np.frombuffer(w.readframes(frames), dtype='<i2').reshape(-1, nch)
    return rate, data


def embed_pcm(f, name, rate, samples):
    """A file SourceMob holding `samples` (frames × channels int16) as embedded PCM."""
    frames, nch = samples.shape
    src = f.create.SourceMob(name)
    f.content.mobs.append(src)
    essence, slot = src.create_essence(rate, 'sound')
    d = f.create.PCMDescriptor()
    src.descriptor = d
    d['Channels'].value = nch
    d['BlockAlign'].value = 2 * nch
    d['SampleRate'].value = rate
    d['AverageBPS'].value = rate * 2 * nch
    d['QuantizationBits'].value = 16
    d['AudioSamplingRate'].value = rate
    d['ContainerFormat'].value = f.dictionary.lookup_containerdef('AAF')
    d.length = frames
    slot.segment.length = frames
    stream = essence.open('w')
    raw = np.ascontiguousarray(samples).tobytes()
    step = 1 << 20
    for i in range(0, len(raw), step):
        stream.write(raw[i:i + step])
    return src


def add_stem(f, comp, label, rate, data, interleaved, track_no):
    """One MasterMob for the stem, and its track(s) on the composition."""
    frames, nch = data.shape
    master = f.create.MasterMob(label)
    f.content.mobs.append(master)

    if interleaved or nch == 1:
        parts = [(label, data)]
    else:
        parts = [(label + suffix, data[:, c:c + 1]) for c, suffix in enumerate(CHANNEL_NAMES[nch])]

    for i, (name, samples) in enumerate(parts, 1):
        src = embed_pcm(f, name + '.PHYS', rate, samples)
        mslot = master.create_timeline_slot(edit_rate=rate)
        mslot.segment = src.create_source_clip(slot_id=1, media_kind='sound')
        mslot.segment.length = frames
        mslot.name = name
        mslot['PhysicalTrackNumber'].value = i

        cslot = comp.create_sound_slot(edit_rate=rate)
        cslot.name = name
        cslot['PhysicalTrackNumber'].value = track_no
        clip = master.create_source_clip(slot_id=mslot.slot_id, length=frames)
        cslot.segment.components.append(clip)
        cslot.segment.length = frames
        track_no += 1
    return track_no, frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('stems')
    ap.add_argument('out')
    ap.add_argument('--title', default=None)
    ap.add_argument('--interleaved', action='store_true')
    args = ap.parse_args()

    files = stem_files(args.stems)
    if not files:
        sys.exit(f'stems-to-aaf: no stem WAVs in {args.stems}')
    title = args.title or os.path.basename(os.path.normpath(args.stems))

    longest = 0
    rate = None
    with aaf2.open(args.out, 'w') as f:
        comp = f.create.CompositionMob(title)
        comp.usage = 'Usage_TopLevel'
        f.content.mobs.append(comp)

        # The timecode track comes first, as in an Avid or Pro Tools export.
        tc_slot = comp.create_timeline_slot(edit_rate=TC_FPS)
        tc_slot.name = 'TC1'
        tc = f.create.Timecode(TC_FPS)
        tc.start = TC_START
        tc_slot.segment = tc

        track_no = 1
        for name in files:
            r, data = read_wav(os.path.join(args.stems, name))
            if rate is None:
                rate = r
            elif r != rate:
                sys.exit(f'stems-to-aaf: {name} is {r} Hz, the others are {rate} Hz')
            track_no, frames = add_stem(f, comp, stem_label(name), r, data, args.interleaved, track_no)
            longest = max(longest, frames)

        tc.length = -(-longest * TC_FPS // rate)

    size = os.path.getsize(args.out) / 1e6
    layout = 'interleaved stereo' if args.interleaved else 'dual mono (.L/.R pairs)'
    print(f'{args.out}: {len(files)} stems, {track_no - 1} tracks, {layout}, '
          f'{longest / rate:.1f}s at {rate} Hz, {size:.0f} MB')


if __name__ == '__main__':
    main()
