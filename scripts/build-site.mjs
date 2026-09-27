import {cp,readFile,writeFile,mkdir,rm,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {marked} from 'marked';
import {makeTokens} from './export-tokens.mjs';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'_site');
assert.deepEqual(JSON.parse(await readFile(path.join(root,'tokens/layered-motion.json'),'utf8')),makeTokens(),'Run node scripts/export-tokens.mjs after refitting.');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','site','web','analysis','docs','tokens','archive','README.md','MEDIA_NOTICE.md','CHANGELOG.md','LICENSE']){
  await cp(path.join(root,name),path.join(out,name),{recursive:true,filter:src=>!['server.mjs','package.json','.DS_Store'].includes(path.basename(src))&&!path.basename(src).startsWith('failure.')});
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rewrite=html=>html.replace(/(href|src)="([^"#]+)\.md(#[^"]*)?"/g,(all,key,url,hash='')=>/^[a-z]+:/i.test(url)?all:`${key}="${url}.html${hash}"`);
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const e of entries){const f=path.join(dir,e.name);files.push(...(e.isDirectory()?await walk(f):[f]));}return files;}
for(const file of await walk(out)){
  if(file.endsWith('.md')){
    const raw=await readFile(file,'utf8'),title=raw.split('\n').find(l=>l.startsWith('# '))?.slice(2)||'Layered Motion';
    const base=path.relative(path.dirname(file),out).split(path.sep).join('/')||'.';
    const html=`<!doctype html><html lang="${file.endsWith('.en.md')?'en':'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Layered Motion</title><link rel="icon" href="${base}/site/mark.svg"><link rel="stylesheet" href="${base}/site/spec.css"></head><body><a class="skip" href="#document">跳到正文</a><header class="masthead"><a class="wordmark" href="${base}/"><img src="${base}/site/mark.svg" width="29" height="29" alt=""><b>层序</b><span>LAYERED MOTION</span></a><nav aria-label="主导航"><a href="${base}/docs/specification.html">规范</a><a href="${base}/web/">实验室 ↗</a><a href="https://github.com/L0stInFades/layered-motion">GitHub ↗</a></nav></header><main class="document" id="document"><nav class="doc-crumb"><a href="${base}/">← 首页</a><a href="${base}/docs/specification.html">设计规范</a><a href="${base}/docs/archive.html">档案</a><a href="${path.basename(file)}">Markdown ↗</a></nav><article class="prose">${rewrite(marked.parse(raw))}</article></main><footer class="site-footer"><p>Layered Motion / v0.1.0 · 原始观测、设计要求与参考拟合分别标注。</p><a href="${base}/MEDIA_NOTICE.html">媒体与许可</a></footer></body></html>`;
    await writeFile(file.replace(/\.md$/,'.html'),html);
  }else if(file.endsWith('.html'))await writeFile(file,rewrite(await readFile(file,'utf8')));
}
const csv=(await readFile(path.join(root,'analysis/inner-motion/assistant-tracks.csv'),'utf8')).trim().split(/\r?\n/);
const keys=csv.shift().split(','),rows=csv.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],Number(v)])));
const frames=JSON.parse(await readFile(path.join(root,'analysis/inner-motion/index.json'),'utf8'));
const features=['plus','parcel-search','shortcut-4-glyph','photo-3','bottom-app-3'];
const observations=[3.935,3.98,4.024,4.068,4.112].map(pts=>{
  const row=rows.find(r=>r.pts===pts),frame=frames.find(r=>r.pts===pts);
  assert.ok(row&&frame);features.forEach(name=>assert.ok(row[name+'_score']>.8));
  return {pts,dx:features.map(name=>row[name+'_dx']),image:'analysis/inner-motion/'+frame.native};
});
await writeFile(path.join(out,'site/observations.json'),JSON.stringify(observations,null,2)+'\n');
await writeFile(path.join(out,'.nojekyll'),'');
// Catch broken public relative links, including the Unicode research paths.
let links=0;
for(const file of (await walk(out)).filter(f=>f.endsWith('.html'))){
  const html=await readFile(file,'utf8');
  for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(?:[a-z]+:|#|\/\/)/i.test(href))continue;
    const clean=decodeURIComponent(href.split(/[?#]/)[0]);if(!clean)continue;
    let target=path.resolve(path.dirname(file),clean);
    try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');await stat(target);links++;}
    catch{throw Error(`Broken link in ${path.relative(out,file)}: ${href}`);}
  }
}
console.log(`Built static specification, lab and evidence; verified ${links} local links.`);
