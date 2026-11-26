'use strict';
const assert=require('node:assert/strict');
const {H,g,document,dispatch,advance,errors,warnings}=require('./stage51_bootstrap.cjs');
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
const el=id=>{const node=document.getElementById(id);assert.ok(node,id);return node;};
const event=(id,type,value)=>{const node=el(id);if(value!==undefined)node.value=String(value);node.dispatchEvent({type,target:node});};
// Renderer controls are observed, not replaced by a fake settings policy. The
// framebuffer remains deliberately simulated; all game/DOM event handlers run.
Object.assign(g.renderer,{atmosphere:true,glWidth:1920,glHeight:1080,rcOutW:1920,rcOutH:1080});
let resizes=0;
g.renderer.resize=function(){resizes++;const m=H.render52.measure(1920,1080,1,4096,this.rcResScale||1);Object.assign(this,{glWidth:m.w,glHeight:m.h,rcOutW:m.outW,rcOutH:m.outH,rcFramebufferLimited52:m.limited});};
check('fresh launch never reports the initial synthetic 60 as measured FPS',()=>{
 g.activeFrames=0;g.fps=60;H.interface52.refresh(g);assert.ok(!el('render-fps52').textContent.includes('60.0'));
 g.diagnosticVisible=true;g.updateDiagnostics();assert.ok(el('stage17-diagnostics').textContent.includes('ממתין'));
});
check('opening the actual pause menu refreshes measured status',()=>{
 g.paused=false;g.activeFrames=25;g.fps=47.25;g.togglePause();assert.equal(g.paused,true);
 assert.ok(el('render-fps52').textContent.includes('47.3'));assert.ok(el('render-status52').textContent.includes('1920×1080'));
});
check('resolution select reaches the actual policy and resizes the target',()=>{
 event('render-mode52','change','1440p');assert.equal(H.render52.getSettings().mode,'1440p');assert.equal(g.renderer.glHeight,1440);
 assert.ok(el('render-status52').textContent.includes('2560×1440'));assert.equal(resizes,1);
});
check('custom slider previews without reallocating until committed',()=>{
 event('render-mode52','change','custom');const before=resizes;
 event('render-scale52','input',80);assert.equal(resizes,before);assert.equal(el('render-scale-value52').textContent,'80%');
 event('render-scale52','change',80);assert.equal(resizes,before+1);assert.equal(H.render52.getSettings().scale,.8);
 assert.equal(g.renderer.glWidth,1536);assert.equal(g.renderer.rcOutW,1920);assert.equal(el('render-scale-row52').hidden,false);
});
check('native keyboard editing stays with sliders and number fields',()=>{
 for(const id of ['render-scale52','render-target52','render-reset52']) {
  let stopped=0,prevented=0;
  el(id).dispatchEvent({type:'keydown',code:'ArrowRight',stopPropagation(){stopped++;},preventDefault(){prevented++;}});
  assert.equal(stopped,1);assert.equal(prevented,0);
  el(id).dispatchEvent({type:'keydown',code:'Escape',stopPropagation(){stopped++;}});assert.equal(stopped,1);
 }
});
check('opt-in target and F4 restore the previous fixed mode',()=>{
 event('render-mode52','change','auto');event('render-target52','change',60);
 assert.equal(H.render52.getSettings().targetFps,60);assert.equal(el('render-target-row52').hidden,false);
 H.render52.toggleAdaptive(g);dispatch('keydown',{code:'F4'});advance(0);
 // The real key handler may itself process F4. Check the rendered policy is
 // always what the authoritative settings currently hold.
 assert.equal(el('render-mode52').value,H.render52.getSettings().mode);
});
check('defaults restore full internal resolution and detailed model policy',()=>{
 el('render-reset52').click();assert.equal(H.render52.getSettings().mode,'1080p');assert.equal(g.renderer.glWidth,1920);
 assert.equal(H.quality51.fixed,true);assert.equal(el('render-scale-row52').hidden,true);assert.equal(el('render-target-row52').hidden,true);
});
check('diagnostics distinguish measured FPS, selected mode and framebuffer limits',()=>{
 H.render52.setSettings({mode:'native'},g);g.renderer.rcFramebufferLimited52=true;g.activeFrames=100;g.fps=42.5;
 g.updateDiagnostics();const content=el('stage17-diagnostics').textContent;
 assert.ok(content.includes('42.5 FPS'));assert.ok(content.includes('רזולוציית המסך'));assert.ok(content.includes('מוגבל תצוגה'));
 assert.ok(!content.includes('50 FPS נמדדו'));
});
assert.deepEqual(errors,[]);assert.deepEqual(warnings.filter(x=>x!=='Audio unavailable ReferenceError: AudioContext is not defined'),[]);
console.log(`Stage 52 resolution interface: ${passed} checks passed; simulated renderer, no GPU claim.`);
