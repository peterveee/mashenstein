// Still gallery concepts. Same floor, skyline, poster, head and line painters
// as Corporate 2. The production renderer's optional preview hooks keep these
// candidates out of the campaign until a gag is selected.
import { officeFrame } from '../engine/stylePacks/officeClimb.js';
import { OFFICE_CORRIDORS } from '../engine/stylePacks/officeLigne/progression.js';
import { STYLE } from '../engine/stylePacks/officeLigne/index.js';
import { PAL } from '../engine/stylePacks/officeLigne/line.js';
import { poster } from '../engine/stylePacks/officeLigne/wall.js';
import { paintWindowCleaner } from '../engine/stylePacks/officeLigne/windowCleaner.js';
const P = PAL.open;

export const OFFICE_WINDOW_GAGS = [
  {id:'ties',name:'A — Necktie escape',note:'Descending from the unseen floor above. One hand for the ties; one for the coffee.'},
  {id:'working',name:'B — Earlier: business as usual',note:'A window cleaner working normally on a lower cradle, setting up the later visual joke.'},
  {id:'hang',name:'C — Hang in there, literally',note:'The real poster beside a window cleaner hanging from the cradle with both hands.'},
];

export function drawOfficeWindowGag(g, kind, close = false) {
  g.save();
  if (close) { g.scale(2,2); g.translate(-174,-55); }
  const f = officeFrame('open',0,2,{left:0,right:480},OFFICE_CORRIDORS.open);
  f.outside.flyer = null;
  STYLE.paint(g,f,{production:true,keepFloors:true,
    windowPreview:ctx=>paintWindowCleaner(ctx,kind),
    artworkPreview:ctx=>poster(ctx,{x:337,y:67,w:56,h:80,label:'HANG IN THERE',bg:'#cdb9ef'},P),
  });
  g.restore();
}
