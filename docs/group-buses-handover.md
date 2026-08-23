# Mixer Group Buses — Handover Specification

Status: Proposed implementation spec  
Scope: Song Mixer fixed subgroup routing  
Groups: Group 1 and Group 2 only; non-nested

## 1. Decision summary

Add two optional subgroup buses to the mixer. A channel may be assigned to no group, Group 1, or Group 2. Assigned channels are summed into the selected bus, where the bus can control the combined level and apply effects to the whole group.

The user-facing design is deliberately compact:

- Add one compact group selector beside the existing channel-strip M/S controls.
- The selector displays `—` when unassigned and the selected group number when assigned, for example `1 M S`.
- The first release exposes Groups 1 and 2. The selector model should support adding Groups 3 and 4 later without changing the channel state shape.
- Group strips are hidden until at least one channel is assigned to them.
- When active, group strips appear immediately to the left of the Master strip, after the existing Delay and Reverb returns.
- Removing the last member hides and sleeps the group strip, while retaining its saved settings for later reuse.

This is subgroup routing, not a send. “Assign to Group” or “Route to Group” is the correct terminology. A send creates a parallel copy to an effect or auxiliary return; group assignment changes the channel’s main destination.

## 2. Goals and non-goals

### Goals

- Control several channels together with one group fader.
- Apply one effect chain to the summed group signal instead of duplicating that effect on every member channel.
- Keep the normal channel strip compact and avoid a permanent group section.
- Preserve existing mixes and existing Delay/Reverb send controls.
- Make unused groups impose no meaningful audio or UI cost.
- Make group assignment and removal safe while audio is playing.
- Keep Group 1 and Group 2 predictable, visible, and easy to discover.

### Non-goals for the first implementation

- Nested groups or routing a group into another group.
- An arbitrary number of user-created buses.
- Custom group names.
- Group-specific send knobs in the channel strip.
- Bar-level automation or treatment transitions for group membership.
- Replacing the existing Delay/Reverb auxiliary architecture.

## 3. User interface

### 3.1 Channel-strip group selector

Place one compact selector beside the existing M/S controls, using the available space shown in the current strip design:

```text
[ — ] [ M ] [ S ]
```

After assignment, the selector displays the group number:

```text
[ 1 ] [ M ] [ S ]
```

Clicking the selector opens a small menu. The first release exposes:

```text
Group
  None
  1
  2
```

The menu should be generated from the available group definitions so that `3` and `4` can be exposed later without redesigning the channel strip. The control must have an accessible name such as `Channel group assignment`, with the current state included where appropriate.

Recommended states:

| State | Appearance | Behaviour |
|---|---|---|
| Unassigned | Displays `—` and normal/inactive styling | Channel routes directly to the main music bus. |
| Assigned to Group 1 | Displays `1`, highlighted with Group 1 colour | Channel routes to Group 1. |
| Assigned to Group 2 | Displays `2`, highlighted with Group 2 colour | Channel routes to Group 2. |

The selector is single-valued: choosing a group automatically replaces any previous assignment. Choosing `None` clears the assignment. There must never be a hidden multi-route state.

The active state must be distinguishable without relying on colour alone. Use the existing selected/active treatment plus a small visible state difference such as a filled selector, border, or glyph. The control must remain usable at the current compact mixer density and on touch screens.

### 3.2 Group strips

Group strips are conditional UI, not permanent columns.

- No assigned channels: Group 1 and Group 2 strips are absent.
- First member assigned: the corresponding group strip is created and shown.
- Last member removed: the strip is hidden immediately; the audio branch retires later, on its own schedule (see 6.4).
- If only Group 2 is active, show Group 2; do not show an empty Group 1 placeholder.
- Preserve the stable ordering `Delay`, `Reverb`, active groups in numeric order, `Master`. Group strips must remain adjacent to Master; inactive groups do not leave gaps.

The group strip should use the same visual language as the existing mixer strips and expose, at minimum:

- Group label (`Group 1` or `Group 2`).
- Level fader.
- Mute and solo controls with documented group semantics.
- Meter while the group is active.
- Group EQ and insert/effect access.

Pan/width may follow the existing strip model if the implementation supports it cleanly. Group sends are not required in v1.

Clicking the group strip or its effect area must select that bus in the same way as a channel or return, so the existing effects panel can edit the group effect chain.

### 3.3 Assignment discoverability

The compact selector is the resting affordance. No always-open assignment panel is required.

The selector menu should expose:

```text
Assign to Group
  None
  1
  2
  3 (when enabled)
  4 (when enabled)
```

The menu must use the same underlying assignment action as the compact selector; it must not introduce a separate state model.

## 4. Audio behaviour

### 4.1 Main signal routing

Conceptually, the signal path becomes:

```text
Unassigned channel
  channel processing -> main music bus

Channel assigned to Group 1 or 2
  channel processing -> selected group input
  group input sum -> group processing/fader -> main music bus
```

An assigned channel must not also connect directly to the main music bus. This is the most important routing invariant: assignment must not double the channel’s level.

The cut point is not a free choice. In the current engine every strip already has exactly one route into the mix: its `monitor` gain — `monitor.connect(musicBus)` in `src/engine/mixer.js`, “the strip's only route to the mix” — which sits after the fader, the EQ, the insert chain, the width stage, and after the send taps. Group assignment redirects that one connection (`monitor -> group input` instead of `monitor -> musicBus`) and touches nothing else. Redirecting anything earlier — the width node, the chain slot output — silently breaks bus solo, which works by zeroing every strip’s `monitor`, and breaks it in a way none of the level-based tests below would catch. Name `monitor` in the implementation and assert on it.

The group bus receives the output of each assigned channel and sums those signals before applying group-level processing. A compressor, saturation effect, or other nonlinear effect placed on the group therefore processes the combined signal once.

### 4.2 Recommended v1 processing order

Use a consistent bus order and document it in the engine code. The recommended conceptual order is:

```text
group sum -> group EQ -> group insert chain -> group fader/pan/width -> main music bus
```

The exact node order should follow the established mixer conventions where compatibility requires it. The externally observable requirements are that the group effect chain processes the sum, the group level controls the combined output, and the bus does not create a parallel duplicate.

### 4.3 Existing Delay/Reverb sends

For v1, retain the existing per-channel Delay and Reverb send controls and data model. Do not silently convert them into group sends when a channel is assigned.

This keeps existing songs compatible and avoids changing the sound of current mixes. It also means the first version should explicitly document that:

- Group effects and group fader control the group’s main/dry bus output.
- Existing channel sends continue to feed the shared Delay/Reverb returns using their current semantics.
- Group mute/solo behaviour must be decided and tested against those existing sends before implementation is considered complete.

**Group mute is a broadcast, not a node.** The desired behaviour — group mute silences the members’ Delay/Reverb contributions too — cannot be a gain on the bus, because the sends tap `pres` *inside each member strip*, upstream of the group by definition. So group mute means writing into member strips, and it needs composition rules stated up front:

- A member’s audible state is `!laneMute && !groupMute`. Unmuting the group must never unmute a lane the user muted individually, and vice versa.
- The group’s mute flag lives only in group state. It is never written into member lane state, or it would land in the saved mix and in the mix signature as a lane edit the user did not make.
- A member strip whose group is muted shows a distinct “muted by group” treatment, not the lane’s own mute state.

**Group solo joins the channel solo set, not the bus one.** The mixer has two solo models with different semantics: channel solo gates each strip’s `vol` (pre-fader, pre-send), and bus solo (`soloedAux`) zeroes every strip’s `monitor` to hear a return alone. A group must **not** join `soloedAux`: doing so would zero its own members’ monitors — which now feed the group — so soloing the group would produce silence. Instead, group solo adds every current member’s key to the channel `soloed` set. That composes with per-channel solo for free, keeps send tails audible under the existing rules, and means the group strip needs no gate node of its own. Membership changes while a group is soloed must update the set.

### 4.4 Sends are pre-group-fader

Because sends tap inside the member strips, the group fader does not scale them: pull Group 1 down 10 dB and its members still feed the reverb at full send level, so the group gets relatively wetter as it gets quieter. This is how a hardware console behaves and is the intended v1 behaviour — but it is surprising enough on a drum bus that it must be documented, not discovered. Do not “fix” it by reaching into member send gains from the group fader.

## 5. State and persistence

Assignments belong to channels/lanes. Group strip settings belong to the mix, not to the Delay/Reverb auxiliary definitions.

Recommended shape:

```js
{
  lanes: {
    kick:  { group: 'group1' },
    snare: { group: 'group1' },
    bass:  {}
  },
  groups: {
    group1: {
      gain: 0,
      pan: 0,
      mute: false,
      effects: []
    },
    group2: {
      gain: 0,
      pan: 0,
      mute: false,
      effects: []
    }
  }
}
```

There is deliberately no `solo` in the persisted shape. The mixer’s rule is explicit in the strip code: solo is monitoring and is never saved; mute is part of the mix and is. Lane state carries `mute` and never `solo`, and group state follows the same line.

Implementation details:

- `group` holds a string group ID (`'group1'`) or is omitted/null for unassigned — string IDs, matching the desk’s convention everywhere else (`AUXES` ids, `__aux:` panel keys); the numeral is a display concern. The first release validates/exposes only `group1` and `group2`; the state shape must not require a separate field for each group.
- A lane never stores more than one group assignment.
- Group state should use complete snapshots, matching the existing effect-preset/state conventions.
- Default group state may be omitted during serialization, but non-default fader, mute, or effect settings should survive removal of the last member.
- Group settings must be restored when a channel is assigned again later.
- Existing songs with no group data must load with every channel unassigned and render as before.
- Do not store group routing inside `AUXES`; groups are main-path buses, not sends/returns.

### 5.1 The four files that must agree

Lane and group state crosses four places, and the spec names them because they have drifted before:

1. `src/data/mix.js` — `laneSettings` spreads `...entry` over the defaults, so a `group` key flows through untouched. `LANE_DEFAULTS` does not need a `group` field; absence means unassigned.
2. `tools/lib/mix-source.js` — the serialiser must write `group` on lanes and the `groups` block, in the same rounded, defaults-elided style as everything else.
3. `tools/lib/mix-signature.js` — **`laneSig` builds its result from a fixed field list** (gain, pan, width, mute, send, eq, effects, noteFx). An unknown lane key is silently dropped. Without an explicit `group` field in `laneSig` and a `groups` section in the mix signature, assigning a channel to a group leaves Save reading “Saved — matches the file” with the button disabled — the exact bug that file’s own header documents for sends. This is a guaranteed failure, not a check-if-needed.
4. `tests/mix.js` — holds `mixSignature` and `renderMixFile` to each other in both directions; it needs group cases for both (a group edit changes the signature; two mixes serialising identically have equal signatures).

Two interactions with existing lane machinery:

- **Layers.** A mix entry can mint lane keys via `entry.layers`; those lanes must be assignable to groups, and assignment validation has to accept layer keys, not just `LANE_KEYS`.
- **Deleted lanes.** A lane removed via `entry.off` must not count as a member: it must not hold a group strip open or keep the group branch awake.

Custom names can be added later without changing the routing model. The initial labels and persisted IDs should remain stable.

## 6. Engine implementation notes

### 6.1 Separation from AUXES

The current `AUXES` collection represents shared Delay/Reverb returns and drives the channel send controls. Groups should be a separate fixed collection, for example:

```js
const GROUP_DEFINITIONS = [
  { id: 'group1', index: 1, label: 'Group 1' },
  { id: 'group2', index: 2, label: 'Group 2' }
  // Future definitions can add indexes 3 and 4.
];
```

The channel selector and active-strip collection should be generated from these definitions. Do not add groups to `AUXES`, because doing so would incorrectly create send controls and treat the group as a parallel effect return.

The effects panel addresses returns as `__aux:<id>`; groups get the parallel key `__group:<id>` (e.g. `__group:group1`). The desk pattern-matches on the `__aux:` prefix in several places (labels, chain lookup, effect application), so the group key must be its own prefix, wired into each of those switch points — not smuggled through the aux path.

Group effect chains need the same bpm plumbing as aux chains (`setAuxEffects(id, effects, bpm)`): a tempo-synced delay on a group must follow the song’s bpm exactly as a return’s does.

### 6.2 Lazy activation

Keep group state available even when a group has no members, but do not keep an unnecessary live audio branch:

- On first assignment, create or wake the group input, sum path, processing chain, output connection, and meter.
- On last removal, allow any required tail to finish, then disconnect/sleep the group branch and remove its strip from the active UI.
- A hidden group must not run a meter loop or process audio blocks.
- Reassigning a channel must not leave the old group input connected.
- Group settings remain in state while the nodes are dormant.

The existing reusable chain-slot/sleeping patterns should be preferred so the group effect chain has the same lifecycle behaviour as other mixer processing.

**The meter is created on wake and disconnected on sleep — never built with the group and left wired.** `makeMeter` routes through a muted sink into `ctx.destination` precisely so the browser always pulls it; the aux code documents the flip side of that (“metering the return would keep the convolver alive against pruneAuxes — a meter is only pulled if it has a path to the destination”). A permanently connected group meter pins the dormant group’s whole chain into the pull graph and quietly falsifies every bullet above.

### 6.3 Safe routing changes

Changing a channel’s destination changes the audio graph. It must be click-safe and must never briefly feed both the direct and group paths at full level.

Use a short crossfade or equivalent gain handoff for manual assignment changes while playing. The old path should be faded down before it is disconnected, and the new path should be faded up after it is connected. The transition must be short enough not to feel sluggish but long enough to avoid a discontinuity; validate the chosen value with an offline impulse/click test and a live listening check.

The crossfade applies to *manual reassignment during playback only*. Routing established at load time, by `applyMix`, or at the start of an offline render is set directly, with no fade — otherwise every bounce of a grouped song opens with its grouped channels fading in from silence, the render stops matching live playback, and the null test moves.

Initially, group membership changes should be ordinary immediate mixer actions. Do not add them to bar-level treatment/ramp transitions until the state scheduler has an explicit graph-transition contract for them.

### 6.4 Metering and UI lifecycle

Only active groups need live meter work. The UI should derive strip visibility from active membership, not from whether a group has stored settings. A hidden group may still have persisted fader/effect values.

The first assignment and last removal should update all of the following as one state change:

1. Channel button active state.
2. Audio routing.
3. Active group collection.
4. Group strip visibility/order.
5. Effects-panel target availability.
6. Meter registration.

“One state change” covers the *UI and state* items — the audio branch is the exception, deliberately. Hiding cannot wait on idle detection: a group reverb tail can run for seconds and is not bounded, so the strip hides immediately on last removal while the existing `sleepWhenSilent` chain-slot detector retires the branch when the tail actually ends. Do not invent a hide timer; the two lifecycles are decoupled on purpose.

The audio-health watchdog’s escalation path rebuilds “every lane and return chain” when the output dies. Group buses must join that sweep: a NaN poisoning a group branch silences every member at once and must be as recoverable as a poisoned lane or return.

## 7. CPU and memory expectations

The feature should have near-zero steady-state audio cost when no groups are assigned because both group branches are dormant. The UI cost is also limited to two small buttons per channel.

When a group is active, the base cost is a small number of native gain/pan/mix nodes plus one active meter. This cost is negligible compared with synthesis, convolution reverb, or a channel insert chain.

Group processing can reduce CPU when it replaces repeated processing on individual channels:

```text
four channel compressors  -> four compressor instances
one group compressor      -> one compressor instance
```

It can increase CPU when users add effects to both individual channels and groups, or when both groups are active with independent effect chains. The implementation must not promise a fixed percentage without measurement.

Benchmark at least these cases using a real representative song:

1. No groups assigned.
2. One active group with several channels and no inserts.
3. One active group with a compressor and EQ.
4. Two active groups with independent effect chains.
5. The same processing duplicated on individual channels for comparison.

Record render time, audio underruns/overloads if available, active node/processor counts where exposed, and peak memory. The no-group case must remain within the existing performance baseline.

### 7.1 Stem export and nonlinear group processing

`tools/render-stems.js` renders each lane in isolation and asserts the stems sum back to the full mix (“if the stems ever stop summing to the mix, the export is silently wrong and only an ear would catch it”). Linear group processing — gain, pan, EQ, width — distributes over a sum and keeps that promise. A group **compressor or saturator does not**: a lane rendered alone through the group compressor is not the same signal as that lane inside the sum. This is inherent to bus compression, not a routing bug, and the headline use case of this feature (“one group compressor instead of four”) triggers it directly.

The export has to own this rather than let the residual assertion fire mysteriously:

- Either render stems with the full group population live and isolate the lane *after* the group (which changes what a stem means and must be documented in the stems README), or
- `render-stems.js` detects a nonlinear insert on an active group and prints an explicit warning naming the group, instead of a failed residual with no explanation.

Either answer is acceptable; silence is not.

### 7.2 Metering is pre-group

The channel meter taps inside the strip, upstream of the group fader. A channel reading −6 whose group sits at −10 is not contributing −6 to the master. This is one honest, visible extra gain stage — acceptable under the desk’s absolute-controls rule only because the strip’s selector shows the assignment. That is an argument for the selector being always visible on the strip, not revealed on hover.

## 8. Acceptance tests

### State and UI

- A channel starts unassigned when no group field is present.
- Choosing `1` assigns Group 1 and displays `1` in the selector.
- Choosing `2` moves the channel from Group 1 to Group 2 and displays `2`.
- Choosing `None` clears the assignment and displays `—`.
- Group 1 and Group 2 strips appear only when their respective member count is greater than zero.
- Removing the final member hides the strip without resetting its fader or effects.
- Reassigning a channel later restores the previously saved group settings.
- Active strip order is deterministic: Delay, Reverb, active groups in numeric order, Master, with groups adjacent to Master.
- The selector exposes a useful accessible name and works with keyboard/touch interaction.

### Audio correctness

- An unassigned channel reaches the main music bus exactly once.
- An assigned channel reaches the selected group exactly once and does not also reach the main music bus directly.
- Two or more assigned channels are summed into one group processing path.
- Group fader changes the combined group level without changing member balance.
- A group effect processes the summed signal once.
- Moving a channel between groups does not produce a click, pop, stale connection, or audible double level.
- Removing the last member eventually stops group processing and does not cut an unrelated return tail.
- Existing songs with no group assignments retain their previous audio output within the project’s normal deterministic tolerance.
- Existing Delay/Reverb send behaviour is covered explicitly, including group mute and solo.
- A grouped song’s offline bounce is identical to its live routing — no crossfade-in at bar one (see 6.3).

### Solo and mute interactions

- Soloing a group makes exactly its members audible, including their send tails.
- Soloing one member of a group behaves as ordinary channel solo — the group carries only that member.
- Soloing the Delay or Reverb return (bus solo) still works while channels are grouped: the return is heard alone and the group path is silenced with the other strips.
- Group mute silences the members’ main path and their send contributions; unmuting the group restores only lanes not individually muted.
- A member muted individually stays muted through group mute/unmute cycles, and its saved lane state never gains a mute it did not have.

### Stems

- Stems of a grouped song with only linear group processing still sum to the mix within the existing residual bound.
- A nonlinear group insert produces the documented, explicit behaviour chosen in 7.1 — never a silently failed residual.

### Persistence and compatibility

- Group assignments and group snapshots survive save/load.
- Assigning, clearing, or editing a group changes `mixSignature`; a signature blind to any group field fails the test (see 5.1 — `laneSig` has a fixed field list and needs `group` added explicitly).
- Default group data does not unnecessarily inflate existing song files.
- Old song data without `groups` loads safely.
- Invalid group IDs are treated as unassigned or rejected through the normal validation path; they must never create an arbitrary route.
- Copy/paste or channel duplication either preserves assignment intentionally or clears it consistently with the existing channel-state rules.

### Performance

- No-group CPU and memory remain at baseline.
- Dormant groups do not run audio processing or live metering.
- Active group cost is measured for one and two groups.
- Offline renders remain finite and deterministic.

## 9. Open decisions before coding

Resolved by this spec (they decide the architecture, so they could not stay open):

- Group mute gates member sends, implemented as a broadcast into member strips with the composition rules in 4.3 — it is not a bus gain node. This decides what `groups.group1.mute` *is* and therefore precedes step 1 of the sequence below.
- Group solo joins the channel `soloed` set (4.3), and solo is never persisted (5).
- Stem export behaviour for nonlinear group inserts follows 7.1 — pick one of the two options there, but silence is off the table.

Still open, to be resolved in the implementation issue:

1. Whether group pan/width is included in the first strip or deferred to keep the initial UI small.
2. The exact crossfade duration for manual reassignment, and whether assignment changes are permitted during every playback state. (Load/apply/offline routing is instant — see 6.3; only the manual-change fade is open.)
3. Whether group settings with no current members are serialized always, or only when non-default.
4. Whether channel copy/duplicate operations copy group assignment by default.

## 10. Suggested implementation sequence

1. Add validated lane assignment state and group defaults without changing audio — including `laneSig`/`mixSignature` and serialiser coverage (5.1), so Save is honest from the first commit.
2. Add the compact group selector and assignment actions.
3. Add dormant/active group state and conditional strip rendering.
4. Add one reusable group bus audio path — redirecting the strip `monitor` (4.1) — and prove direct-versus-group routing with focused offline tests.
5. Add group fader, meter, mute/solo (broadcast mute, member-set solo per 4.3), and `__group:` effect-panel targeting.
6. Add safe live reassignment and last-member sleep behaviour.
7. Add persistence/legacy compatibility tests, the stems decision from 7.1, and the watchdog sweep (6.4).
8. Run real-song CPU comparisons and a listening pass for grouped drums, including group compression and mute/solo/send tails.
