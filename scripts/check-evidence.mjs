import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const manifest=await read('analysis/source-manifest.json');
assert.equal(manifest.filter(r=>r.playable).length,3);assert.equal(manifest.filter(r=>!r.playable&&r.bytes===0).length,2);
const frames=await read('analysis/frame-by-frame/index.json'),native=await read('analysis/inner-motion/index.json');
assert.equal(frames.length,147);assert.equal(native.length,147);
const times=await read('web/reference/frame-times.json');
assert.equal(Object.values(times).reduce((n,r)=>n+r.length,0),2409);
const expected={'control-enter':53,'control-exit':23,'assistant-enter':41,'assistant-exit':30};
for(const [segment,count] of Object.entries(expected)){
  const group=frames.filter(r=>r.segment===segment);assert.equal(group.length,count);
  for(let i=0;i<group.length;i++){
    const row=group[i];assert.ok(times['3'].some(t=>Math.abs(t-row.pts)<1e-7));
    if(i){assert.equal(row.source_frame,group[i-1].source_frame+1);assert.ok(row.pts>group[i-1].pts);}
  }
}
for(let i=0;i<frames.length;i++){
  assert.equal(frames[i].source_frame,native[i].source_frame);
  for(const p of ['analysis/frame-by-frame/'+frames[i].image,'analysis/inner-motion/'+native[i].native,`analysis/inner-motion/detail-${String(i+1).padStart(4,'0')}.jpg`])assert.ok((await stat(p)).size>0);
}
const inventory=await read('archive/evidence-sha256.json');
for(const row of inventory.files){
  const bytes=await readFile(row.path);assert.equal(bytes.length,row.bytes,row.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
}
console.log(`PASS: provenance, 2,409 PTS records, 147 continuous frames, ${inventory.files.length} evidence hashes.`);
