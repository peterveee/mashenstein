# Mixer Group Buses — Handover Specification

Status: Proposed implementation spec  
Scope: Song Mixer fixed subgroup routing  
Groups: Group 1 and Group 2 only; non-nested

## 1. Decision summary

Add two optional subgroup buses to the mixer. A channel may be assigned to no group, Group 1, or Group 2. Assigned channels are summed into the selected bus, where the bus can control the combined level and apply effects to the whole group.

The user-facing design is deliberately compact:

- Add two small assignment buttons to the existing channel-strip M/S control row: `1 M S 2`.
- The buttons are mutually exclusive. A channel can belong to at most one group.
- Group strips are hidden until at least one channel is assigned to them.
- When active, group strips appear in stable order before the existing Delay and Reverb returns.
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

### 3.1 Channel-strip assignment controls

Place the controls on the existing M/S row, using the available space shown in the current strip design:

```text
[ 1 ] [ M ] [ S ] [ 2 ]
```

The visible labels remain `1` and `2`. Each button must also have an accessible name and tooltip:

- `Assign to Group 1`
- `Assign to Group 2`

Recommended states:

| State | Appearance | Behaviour |
|---|---|---|
| Unassigned | Normal/inactive | Channel routes directly to the main music bus. |
| Assigned to Group 1 | Highlighted with Group 1 colour | Channel routes to Group 1. |
| Assigned to Group 2 | Highlighted with Group 2 colour | Channel routes to Group 2. |
| Active group clicked again | Returns to inactive | Assignment is cleared and the channel routes directly to the main bus. |

Selecting `1` automatically clears `2`, and vice versa. This avoids a hidden multi-route state and keeps the controls radio-like while retaining a fast click-to-clear interaction.

The active state must be distinguishable without relying on colour alone. Use the existing selected/active treatment plus a small visible state difference such as a filled button, border, or glyph. The controls must remain usable at the current compact mixer density and on touch screens.

### 3.2 Group strips

Group strips are conditional UI, not permanent columns.

- No assigned channels: Group 1 and Group 2 strips are absent.
- First member assigned: the corresponding group strip is created and shown.
- Last member removed: the strip is hidden after its audio branch has safely gone idle.
- If only Group 2 is active, show Group 2; do not show an empty Group 1 placeholder.
- Preserve the stable ordering `Group 1`, `Group 2`, `Delay`, `Reverb`, filtering out inactive groups.

The group strip should use the same visual language as the existing mixer strips and expose, at minimum:

- Group label (`Group 1` or `Group 2`).
- Level fader.
- Mute and solo controls with documented group semantics.
- Meter while the group is active.
- Group EQ and insert/effect access.

Pan/width may follow the existing strip model if the implementation supports it cleanly. Group sends are not required in v1.

Clicking the group strip or its effect area must select that bus in the same way as a channel or return, so the existing effects panel can edit the group effect chain.

### 3.3 Assignment discoverability

The compact buttons are the resting affordance. No always-open assignment panel is required.

If a secondary menu is useful for accessibility or narrow layouts, it may expose:

```text
Assign to Group
  None
  Group 1
  Group 2
```

The secondary menu must use the same underlying assignment action as the `1` and `2` buttons; it must not introduce a separate state model.

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

Recommended default: group mute should silence the group’s audible main path and the member contributions to the existing sends; group solo should follow the mixer’s current solo model and include the group’s audible return tails where possible. If that requires changing current aux gating, isolate it behind a focused implementation and test it separately rather than embedding an accidental behaviour in the routing rewrite.

## 5. State and persistence

Assignments belong to channels/lanes. Group strip settings belong to the mix, not to the Delay/Reverb auxiliary definitions.

Recommended shape:

```js
{
  lanes: {
    kick:  { group: 1 },
    snare: { group: 1 },
    bass:  {}
  },
  groups: {
    group1: {
      gain: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: []
    },
    group2: {
      gain: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: []
    }
  }
}
```

Implementation details:

- `group` accepts only `1`, `2`, or omission/null for unassigned.
- A lane never stores more than one group assignment.
- Group state should use complete snapshots, matching the existing effect-preset/state conventions.
- Default group state may be omitted during serialization, but non-default fader, mute/solo, or effect settings should survive removal of the last member.
- Group settings must be restored when a channel is assigned again later.
- Existing songs with no group data must load with every channel unassigned and render as before.
- Do not store group routing inside `AUXES`; groups are main-path buses, not sends/returns.

Custom names can be added later without changing the routing model. The initial labels and persisted IDs should remain stable.

## 6. Engine implementation notes

### 6.1 Separation from AUXES

The current `AUXES` collection represents shared Delay/Reverb returns and drives the channel send controls. Groups should be a separate fixed collection, for example:

```js
const GROUPS = [
  { id: 'group1', label: 'Group 1' },
  { id: 'group2', label: 'Group 2' }
];
```

Do not add groups to `AUXES`, because doing so would incorrectly create send controls and treat the group as a parallel effect return.

### 6.2 Lazy activation

Keep group state available even when a group has no members, but do not keep an unnecessary live audio branch:

- On first assignment, create or wake the group input, sum path, processing chain, output connection, and meter.
- On last removal, allow any required tail to finish, then disconnect/sleep the group branch and remove its strip from the active UI.
- A hidden group must not run a meter loop or process audio blocks.
- Reassigning a channel must not leave the old group input connected.
- Group settings remain in state while the nodes are dormant.

The existing reusable chain-slot/sleeping patterns should be preferred so the group effect chain has the same lifecycle behaviour as other mixer processing.

### 6.3 Safe routing changes

Changing a channel’s destination changes the audio graph. It must be click-safe and must never briefly feed both the direct and group paths at full level.

Use a short crossfade or equivalent gain handoff for manual assignment changes while playing. The old path should be faded down before it is disconnected, and the new path should be faded up after it is connected. The transition must be short enough not to feel sluggish but long enough to avoid a discontinuity; validate the chosen value with an offline impulse/click test and a live listening check.

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

## 8. Acceptance tests

### State and UI

- A channel starts unassigned when no group field is present.
- Clicking `1` assigns Group 1 and highlights only `1`.
- Clicking `2` moves the channel from Group 1 to Group 2 and highlights only `2`.
- Clicking the active group button clears the assignment.
- Group 1 and Group 2 strips appear only when their respective member count is greater than zero.
- Removing the final member hides the strip without resetting its fader or effects.
- Reassigning a channel later restores the previously saved group settings.
- Active strip order is deterministic: Group 1, Group 2, Delay, Reverb.
- The controls expose useful accessible names and work with keyboard/touch interaction.

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

### Persistence and compatibility

- Group assignments and group snapshots survive save/load.
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

These should be resolved in the implementation issue rather than inferred during the engine rewrite:

1. Whether group mute/solo gates member Delay/Reverb sends in v1, or only the group’s main output. The recommended behaviour is full source mute for group mute, but it needs focused regression tests.
2. Whether group pan/width is included in the first strip or deferred to keep the initial UI small.
3. The exact crossfade duration and whether assignment changes are permitted during every playback state.
4. Whether group settings with no current members are serialized always, or only when non-default.
5. Whether channel copy/duplicate operations copy group assignment by default.

## 10. Suggested implementation sequence

1. Add validated lane assignment state and group defaults without changing audio.
2. Add the `1 M S 2` controls and assignment actions.
3. Add dormant/active group state and conditional strip rendering.
4. Add one reusable group bus audio path and prove direct-versus-group routing with focused offline tests.
5. Add group fader, meter, mute/solo, and effect-panel targeting.
6. Add safe live reassignment and last-member sleep behaviour.
7. Add persistence/legacy compatibility tests.
8. Run real-song CPU comparisons and a listening pass for grouped drums, including group compression and mute/solo/send tails.

