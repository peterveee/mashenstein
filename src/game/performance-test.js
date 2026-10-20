import { markPerformanceHandoff, readPerformanceHandoff } from '../engine/performance-handoff.js';
// User-started bot benchmark. The save is disposable; reports never leave the
// device until the player presses Share/Download. Ordinary gameplay is untouched.
import { STAGES } from '../data/stages.js';
import { AttractState } from './attract.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { Dev } from '../dev/index.js';
import { rendererDiagnostics, setDensityPin, setRenderProfile, renderProfileStats } from '../engine/renderer.js';
import { setPropCacheProfile, propCacheStats } from '../sprites/props.js';
import { beginPerformanceCapture, endPerformanceCapture, performanceMark, performanceAdd, performanceLocation } from '../engine/performance-capture.js';
import { suspendCrumbPersistence } from '../engine/diag.js';

export const PERFORMANCE_STAGES = STAGES.map(stage=>stage.id);
export const TARGETED_PERFORMANCE_STAGES = Object.freeze([
  'speed-3', 'frost-3', 'crypt-3', 'gravity-3', 'office-2', 'surge-3',
]);
export const PERFORMANCE_SUITE_KEY = 'mash_performance_suite';
export function newPerformanceSuite(stages = PERFORMANCE_STAGES, densityTarget = null, options = {}) {
  if (!Array.isArray(stages) || !stages.length || stages.some(id => !PERFORMANCE_STAGES.includes(id)))
    throw new Error('Invalid performance suite stages');
  if (densityTarget != null && (!Number.isFinite(densityTarget) || densityTarget <= 0))
    throw new Error('Invalid performance suite density');
  const qualityMode=options.qualityMode ?? 'fixed';
  if (!['fixed','auto'].includes(qualityMode) || (qualityMode==='auto' && densityTarget!=null))
    throw new Error('Invalid performance suite quality mode');
  return {schema:3,protocol:'bot-full-level-suite-v1',id:Date.now().toString(36),started:new Date().toISOString(),stages:[...stages],densityTarget,qualityMode,index:0,runs:[],status:'ready'};
}

function qualityPoint(renderer, tRun) {
  return {
    tRun:Number(tRun.toFixed(2)), density:renderer.density, native:renderer.native,
    rung:renderer.rung, adaptive:renderer.adaptive, pinned:renderer.pinned,
    bloomSuppressed:renderer.bloomSuppressed, throttled:renderer.throttled,
    settled:renderer.settled,
  };
}
function qualityPointChanged(a, b) {
  return !a || ['density','native','rung','adaptive','pinned','bloomSuppressed','throttled','settled']
    .some(key=>a[key]!==b[key]);
}
export function recordSuiteRun(suite,report) {
  suite.runs.push(report);
  if(report.status==='complete')suite.index++;
  suite.status=suite.index>=suite.stages.length?'complete':report.status==='complete'?'ready':report.status;
  suite.finished=report.finished;
}

export function performancePlan(id = 'frost-1') {
  if (!PERFORMANCE_STAGES.includes(id)) throw new Error('Unknown performance stage');
  return [{id, pass:1, seed:0x5eed+PERFORMANCE_STAGES.indexOf(id), seconds:30}];
}

export class PerformanceTestState extends AttractState {
  static portraitMode = 'frame';
  get performanceTesting() { return true; }
  enter() {
    if(this.o.freshStage)markPerformanceHandoff('game-ready',this.o.freshStage);
    this.running = false;
    this.report = null;
    try {
      const token=new URLSearchParams(window.location.search).get('performanceSuite');
      const saved=JSON.parse(sessionStorage.getItem(PERFORMANCE_SUITE_KEY) || 'null');
      if(token && saved?.id===token && Array.isArray(saved.runs) && saved.stages?.every(id=>PERFORMANCE_STAGES.includes(id)) && saved.stages[saved.index]===this.o.freshStage && (saved.qualityMode==null || ['fixed','auto'].includes(saved.qualityMode))){
        this.suite=saved;
        this.suite.qualityMode ??= 'fixed'; // Older saved suites used fixed density.
      }
    } catch {}
    Input.clearAll();
    this.onVisibility = () => { if (document.hidden && this.running) this.finish('interrupted: app hidden'); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onOrientation=()=>{if(this.running)this.finish('interrupted: orientation changed');};
    window.addEventListener('orientationchange',this.onOrientation);
    this.onFatal=e=>{if(this.running){this.report.error=String(e.detail || 'fatal game error');this.finish('error');}};
    window.addEventListener('mashfatalerror',this.onFatal);
    this.showPanel();
    // Touch browsers need a fresh user gesture for sound after navigation.
    if(this.suite && !Input.isTouchDevice())this.autoStart=setTimeout(()=>{if(!document.hidden && this.o.freshStage)this.start(this.o.freshStage,this.suite.densityTarget,this.suite.qualityMode ?? 'fixed');},0);
  }
  panel(title, detail) {
    this.panelEl?.remove();
    const el = document.createElement('section');
    el.setAttribute('aria-label','Performance test');
    el.style.cssText = 'position:fixed;z-index:10000;inset:0;box-sizing:border-box;padding:max(24px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left));background:#101823;color:#edf3f8;font:16px system-ui;overflow:auto;touch-action:pan-y';
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
    this.panel('PERFORMANCE TEST', 'One complete level per fresh page load. Reports are split into 30-second windows, including later scenery. Keep the app visible and in the same orientation. Fixed runs pin resolution; Auto lets the renderer adapt and records quality changes about once per second. The game save is unchanged. Suites save results between reloads and export one combined report. On touch devices, tap Start after each reload.');
    if(this.suite){const p=document.createElement('p');p.textContent=`Level ${this.suite.index+1} of ${this.suite.stages.length} · ${this.suite.runs.filter(r=>r.status==='complete').length} completed · ${this.suite.qualityMode==='auto'?'Auto quality':'fixed quality'}`;this.panelEl.append(p);}
    if (this.o.freshStage) {
      const suiteDensity = this.suite?.densityTarget ?? null;
      const suiteQualityMode = this.suite?.qualityMode ?? 'fixed';
      const startLabel = this.suite
        ? suiteQualityMode==='auto' ? `Start ${this.o.freshStage} · Auto quality`
          : suiteDensity ? `Start ${this.o.freshStage} at ${suiteDensity}×`
            : `Start ${this.o.freshStage} · fixed quality`
        : `Start ${this.o.freshStage} full-level test · fixed quality`;
      this.button(startLabel,()=>this.start(this.o.freshStage,suiteDensity,suiteQualityMode));
      const renderer = rendererDiagnostics();
      if (!this.suite && renderer.backend === 'webgl' && renderer.density > 1.5) {
        this.button(`Start ${this.o.freshStage} at 1.5×`,()=>this.start(this.o.freshStage,1.5));
      }
      if (!this.suite) this.button(`Start ${this.o.freshStage} with Auto quality`,()=>this.start(this.o.freshStage,null,'auto'));
    } else {
      const select=document.createElement('select');select.setAttribute('aria-label','Level to test');
      select.style.cssText='font:inherit;padding:12px';
      for(const id of PERFORMANCE_STAGES){const option=document.createElement('option');option.value=id;option.textContent=id;select.append(option);}
      select.value='frost-1';this.panelEl.append(select);
      this.button(`Run all ${PERFORMANCE_STAGES.length} levels · fixed quality`,()=>{
        this.suite=newPerformanceSuite();
        if(this.saveSuite())this.reloadStage(this.suite.stages[0]);
      });
      this.button(`Run all ${PERFORMANCE_STAGES.length} levels · Auto quality`,()=>{
        this.suite=newPerformanceSuite(PERFORMANCE_STAGES,null,{qualityMode:'auto'});
        if(this.saveSuite())this.reloadStage(this.suite.stages[0]);
      });
      this.button(`Run targeted ${TARGETED_PERFORMANCE_STAGES.length} levels at 1.5× · fixed`,()=>{
        this.suite=newPerformanceSuite(TARGETED_PERFORMANCE_STAGES,1.5);
        if(this.saveSuite())this.reloadStage(this.suite.stages[0]);
      });
      this.button(`Run targeted ${TARGETED_PERFORMANCE_STAGES.length} levels · Auto quality`,()=>{
        this.suite=newPerformanceSuite(TARGETED_PERFORMANCE_STAGES,null,{qualityMode:'auto'});
        if(this.saveSuite())this.reloadStage(this.suite.stages[0]);
      });
      this.button('Prepare selected level (reload)',()=>{
        this.suite=null;
        const url=new URL(window.location.href);url.searchParams.delete('goto');url.searchParams.delete('performanceSuite');url.searchParams.set('performanceStage',select.value);url.searchParams.set('performanceHandoff','1');
        markPerformanceHandoff('leaving-game',select.value);
        window.location.replace(url.href);
      });
    }
    this.button('Back',()=>this.o.onExit());
    try {
      const previous=localStorage.getItem('mash_performance_report');
      if(previous){
        const saved=JSON.parse(previous);
        if(saved.protocol==='bot-full-level-suite-v1' && Array.isArray(saved.runs) && saved.stages?.every(id=>PERFORMANCE_STAGES.includes(id)) && Number.isInteger(saved.index) && saved.index>=0 && saved.index<saved.stages.length && (saved.qualityMode==null || ['fixed','auto'].includes(saved.qualityMode))){
          this.button(`Resume saved ${saved.qualityMode==='auto'?'Auto':'fixed'} suite (${saved.index}/${saved.stages.length} completed)`,()=>{
            const {results,...suite}=saved;suite.qualityMode ??= 'fixed';this.suite=suite;
            if(this.saveSuite())this.reloadStage(suite.stages[suite.index]);
          });
        }
        this.button('Previous report',()=>{this.suite=null;this.report=saved;this.showReport();});
      }
    } catch {}
  }
  saveSuite() {
    try {sessionStorage.setItem(PERFORMANCE_SUITE_KEY,JSON.stringify(this.suite));return true;}
    catch {
      this.storageError='Could not save test progress. The test will not advance. Download any results before leaving.';
      if(this.panelEl){const p=document.createElement('p');p.textContent=this.storageError;this.panelEl.append(p);}
      return false;
    }
  }
  reloadStage(id) {
    const url=new URL(window.location.href);url.searchParams.delete('goto');url.searchParams.set('performanceStage',id);
    url.searchParams.set('performanceSuite',this.suite.id);url.searchParams.set('performanceHandoff','1');
    markPerformanceHandoff('leaving-game',id);
    this.panel('LOADING NEXT TEST', `Results saved. Reloading for ${id}. On iPhone, tap Start when the next page is ready.`);
    window.location.replace(url.href);
  }
  exportReport() {const handoff=readPerformanceHandoff();let lastGameLoadError=null;try{lastGameLoadError=JSON.parse(localStorage.getItem('mash_game_load_error') || 'null');}catch{}return this.suite ? {...this.suite,handoff,lastGameLoadError,results:this.suite.runs.flatMap(r=>r.results)} : {...this.report,handoff,lastGameLoadError};}
  start(id, densityOverride = null, qualityMode = 'fixed') {
    if(this.running || id !== this.o.freshStage)return;
    if(!['fixed','auto'].includes(qualityMode) || (qualityMode==='auto' && densityOverride!=null))throw new Error('Invalid performance test quality mode');
    if (Dev.recording) { this.button('Stop video recording before testing',()=>{}); return; }
    this.plan=performancePlan(id);this.caseIndex=-1;this.windowIndex=0;this.o.freshStage=null;
    this.report={schema:2,protocol:'bot-full-level-isolated-v3',started:new Date().toISOString(),build:window.__MASH_BUILT_AT__ || null,
      userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      settings:JSON.parse(JSON.stringify(this.o.realSettings || {})),renderer:rendererDiagnostics(),
      densityTarget:densityOverride,qualityMode,
      devBuild:!!window.__MASH_BUILD__,devToolsEnabledBefore:Dev.enabled,
      notes:['One full level after page reload; browser and disk caches may still be warm. No cross-level endurance test.',
        'Entry cost is reported separately; run-in and the first two simulation seconds are excluded. 30 simulation seconds per window, final partial window retained; same seeds and reactive bot, not recorded inputs.',
        'Update includes bot; blit includes overlay painting. Audio includes timer and frame scheduler calls.',
        'Frame gaps are presentation intervals, not proof of cause. GPU and garbage collection are not directly timed.',
        qualityMode==='auto'
          ? 'Dev toolkit disabled and breadcrumb persistence/uploads suspended; automatic density adaptation remains enabled. Renderer quality is sampled about once per second and game settings are not changed.'
          : 'Dev toolkit disabled and breadcrumb persistence/uploads suspended during this test; resolution pinned to its starting density or the selected test density for comparable samples.',
        'Prop cache bytes exclude other scenery caches. JS heap is unavailable on some browsers.'],results:[]};
    this.previousDev={enabled:Dev.enabled,timeScale:Dev.timeScale};Dev.enabled=false;Dev.timeScale=1;
    suspendCrumbPersistence(true);this.running=true;
    this.previousDensity=rendererDiagnostics();
    setDensityPin(qualityMode==='auto' ? null : densityOverride ?? this.previousDensity.density);
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
    const controls=document.createElement('div');controls.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:10000;background:#101823dd;color:white;padding:6px;font:12px system-ui';
    controls.append(document.createTextNode(`${test.id} · full level · ${this.report.qualityMode==='auto'?'Auto quality':'fixed quality'} `));
    this.levelEl=document.createElement('span');this.levelEl.style.cssText='margin-right:8px;font-variant-numeric:tabular-nums';controls.append(this.levelEl);this.levelText='';this.nextLevelLabelAt=0;this.updateLevelLabel(performance.now());
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
      performanceLocation(this.run.tRun,this.run.distance,this.run.player?.anim,
        this.run.style?.name==='surge'?this.run.style.phase:null);
    } catch(e) { this.report.error=String(e.stack || e); this.finish('error'); return; }
    const now=performance.now();
    this.updateLevelLabel(now);
    if(this.measuring && this.report.qualityMode==='auto')this.sampleRendererQuality(now);
    if(!this.measuring && this.run.tRun >= 2 && !this.run.introRunning && !this.run.introFreeze && !this.run.zoneCard)this.beginWindow();
    if(this.done || this.run.tRun>this.limit || now-this.caseStarted>Math.max(180000,this.limit*3000)) {
      this.pendingFinish=this.done?'complete':'timeout';
    } else if(this.measuring && this.run.tRun-this.measureFrom >= this.plan[this.caseIndex].seconds) {
      this.rollWindow=true;
    }
  }
  beginWindow() {
    beginPerformanceCapture();setRenderProfile(true);setPropCacheProfile(true);
    Audio.takeSchedulerHealth();this.measureFrom=this.run.tRun;this.measuring=true;
    this.startingRenderer=rendererDiagnostics();
    this.rendererQualityPath=this.report.qualityMode==='auto'?[qualityPoint(this.startingRenderer,this.run.tRun)]:null;
    this.nextQualitySampleAt=performance.now()+1000;
  }
  // Live readout beside Stop test: one tiny textContent write per second, only on change.
  updateLevelLabel(now) {
    if(!this.levelEl || now<this.nextLevelLabelAt)return;
    this.nextLevelLabelAt=now+1000;
    const r=rendererDiagnostics();
    const text=`${r.density.toFixed(2)}x · rung ${r.rung+1}/${r.ladder.length}${r.frozen?' · frozen':''}`;
    if(text!==this.levelText){this.levelText=text;this.levelEl.textContent=text;}
  }
  sampleRendererQuality(now, force = false) {
    if(!this.run || this.report.qualityMode!=='auto' || !this.measuring)return;
    if(!force && now<this.nextQualitySampleAt)return;
    this.nextQualitySampleAt=now+1000;
    const point=qualityPoint(rendererDiagnostics(),this.run.tRun);
    const previous=this.rendererQualityPath?.at(-1);
    if(qualityPointChanged(previous,point))this.rendererQualityPath.push(point);
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
    if(this.report.qualityMode==='auto')this.sampleRendererQuality(performance.now(),true);
    const timing=endPerformanceCapture();
    this.report.results.push({...this.plan[this.caseIndex],status,window:++this.windowIndex,fromSimulation:this.measureFrom,toSimulation:this.run.tRun,entryMs:this.windowIndex===1?this.entryMs:null,
      elapsedSimulation:this.measuring?this.run.tRun-this.measureFrom:0, distance:this.run.distance,
      surgeCosmeticSeed:this.run.style?.name==='surge'?this.run.style.seed:null,
      timing,render:renderProfileStats(),art:propCacheStats(),audio:Audio.takeSchedulerHealth(),
      rendererBefore:this.startingRenderer,rendererAfter:rendererDiagnostics(),
      rendererQualityPath:this.rendererQualityPath ?? null,
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
    if(this.suite)recordSuiteRun(this.suite,this.report);
    const savedSuite=!this.suite || this.saveSuite();
    // Writes occur only after gameplay stops, never while measuring.
    try{localStorage.setItem('mash_performance_report',JSON.stringify(this.exportReport()));}catch{}
    if(this.suite && savedSuite && status==='complete' && this.suite.status!=='complete'){this.reloadStage(this.suite.stages[this.suite.index]);return;}
    this.showReport();
  }
  showReport() {
    const report=this.exportReport();
    this.panel('PERFORMANCE RESULTS',`${report.status || 'saved'} · ${report.results.length} windows · ${report.qualityMode==='auto'?'Auto quality':'fixed quality'}. Send the JSON report back in chat. Slow frames are clues, not automatic diagnoses.`);
    const summary=document.createElement('pre');summary.style.cssText='white-space:pre-wrap;font:13px monospace';
    summary.textContent=report.results.map(r=>`${r.id} ${r.fromSimulation?.toFixed(0) ?? 0}–${r.toSimulation?.toFixed(0) ?? 30}s: ${r.timing?.frames ? r.timing.fps.toFixed(1) : '—'} FPS, ${r.timing?.over25 ?? 0} gaps >25ms (${r.status})`).join('\n');this.panelEl.append(summary);
    if(this.storageError)summary.textContent+='\n'+this.storageError;
    if(this.suite && this.suite.index<this.suite.stages.length)this.button('Continue suite (reload)',()=>{if(this.saveSuite())this.reloadStage(this.suite.stages[this.suite.index]);});
    this.button('Share / download report',()=>this.share());
    this.button('Prepare another level',()=>{this.suite=null;this.o.freshStage=null;this.showPanel();});
    this.button('Copy report',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(this.exportReport(),null,2));summary.textContent+='\nReport copied.';}catch{summary.textContent+='\nClipboard unavailable. Use download.';}});
    this.button('Back',()=>this.o.onExit());
  }
  async share() {
    const text=JSON.stringify(this.exportReport(),null,2),name='mashenstein-performance.json';
    const file=new File([text],name,{type:'application/json'});
    try {
      if(Input.isTouchDevice() && navigator.canShare?.({files:[file]}) && navigator.share){await navigator.share({files:[file],title:'MASHENSTEIN performance'});return;}
      const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(e){if(e.name!=='AbortError')this.button('Download instead',()=>{const a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(text);a.download=name;a.click();});}
  }
  exit() {
    clearTimeout(this.autoStart);
    if(this.running)this.finish('left test');
    this.panelEl?.remove();document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('orientationchange',this.onOrientation);window.removeEventListener('mashfatalerror',this.onFatal);Input.clearAll();
  }
}
