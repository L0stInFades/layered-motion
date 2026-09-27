import {launchBrowser,labURL} from './browser-runtime.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=new URL('../analysis/inner-motion/',import.meta.url);
const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const csv=async name=>{const [header,...lines]=(await fs.readFile(new URL(name,out),'utf8')).trim().split(/\r?\n/);const keys=header.split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],Number.isNaN(Number(v))?v:Number(v)])));};
async function capture(time){return page.evaluate(t=>{
  window.motionLab.seek(t);
  const world=document.querySelector('#world').getBoundingClientRect(),scale=world.width/1182;
  const box=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {x:(b.x-world.x)/scale,y:(b.y-world.y)/scale,w:b.width/scale,h:b.height/scale};};
  return {state:window.motionLab.snapshot(),assistant:['.assistant-search','.schedule','.assistant-tools','.photo-card','.suggestions'].map(box),quick:Array.from({length:8},(_,i)=>box(`#quick-grid>button:nth-child(${i+1})`))};
},time);}
try{
  await page.goto(labURL,{waitUntil:'networkidle'});
  const source=await csv('assistant-tracks.csv'),assistantErrors=[];
  const names=['plus','parcel-search','shortcut-4-glyph','photo-3','bottom-app-3'],base=[78,78,78,78,68];
  for(const t of [3.889,3.935,3.98,4.024,4.068,4.112,4.157]){
    const actual=await capture(t),row=source.find(r=>r.pts===t);
    names.forEach((name,i)=>{if(row[`${name}_score`]>.8)assistantErrors.push(actual.assistant[i].x-base[i]-row[`${name}_dx`]);});
  }
  const rms=values=>Math.sqrt(values.reduce((sum,x)=>sum+x*x,0)/values.length);
  const assistantRMSE=rms(assistantErrors);
  check('five assistant rows match independently tracked source positions within 8px RMS',assistantRMSE<8);
  const exitErrors=[];
  for(const t of [4.246,4.279,4.312,4.345,4.379]){
    const actual=await capture(t),row=source.find(r=>r.pts===t);
    names.forEach((name,i)=>{if(row[`${name}_score`]>.8)exitErrors.push(actual.assistant[i].x-base[i]-row[`${name}_dx`]);});
  }
  const exitRMSE=rms(exitErrors);
  check('assistant exit matches visible source landmarks within 16px RMS',exitRMSE<16);
  const ordered=await capture(3.935);
  check('search, parcel, shortcuts, photos, apps arrive in source order',ordered.assistant.every((b,i,a)=>i===0||b.x-base[i]<a[i-1].x-base[i-1]-15));
  const before=ordered.state.foreground;
  await page.waitForTimeout(200);
  check('paused frame retains every foreground position and velocity',JSON.stringify(before)===JSON.stringify(await page.evaluate(()=>window.motionLab.snapshot().foreground)));
  const control=await csv('control-tracks.csv'),controlErrors=[];
  for(const [n,t] of [[94,1.056],[98,1.101],[102,1.145],[106,1.189],[110,1.233],[118,1.324]]){
    const actual=await capture(t);
    for(let i=0;i<4;i++){
      const row=control.find(r=>r.frame===n&&r.feature===(i===0?'quick-1-shell':`quick-${i+1}`));
      if(row.score>.7){const b=actual.quick[i];controlErrors.push(b.x+b.w/2-row.x,b.y+b.h/2-row.y);}
    }
  }
  const controlRMSE=rms(controlErrors);
  check('individual control shortcuts match source centers within 6px RMS',controlRMSE<6);
  const closing=await capture(1.556),q=closing.quick;
  const pitch=(q[1].x+q[1].w/2-q[0].x-q[0].w/2)/109,disc=q[0].w/86;
  check('on exit the discs shrink more than their center spacing',pitch-disc>.10&&disc<.85);
  for(const [name,t] of [['control',1.079],['assistant',3.935]]){
    await capture(t);
    const pair=await page.evaluate(()=>{const before=window.motionLab.snapshot().foreground;window.motionLab.setScene('home');return [before,window.motionLab.snapshot().foreground];});
    const moving=name==='assistant'?pair.map(p=>p.assistant):pair.map(p=>p.control.flatMap(l=>[l.x,l.y,l.scale]));
    check(`${name} reversal preserves every layer position and velocity`,moving[0].every((s,i)=>s.x===moving[1][i].x&&s.v===moving[1][i].v));
  }
  await capture(3.78);await page.evaluate(()=>window.motionLab.setScene('home'));await page.waitForTimeout(800);
  check('reversing before delayed entry cannot reveal a stale card',await page.evaluate(()=>window.motionLab.snapshot().foreground.assistant.every(l=>l.x<-510&&l.target===-1182)));
  await page.evaluate(()=>window.motionLab.setScene('home'));
  await page.waitForFunction(()=>!window.motionLab.snapshot().moving,null,{timeout:6000});
  await page.locator('#device').scrollIntoViewIfNeeded();
  const device=await page.locator('#device').boundingBox(),scale=device.width/1182;
  await page.mouse.move(device.x+8*scale,device.y+350*scale);await page.mouse.down();
  for(let i=1;i<=8;i++){await page.mouse.move(device.x+(8+i*37.5)*scale,device.y+350*scale);await page.waitForTimeout(16);}
  const dragged=await page.evaluate(()=>window.motionLab.snapshot().foreground.assistant);
  check('real pointer entry preserves row order while held',dragged.every((l,i,a)=>i===0||l.x<a[i-1].x-2));
  await page.mouse.up();
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.motionLab.setScene('assistant'));
  check('reduced motion snaps all five layers and clears pending delays',await page.evaluate(()=>window.motionLab.snapshot().foreground.assistant.every(l=>l.x===0&&l.v===0&&l.delay===0)));
  check('no foreground browser errors',errors.length===0);
  await fs.writeFile(new URL('browser-validation.json',out),JSON.stringify({checks,errors,assistantRMSE,assistantSamples:assistantErrors.length,exitRMSE,exitSamples:exitErrors.length,controlRMSE,controlSamples:controlErrors.length,exit:{pitch,disc}},null,2));
}finally{await browser.close();}
