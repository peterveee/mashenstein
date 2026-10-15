// User-started bot benchmark. The save is disposable; reports never leave the
// device until the player presses Share/Download. Ordinary gameplay is untouched.
import { AttractState } from './attract.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Dev } from '../dev/index.js';
import { rendererDiagnostics, setDensityPin, setRenderProfile, renderProfileStats } from '../engine/renderer.js';
import { setPropCacheProfile, propCacheStats } from '../sprites/props.js';
import { beginPerformanceCapture, endPerformanceCapture, performanceMark, performanceAdd, performanceLocation } from '../engine/performance-capture.js';
import { suspendCrumbPersistence } from '../engine/diag.js';

export const PERFORMANCE_STAGES = ['plumber-1','speed-1','rhythm-1','frost-1','crypt-1','neon-1','gravity-2','office-2','office-3','surge-3'];
export function performancePlan(id = 'frost-1') {
  if (!PERFORMANCE_STAGES.includes(id)) throw new Error('Unknown performance stage');
  return [{id, pass:1, seed:0x5eed+PERFORMANCE_STAGES.indexOf(id), seconds:30}];
}

export class PerformanceTestState extends AttractState {
  static portraitMode = 'frame';
  get performanceTesting() { return true; }
  enter() {
    this.running = false;
    this.report = null;
    Input.clearAll();
    this.onVisibility = () => { if (document.hidden && this.running) this.finish('interrupted: app hidden'); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onOrientation=()=>{if(this.running)this.finish('interrupted: orientation changed');};
    window.addEventListener('orientationchange',this.onOrientation);
    this.onFatal=e=>{if(this.running){this.report.error=String(e.detail || 'fatal game error');this.finish('error');}};
    window.addEventListener('mashfatalerror',this.onFatal);
    this.showPanel();
  }
  panel(title, detail) {
    this.panelEl?.remove();
    const el = document.createElement('section');
    el.setAttribute('aria-label','Performance test');
    el.style.cssText = 'position:fixed;z-index:10000;inset:0;box-sizing:border-box;padding:max(24px,env(safe-area-inset-top)) 22px max(24px,env(safe-area-inset-bottom));background:#101823;color:#edf3f8;font:16px system-ui;overflow:auto;touch-action:pan-y';
    const h = document.createElement('h1');h.textContent=title;el.append(h);
    const p = document.createElement('p');p.textContent=detail;p.style.maxWidth='680px';el.append(p);
    for(const type of ['pointerdown','pointerup','click','keydown'])el.addEventListener(type,e=>e.stopPropagation());
    document.body.append(el);this.panelEl=el;return el;
  }
  button(label, action) {
    const b=document.createElement('button');b.textContent=label;
    b.style.cssText='font:inherit;padding:14px;margin:8px 8px 8px 0;min-height:48px;border-radius:8px';
    b.onclick=action;this.panelEl.append(b);return b;
  }
  showPanel() {
    this.panel('PERFORMANCE TEST', 'One complete level per fresh page load. Reports are split into 30-second windows, including later scenery. Keep the app visible and in the same orientation. Resolution stays fixed; progress is not saved. Download each report before preparing another level.');
    if (this.o.freshStage) {
      this.button(`Start ${this.o.freshStage} full-level test`,()=>this.start(this.o.freshStage));
    } else {
      const select=document.createElement('select');select.setAttribute('aria-label','Level to test');
      select.style.cssText='font:inherit;padding:12px';
      for(const id of PERFORMANCE_STAGES){const option=document.createElement('option');option.value=id;option.textContent=id;select.append(option);}
      select.value='frost-1';this.panelEl.append(select);
      this.button('Prepare selected level (reload)',()=>{
        const url=new URL(window.location.href);url.searchParams.delete('goto');url.searchParams.set('performanceStage',select.value);
        window.location.assign(url.href);
      });
    }
    this.button('Back',()=>this.o.onExit());
    try { const previous=localStorage.getItem('mash_performance_report');if(previous){this.button('Previous report',()=>{this.report=JSON.parse(previous);this.showReport();});} } catch {}
  }
  start(id) {
    if(this.running || id !== this.o.freshStage)return;
    if (Dev.recording) { this.button('Stop video recording before testing',()=>{}); return; }
    this.plan=performancePlan(id);this.caseIndex=-1;this.windowIndex=0;this.o.freshStage=null;
    this.report={schema:2,protocol:'bot-full-level-isolated-v3',started:new Date().toISOString(),build:window.__MASH_BUILT_AT__ || null,
      userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      settings:JSON.parse(JSON.stringify(this.o.realSettings || {})),renderer:rendererDiagnostics(),
      devBuild:!!window.__MASH_BUILD__,devToolsEnabledBefore:Dev.enabled,
      notes:['One full level after page reload; browser and disk caches may still be warm. No cross-level endurance test.',
        'Entry cost is reported separately; run-in and the first two simulation seconds are excluded. 30 simulation seconds per window, final partial window retained; same seeds and reactive bot, not recorded inputs.',
        'Update includes bot; blit includes overlay painting. Audio includes timer and frame scheduler calls.',
        'Frame gaps are presentation intervals, not proof of cause. GPU and garbage collection are not directly timed.',
        'Dev toolkit disabled and breadcrumb persistence/uploads suspended during this test; resolution pinned to its starting density for comparable samples.',
        'Prop cache bytes exclude other scenery caches. JS heap is unavailable on some browsers.'],results:[]};
    this.previousDev={enabled:Dev.enabled,timeScale:Dev.timeScale};Dev.enabled=false;Dev.timeScale=1;
    suspendCrumbPersistence(true);this.running=true;
    this.previousDensity=rendererDiagnostics();
    setDensityPin(this.previousDensity.density);
    this.report.wakeLock=navigator.wakeLock ? 'requested' : 'unavailable';
    navigator.wakeLock?.request('screen').then(lock=>{
      if(!this.running){lock.release();return;}this.wakeLock=lock;this.report.wakeLock='acquired';
    }).catch(e=>{this.report.wakeLock=String(e.name || 'failed');});
    Audio.resumeContext?.();
    try { this.nextCase(); } catch(e) { this.report.error=String(e.stack || e); this.finish('error'); }
  }
  nextCase() {
    this.closeRun();
    if(++this.caseIndex >= this.plan.length){this.finish('complete');return;}
    const test=this.plan[this.caseIndex];
    this.panelEl?.remove();this.panelEl=null;
    const controls=document.createElement('div');controls.style.cssText='position:fixed;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:10000;background:#101823dd;color:white;padding:6px;font:12px system-ui';
    controls.append(document.createTextNode(`${test.id} · full level · fixed quality `));
    const stop=document.createElement('button');stop.textContent='Stop test';stop.style.cssText='padding:12px';stop.onclick=e=>{e.stopPropagation();this.finish('stopped');};
    controls.append(stop);document.body.append(controls);this.panelEl=controls;
    const at=performance.now();
    this.o={...this.o,scenario:{kind:'stage',id:test.id},seed:test.seed,hero:'lorenzo',devMode:true,quiet:true,invulnerable:true};
    super.enter();
    // Continue through bot mistakes; retain obstacles and normal rendering.
    this.run.devInvuln=true;this.run.devForceMission=true;
    this.entryMs=performance.now()-at;this.measuring=false;this.caseStarted=performance.now();
    this.startingRenderer=rendererDiagnostics();
  }
  update(dt) {
    if(!this.running || !this.run || this.advance)return;
    try {
      const at=performanceMark();this.bot?.update(dt);performanceAdd('bot',at);
      this.run.update(dt);
      performanceLocation(this.run.tRun,this.run.distance,this.run.player?.anim);
    } catch(e) { this.report.error=String(e.stack || e); this.finish('error'); return; }
    if(!this.measuring && this.run.tRun >= 2 && !this.run.introRunning && !this.run.introFreeze && !this.run.zoneCard)this.beginWindow();
    if(this.done || this.run.tRun>this.limit || performance.now()-this.caseStarted>Math.max(180000,this.limit*3000)) {
      this.pendingFinish=this.done?'complete':'timeout';
    } else if(this.measuring && this.run.tRun-this.measureFrom >= this.plan[this.caseIndex].seconds) {
      this.rollWindow=true;
    }
  }
  beginWindow() {
    beginPerformanceCapture();setRenderProfile(true);setPropCacheProfile(true);
    Audio.takeSchedulerHealth();this.measureFrom=this.run.tRun;this.measuring=true;
    this.startingRenderer=rendererDiagnostics();
  }

  draw(ctx,alpha=0) {
    // Finalize outside simulation updates. No DOM/storage writes between windows.
    if(this.pendingFinish){const status=this.pendingFinish;this.pendingFinish=null;this.finish(status);}
    if(this.rollWindow && this.running){this.rollWindow=false;this.recordCase('window complete');this.beginWindow();}
    // Change cases on the next draw, outside the old simulation update.
    if(this.advance){this.advance=false;try{this.nextCase();}catch(e){this.report.error=String(e.stack || e);this.finish('error');}}
    if(this.running && this.run){try{this.run.draw(ctx,alpha);}catch(e){this.report.error=String(e.stack || e);this.finish('error');}}
    else {ctx.fillStyle='#101823';ctx.fillRect(0,0,2000,2000);}
  }
  recordCase(status) {
    if(!this.run)return;
    const timing=endPerformanceCapture();
    this.report.results.push({...this.plan[this.caseIndex],status,window:++this.windowIndex,fromSimulation:this.measureFrom,toSimulation:this.run.tRun,entryMs:this.windowIndex===1?this.entryMs:null,
      elapsedSimulation:this.measuring?this.run.tRun-this.measureFrom:0, distance:this.run.distance,
      timing,render:renderProfileStats(),art:propCacheStats(),audio:Audio.takeSchedulerHealth(),
      rendererBefore:this.startingRenderer,rendererAfter:rendererDiagnostics(),
      music:{song:Audio.sourceBank?.name || Audio.sourceBank?.id || this.run.cabinet?.id, muted:Audio.silent, bpm:Audio.bpm},
      heapBytes:performance.memory?.usedJSHeapSize ?? null});
    this.measuring=false;setRenderProfile(false);setPropCacheProfile(false);
  }
  closeRun() {
    if(this.run){this.bot?.releaseAll();super.exit();this.run=null;this.bot=null;}
  }
  finish(status) {
    if(!this.running)return;
    if(this.measuring)this.recordCase(status);
    this.running=false;this.advance=false;endPerformanceCapture();setRenderProfile(false);setPropCacheProfile(false);
    this.closeRun();
    if(this.previousDensity) {
      setDensityPin(this.previousDensity.density);
      setDensityPin(this.previousDensity.pinned);
      this.report.rendererRestored=rendererDiagnostics();
      this.previousDensity=null;
    }
    suspendCrumbPersistence(false);
    this.wakeLock?.release().catch(()=>{});this.wakeLock=null;
    Dev.enabled=this.previousDev.enabled;Dev.timeScale=this.previousDev.timeScale;
    this.report.status=status;this.report.finished=new Date().toISOString();
    // One write, after gameplay is stopped. Never save while measuring.
    try{localStorage.setItem('mash_performance_report',JSON.stringify(this.report));}catch{}
    this.showReport();
  }
  showReport() {
    this.panel('PERFORMANCE RESULTS',`${this.report.status || 'saved'} · ${this.report.results.length} windows. Send the JSON report back in chat. Slow frames are clues, not automatic diagnoses.`);
    const summary=document.createElement('pre');summary.style.cssText='white-space:pre-wrap;font:13px monospace';
    summary.textContent=this.report.results.map(r=>`${r.id} ${r.fromSimulation?.toFixed(0) ?? 0}–${r.toSimulation?.toFixed(0) ?? 30}s: ${r.timing?.frames ? r.timing.fps.toFixed(1) : '—'} FPS, ${r.timing?.over25 ?? 0} gaps >25ms (${r.status})`).join('\n');this.panelEl.append(summary);
    this.button('Share / download report',()=>this.share());
    this.button('Prepare another level',()=>this.showPanel());
    this.button('Copy report',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(this.report,null,2));summary.textContent+='\nReport copied.';}catch{summary.textContent+='\nClipboard unavailable. Use download.';}});
    this.button('Back',()=>this.o.onExit());
  }
  async share() {
    const text=JSON.stringify(this.report,null,2),name='mashenstein-performance.json';
    const file=new File([text],name,{type:'application/json'});
    try {
      if(Input.isTouchDevice() && navigator.canShare?.({files:[file]}) && navigator.share){await navigator.share({files:[file],title:'MASHENSTEIN performance'});return;}
      const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(e){if(e.name!=='AbortError')this.button('Download instead',()=>{const a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(text);a.download=name;a.click();});}
  }
  exit() {
    if(this.running)this.finish('left test');
    this.panelEl?.remove();document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('orientationchange',this.onOrientation);window.removeEventListener('mashfatalerror',this.onFatal);Input.clearAll();
  }
}
