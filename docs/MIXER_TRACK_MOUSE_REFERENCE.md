# Track rows and channel-strip mouse reference

Source audit: 24 October 2026. Describes the current handlers, not a proposed interaction design. Header selection, track right-click, strip-header right-click and compact More menu were also checked in the browser. Other gestures remain source-audited. References below point to implementation functions so the document remains useful when line numbers change.

“Select” means make the lane current and refresh the views tied to that lane. It does not necessarily open a closed channel panel. “Adjust” means the simple sound editor (`editVoice` with `advanced: false`), not the whole-track adjustment expander. A preset picker changes the sound; it does not rename the track.

## Arrangement: ordinary track header (left of the bars)

| Target | Left click | Left double-click | Right click |
| --- | --- | --- | --- |
| Track/preset name, number, instrument icon, frozen snowflake, category or empty header | Select the track, matching mixer strip and channel-panel contents | Play from the track's first entry | Select track and open the compact track actions menu |
| M / S | Toggle mute / monitoring solo without changing selection | Two ordinary toggles; header playback excluded | Track actions menu |
| Level slider/rail | Set level; drag changes it continuously; click also selects | Reset level to 0 dB; header playback excluded | Native input behavior; custom menu ignores inputs |
| FX button | Select and open channel panel | Header playback can also run if the event reaches it | Track actions menu |
| NFX label | Open track Note FX editor | Header playback can also run if the event reaches it | Track actions menu |

The track menu shares the channel panel's More actions, headed by **Preset**, **Adjust Preset**, and **Edit Preset** (where supported). It includes Note FX, percussion choke assignment where applicable, channel/track/note copy and paste, duplicate, freeze, effect bypass, resets and delete. Unavailable clipboard actions are disabled. The panel-position action appears at the bottom of the panel's More menu; collapse uses the header button.

The FX button appears when the track has effects; NFX indicates enabled track Note FX. The snowflake, VU fill and temporary gain readout are informational, with no independent editor action.

## Arrangement: bars to the right

| Target | Left click | Left double-click | Right click |
| --- | --- | --- | --- |
| Bar content, including its rendered note/operation marks | Select lane and bar. Shift-click extends the existing selection. Re-clicking the selected bar focuses its editors | Open the note editor for this lane and bar; preceding clicks select it | Open the bar/region action menu, rather than Adjust |
| Bar's ▶ button | Select lane, mark this bar, and immediately start playback here | Explicitly stops the bar double-click action; does not open the note editor. Preceding clicks still invoke playback | No dedicated context-menu handler; inherits the bar menu |

Bar badges should not be assumed to be independent editor buttons: the bar-level handlers above own the cell unless a child control explicitly intercepts the event.

## Mixer: ordinary channel-strip header

| Target | Left click | Left double-click | Right click |
| --- | --- | --- | --- |
| Track/preset name, number, category, synth abbreviation, family chip, frozen badge or empty header | Select the channel, matching arrangement row and channel-panel contents | Play from the lane's first entry | Same channel context menu as the rest of the strip |

No header label opens a preset picker on left-click. Number, category, synth abbreviation and frozen badge have no separate editing action. Empty space below the header also selects the channel; native controls keep their own behavior.

The strip context menu offers **Preset**, **Adjust Preset**, **Edit Preset** where supported, copy/paste channel settings, paste effects, Channel Effects, bypass/enable all effects and reset. Availability depends on the lane, effect chain and clipboard. Native inputs/selects retain their browser context behavior.

The channel panel's action buttons remain **Preset / Adjust / Edit / Note FX**. Its More menu uses the same plain-row styling as the strip popup, with disabled actions dimmed and destructive actions coloured.

## Playback double-click meaning

`playFromLaneStart` selects the lane and starts the song transport at the first bar where that lane plays. It also marks that bar. A lane entering inside the intro starts playback from the beginning instead; a lane with no detected entry falls back to the beginning. This action does **not** solo the lane.

Browser double-clicks normally include two click events before `dblclick`. Opening a picker or popup on the first click may change which element receives the next click. The tables distinguish an explicit double-click handler from ordinary click side effects; they do not promise that both events always reach the original element.

## Group rows, group strips, returns and master

- Arrangement group header: left-click selects the group; right-click opens group actions (Effects, Assign Every Track by Family, Clear Every Assignment). It has no dedicated header double-click action. FX opens group effects; M/S toggle group mute/solo; the level slider double-click resets to 0 dB. Unlike the ordinary track handler, the group's context-menu handler does not exclude input targets.
- Arrangement group bar: click selects the group/bar; right-click opens the group-bar menu; double-click opens the group's bar effects editor.
- Group/send/master mixer headers use the shared strip selection behavior and their respective strip context menus. They do not receive an ordinary track's preset-name picker or play-from-first-entry handlers. Group menus additionally offer routing assignment actions. Return-specific settings are in their own controls, not the header labels.

## Related drag and keyboard behavior

- Drag an ordinary arrangement header to reorder the track. `.arrname`, `.arrbtns` and `.arrgain` are excluded from this drag handle. FX/NFX are not explicitly in that exclusion list.
- Drag a channel-strip header to reorder the track. Native buttons/inputs/selects are excluded; the name is part of the drag handle.
- Drag from empty arrangement bars to select a range. Drag from note-bearing bars uses the move/copy behavior instead; this can suppress the subsequent ordinary click.
- Arrangement NFX: Enter or Space opens Note FX. Header names have no separate keyboard preset-picker shortcut.
- No custom right-button double-click action is defined for these surfaces. Repeated right clicks follow their ordinary context-menu behavior.

## Remaining interaction details

- FX/NFX in arrangement headers do not explicitly suppress double-click bubbling; playback can also run.
- Right-clicking arrangement M/S, FX or NFX opens track actions, regardless of their different left-click behavior.
- Double-clicking a name now follows the same playback gesture as the rest of its header.

## Implementation references

All principal handlers are in [tools/mixer-entry.js](../tools/mixer-entry.js):

- `buildArrangement`: ordinary track headers, names, NFX/FX controls, bar cells and level sliders.
- `trackMenu`: arrangement header context-menu routing.
- `stripShell`, `channelStrip`: shared strip selection, track header selection/play handlers.
- `stripMenu`: whole-strip channel/group/send/master context actions.
- `muteSoloPair`: M/S click behavior.
- `groupRow`, `groupBarMenu`: group arrangement exceptions.
- `playFromLaneStart`, `laneDragHandle`: playback and reordering.
- `freezeMark`: informational freeze marker.

[tools/mixer-shell.html](../tools/mixer-shell.html) defines the header hit-area layout and the VU/slider overlay styling.
