import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);out.push(...(entry.isDirectory()?await walk(file):[file]));}return out;}
const candidates=(await Promise.all(['web/reference','web/assets','analysis'].map(name=>walk(path.join(root,name))))).flat();
const selected=candidates.filter(file=>{
  const name=path.relative(root,file).split(path.sep).join('/'),base=path.basename(file);
  return name.startsWith('web/reference/')||name.startsWith('web/assets/')||name.startsWith('analysis/frame-by-frame/')||name.startsWith('analysis/Screenrecorder-')||(name.startsWith('analysis/inner-motion/')&&(/^(native-|detail-)/.test(base)||['assistant-tracks.csv','control-tracks.csv','index.json'].includes(base)));
}).sort();
const files=[];
for(const file of selected){const bytes=await readFile(file);files.push({path:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(path.join(root,'archive/evidence-sha256.json'),JSON.stringify({algorithm:'SHA-256',scope:'source frames, original PTS, measured tracks and playback derivatives; excludes regenerated browser screenshots',files},null,2)+'\n');
console.log(`Recorded ${files.length} evidence hashes. Review the diff before accepting a new evidence baseline.`);
