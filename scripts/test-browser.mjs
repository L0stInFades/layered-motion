import {launchBrowser,labURL} from './browser-runtime.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'analysis/browser-checks');await fs.mkdir(out,{recursive:true});
const browser=await launchBrowser();
const errors=[],checks=[];
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const snap=()=>page.evaluate(()=>window.motionLab.snapshot());
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS',name);};
const settle=async()=>page.waitForFunction(()=>!window.motionLab.snapshot().moving,null,{timeout:6000});
const scene=async(name,app)=>{await page.evaluate(([n,a])=>window.motionLab.setScene(n,a),[name,app]);await settle();};
const shot=async(name,full=false)=>full?page.screenshot({path:path.join(out,name+'.png'),fullPage:true}):page.locator('#device').screenshot({path:path.join(out,name+'.png')});
async function drag(from,to,steps=14){
  await page.locator('#device').scrollIntoViewIfNeeded();
  const box=await page.locator('#device').boundingBox();const p=v=>({x:box.x+v[0]/1182*box.width,y:box.y+v[1]/836*box.height});
  const a=p(from),b=p(to);await page.mouse.move(a.x,a.y);await page.mouse.down();
  for(let i=1;i<=steps;i++){await page.mouse.move(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps);await page.waitForTimeout(12);}
  await page.mouse.up();await settle();
}
try{
  await page.goto(labURL,{waitUntil:'networkidle'});await settle();
  const geom=await page.locator('#device').boundingBox();check('source aspect ratio preserved',Math.abs(geom.width/geom.height-1182/836)<.002);
  check('replica uses no video element',await page.locator('#device video').count()===0);
  await shot('home',true);
  await drag([1020,15],[1020,470]);check('top-right drag opens control center',(await snap()).scene==='control');
  await shot('control');
  await page.click('#wifi-tile');await settle();check('WLAN morph expands',(await snap()).scene==='wifi');await shot('wifi');
  await page.keyboard.press('Escape');await settle();check('Escape collapses detail to control',(await snap()).scene==='control');
  await page.click('#music-tile');await settle();await page.click('#detail-play');check('music controls respond',await page.locator('#detail-play').textContent()==='Ⅱ');await shot('music');
  await scene('control');
  const volume=await page.locator('.volume').boundingBox();await page.mouse.move(volume.x+volume.width/2,volume.y+volume.height/2);await page.mouse.down();await page.waitForTimeout(430);await page.mouse.up();await settle();
  check('long press opens volume expansion',(await snap()).scene==='volume');await shot('volume');
  await scene('brightness');await shot('brightness');
  await scene('control');await page.locator('.volume').focus();const volumeBefore=Number(await page.locator('.volume').getAttribute('aria-valuenow'));await page.keyboard.press('ArrowDown');check('slider supports keyboard',Number(await page.locator('.volume').getAttribute('aria-valuenow'))===volumeBefore-5);
  check('focused controls never scroll the tablet canvas',await page.evaluate(()=>document.querySelector('#device').scrollTop===0&&document.querySelector('#world').scrollTop===0));
  await scene('home');await drag([280,15],[280,490]);check('top-left drag opens notifications',(await snap()).scene==='notifications');await shot('notifications');
  await page.click('#clear-notifications');await settle();check('clear notification returns home',(await snap()).scene==='home');
  await drag([8,360],[480,360]);check('left edge drag opens assistant',(await snap()).scene==='assistant');await shot('assistant');
  await scene('home');await page.click('.hotspot.notes');await settle();check('notes icon opens native DOM application',(await snap()).scene==='app'&&(await snap()).app==='notes');await shot('notes');
  await drag([590,821],[690,605],18);check('bottom gesture dismisses app',(await snap()).scene==='home');
  const closed=await snap();check('window settles into launch icon',Math.abs(closed.rect.x-342)<1&&Math.abs(closed.rect.y-534)<1);
  await scene('recents');await shot('recents');await page.click('[data-recent="browser"]');await settle();check('recent card expands into selected app',(await snap()).scene==='app'&&(await snap()).app==='browser');
  await scene('home');
  const continuity=await page.evaluate(()=>{window.motionLab.setScene('control');return new Promise(resolve=>setTimeout(()=>{const before=window.motionLab.snapshot();window.motionLab.setScene('home');const after=window.motionLab.snapshot();resolve({before,after});},75));});
  check('interrupted transition retains position and velocity',continuity.before.channels.control.x===continuity.after.channels.control.x&&continuity.before.channels.control.v===continuity.after.channels.control.v);
  await settle();
  await page.click('[data-mode="compare"]');await page.evaluate(()=>window.motionLab.seek(6.25));await page.waitForTimeout(250);await shot('comparison',true);
  check('source seek and replica share time',Math.abs(await page.locator('#reference').evaluate(v=>v.currentTime)-6.25)<.03);
  const before=(await snap()).playTime;await page.click('#next-frame');check('next frame advances to true PTS',(await snap()).playTime>before&&(await snap()).playTime-before<.017);
  await page.selectOption('#clip','2');await page.waitForTimeout(200);await page.evaluate(()=>window.motionLab.seek(8.18));check('second recording replays volume detail',(await snap()).scene==='volume');
  await page.selectOption('#clip','1');await page.waitForTimeout(200);await page.evaluate(()=>window.motionLab.seek(4.75));check('first recording replays notifications',(await snap()).scene==='notifications');
  await page.selectOption('#clip','3');await page.click('#play');
  await page.waitForFunction(()=>{const v=document.querySelector('#reference');return v.readyState>=3&&!v.paused&&v.currentTime>.2;},{},{timeout:10000});
  await page.waitForTimeout(1100);
  // Sample both clocks in one rendered frame: separate protocol round trips
  // introduce unrelated latency on a busy CI renderer.
  const timing=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
    const state=window.motionLab.snapshot(),video=document.querySelector('#reference');
    resolve({playing:state.playing,model:state.playTime,video:video.currentTime,readyState:video.readyState,paused:video.paused});
  })));
  assert.ok(timing.playing&&timing.video>.2&&Math.abs(timing.model-timing.video)<.08,JSON.stringify(timing));
  check('comparison playback remains synchronized',true);
  const stalled=await page.evaluate(async()=>{
    const video=document.querySelector('#reference');video.pause();const t=video.currentTime;
    await new Promise(resolve=>setTimeout(resolve,220));
    const model=window.motionLab.snapshot().playTime;await video.play();return {model,video:t};
  });
  check('comparison clock waits for its media source',Math.abs(stalled.model-stalled.video)<.03);
  await page.click('#play');
  await page.click('[data-mode="research"]');check('research view visible',await page.locator('#research').isVisible());await page.screenshot({path:path.join(out,'research.png'),fullPage:true});
  await page.click('[data-mode="interact"]');await scene('home');
  await page.evaluate(()=>window.motionLab.startMetrics());await page.click('#demo');await page.waitForTimeout(4500);await page.click('#demo');
  const ms=await page.evaluate(()=>window.motionLab.stopMetrics());ms.sort((a,b)=>a-b);
  const performance={frames:ms.length,median_ms:ms[Math.floor(ms.length*.5)],p95_ms:ms[Math.floor(ms.length*.95)],platform:process.platform,architecture:process.arch,viewport:{width:1440,height:1000},note:'Headless Chromium in this test environment; not a guarantee for other devices.'};
  await page.setViewportSize({width:390,height:844});await scene('control');await shot('mobile',true);
  check('mobile has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.click('[data-mode="compare"]');check('mobile comparison keeps both screens visible',await page.locator('#reference').isVisible()&&await page.locator('#device').isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.motionLab.setScene('notifications'));check('reduced motion snaps immediately',(await snap()).channels.notifications.x===1);
  check('no browser errors or missing assets',errors.length===0);
  const result={passed:checks.length,checks,errors,performance};await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));await fs.rm(path.join(out,'failure.json'),{force:true});await fs.rm(path.join(out,'failure.png'),{force:true});console.log(JSON.stringify(result,null,2));
}catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:e.message,checks,errors,state:await snap()},null,2));throw e;}
finally{await browser.close();}
