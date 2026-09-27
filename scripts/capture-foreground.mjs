import {launchBrowser,labURL} from './browser-runtime.mjs';
import fs from 'node:fs/promises';
const out=new URL('../analysis/inner-motion/',import.meta.url);
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1560,height:1200}});
  await page.goto(labURL,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'.workspace{display:block!important}.side-panel{display:none!important}.device{width:1182px!important;height:836px!important;max-width:none!important}.world{transform:scale(1)!important}'});
  const states=[];
  for(const t of [1.056,1.145,1.233,1.534,1.556,3.889,3.935,3.98,4.024,4.135,4.312,4.345]){
    await page.evaluate(t=>window.motionLab.seek(t),t);
    await page.locator('#device').screenshot({path:new URL(`browser-${t}.png`,out).pathname});
    states.push({t,state:await page.evaluate(()=>window.motionLab.snapshot())});
  }
  await fs.writeFile(new URL('browser-states.json',out),JSON.stringify(states,null,2));
  console.log('12 exact-time DOM renders captured');
}finally{await browser.close();}
