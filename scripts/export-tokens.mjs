import { assistantFits } from '../web/foreground-data.js';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function makeTokens() {
  const names=['search','parcel','shortcuts','photos','apps'];
  const keys=['plus','parcel-search','shortcut-4-glyph','photo-3','bottom-app-3'];
  const spring=fit=>({stiffness:fit.k,damping:fit.d,delay:fit.delay});
  return {
    $schema:'./schema.json',version:'0.1.0',status:'reference-preset',
    description:'Empirical fits for this recording; not normative timing values or native OS parameters.',
    units:{time:'seconds',position:'reference-pixels',scale:'ratio',mass:1,stiffness:'s^-2',damping:'s^-1'},
    reference:{width:1182,height:836,recording:'Screenrecorder-2026-09-27-12-47-35-6.mp4',sourceManifest:'../analysis/source-manifest.json'},
    behavior:{retarget:'preserve-position-and-velocity',staleDelay:'cancel',reducedMotion:'snap-and-clear-delays'},
    assistant:{closedX:-550,exitX:-1182,openX:0,layers:names.map((name,i)=>({name,landmark:keys[i],enter:spring(assistantFits[keys[i]]),exit:spring(assistantFits[keys[i]].exit)}))},
    control:{entryFits:'../analysis/inner-motion/control-fit.json',exitObservation:{sourceTime:1.556,glyphScale:0.79,centerPitchRatio:0.92}},
    backdrop:{controlScale:0.9331,assistantScale:0.8491,provenance:'effective-pixel-fit'},
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('../tokens/layered-motion.json',import.meta.url),JSON.stringify(makeTokens(),null,2)+'\n');
  console.log('Exported reference tokens from measured foreground fits.');
}
