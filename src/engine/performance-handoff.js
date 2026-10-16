// Tiny benchmark-only boot path. Do not import renderer, audio, or game modules.
const KEY = 'mash_performance_handoff';
export function readPerformanceHandoff() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function markPerformanceHandoff(phase, stage) {
  const prior=readPerformanceHandoff();
  const record=phase==='leaving-game' || prior?.stage!==stage || !Array.isArray(prior?.events) ? {stage,events:[]} : prior;
  record.events.push({phase,at:new Date().toISOString()});
  record.events=record.events.slice(-8);
  try { localStorage.setItem(KEY,JSON.stringify(record)); } catch {}
}
export function showPerformanceHandoff(loadGame) {
  const params=new URLSearchParams(window.location?.search || '');
  const stage=params.get('performanceStage');
  if(params.get('performanceHandoff')!=='1' || !stage)return false;
  markPerformanceHandoff('lightweight-page',stage);
  const panel=document.createElement('section');
  panel.id='performance-handoff';
  panel.style.cssText='position:fixed;inset:0;z-index:10000;background:#101823;color:#edf3f8;padding:32px;font:18px system-ui';
  const h=document.createElement('h1');h.textContent='Preparing next test';
  const p=document.createElement('p');p.textContent=`Loading ${stage} shortly. Completed results are saved. Keep this page open.`;
  panel.append(h,p);document.body.appendChild(panel);
  // The previous document has unloaded before this delay begins. No game script,
  // fonts, canvases or audio contexts are created by this page during the pause.
  // This provides a quiet handoff; it cannot force the browser to reclaim memory.
  let ready=false,started=false;
  const proceed=()=>{
    if(!ready || started || document.hidden)return;
    started=true;document.removeEventListener('visibilitychange',proceed);
    markPerformanceHandoff('loading-game',stage);
    const url=new URL(window.location.href);url.searchParams.delete('performanceHandoff');
    history.replaceState(history.state,'',url.href);
    panel.remove();loadGame();
  };
  document.addEventListener('visibilitychange',proceed);
  setTimeout(()=>{ready=true;proceed();},2000);
  return true;
}
