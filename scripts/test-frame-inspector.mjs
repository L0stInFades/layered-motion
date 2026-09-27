import {launchBrowser,labURL} from './browser-runtime.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:1440,height:1100}}),checks=[];
const check=(s,b)=>{assert.ok(b,s);checks.push(s);};
try{
  await page.goto(labURL,{waitUntil:'networkidle'});await page.click('[data-mode=research]');
  for(const [segment,width] of [['control-enter',860],['control-exit',860],['assistant-enter',1030],['assistant-exit',1030]]){
    await page.selectOption('#frame-segment',segment);await page.locator('#frame-image').evaluate(img=>img.decode());
    check(segment+' native crop loads',await page.locator('#frame-image').evaluate(img=>img.naturalWidth)===width);
    await page.click('#frame-next');await page.locator('#frame-image').evaluate(img=>img.decode());
    check(segment+' consecutive frame advances',await page.locator('#frame-position').evaluate(el=>el.value.startsWith('2 /')));
  }
  await page.click('#frame-detail');await page.locator('#frame-image').evaluate(img=>img.decode());
  check('full-frame toggle works',await page.locator('#frame-image').evaluate(img=>img.naturalWidth)===1182);
  await page.click('#frame-detail');await page.setViewportSize({width:390,height:844});
  check('zoom controls fit narrow screens',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'analysis/inner-motion/inspector-mobile.png',fullPage:true});
  await fs.writeFile('analysis/inner-motion/inspector-validation.json',JSON.stringify({checks},null,2));
  console.log(checks.join('\n'));
}finally{await browser.close();}
