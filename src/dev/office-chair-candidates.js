// CORPORATE KOMBAT — the meeting-room chairs seen from behind (lab). Peter, 14 Oct 2026:
// "dont love these chairs - they look like they are part of the peoples bodies".
//
// The old chair back was as wide as the sitter's shoulders, in the suits' own dark slate, and
// covered the jacket from the shoulders down — so it read as the body. Each candidate is a
// style of room.js setOfficeChairStyle, shown in the real rooms (the glass box frosted below
// the table, as shipped): floor 23's training room and floor 88's boardroom.
import { drawOfficeRoomScene } from './office-production.js';
import { setOfficeChairStyle } from '../engine/stylePacks/officeLigne/room.js';

// SHIPPED 15 Oct 2026: D, the high back ("different to a typist chair"), after B for a few
// minutes; both with the seat in the back's fabric, a chrome base and real coffee mugs.
export const OFFICE_CHAIR_CANDIDATES = [
  { letter: 'BEFORE', style: 'now', name: 'until 15 Oct', note: 'A dark high back as wide as the shoulders, in the suits’ slate: it reads as the body.' },
  { letter: 'A', style: 'low', name: 'low back, charcoal', note: 'A typist’s low back at the waist and the seat’s edge either side of the hips; the whole jacket shows above it, down to the seat.' },
  { letter: 'B', style: 'lowFabric', name: 'low back, upholstered', note: 'A in the floor’s fabric, seat and back alike — teal on 23, oxblood leather on 88 — so the chair is never the suit’s colour.' },
  { letter: 'C', style: 'elbows', name: 'low back, elbows on the table', note: 'B with the sitters’ sleeves out to their elbows on the table top either side: a person leaning in, the chair below them.' },
  { letter: 'D', style: 'high', name: 'high back, narrower — SHIPPED', note: 'Keeps the high back but narrower than the shoulders and upholstered, so the jacket shows either side of it.' },
  { letter: 'E', style: 'mix', name: 'B and C mixed', note: 'Everyone on B’s upholstered low chair; about half lean in on their elbows (C), the rest sit back — fixed per seat, never a strict alternation (Peter, 15 Oct).' },
];

export const OFFICE_CHAIR_ROOMS = [
  { floor: 'open', kind: 'training', name: 'floor 23 training room' },
  { floor: 'exec', kind: 'boardroom', name: 'floor 88 boardroom' },
];

export function drawOfficeChairScene(ctx, t, style, room) {
  const was = setOfficeChairStyle(style);
  try { drawOfficeRoomScene(ctx, t, { floor: room.floor, kind: room.kind, style: 'boxfrost' }); }
  finally { setOfficeChairStyle(was); }
}
