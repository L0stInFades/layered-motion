import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
const port=process.env.MOTION_TEST_PORT||'9876';
const ownServer=!process.env.MOTION_TEST_URL;
const base=process.env.MOTION_TEST_URL||`http://127.0.0.1:${port}/layered-motion/`;
const env={...process.env,MOTION_TEST_URL:base};
const server=ownServer?spawn(process.execPath,['web/server.mjs'],{env:{...env,MOTION_LAB_PORT:port,MOTION_BASE_PATH:'/layered-motion/'},stdio:['ignore','pipe','inherit']}):null;
let serverFailed=false;
server?.on('exit',()=>{serverFailed=true;});
server?.stdout.on('data',chunk=>process.stdout.write(chunk));
try {
  let ready=false;
  for(let i=0;i<100;i++) {
    if(serverFailed)throw Error('Test server exited before becoming ready.');
    try {ready=(await fetch(base,{signal:AbortSignal.timeout(1000)})).ok;}catch{}
    if(ready)break;
    await wait(100);
  }
  if(!ready)throw Error(`Site unavailable: ${base}`);
  for(const file of ['test-site.mjs','test-browser.mjs','test-foreground.mjs','test-frame-inspector.mjs']) {
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[`scripts/${file}`],{env,stdio:'inherit'});
      child.on('error',reject);
      child.on('exit',code=>code===0?resolve():reject(Error(`${file}: exit ${code}`)));
    });
  }
} finally {
  if(server && server.exitCode===null) {
    server.kill('SIGTERM');
    await new Promise(resolve=>server.once('exit',resolve));
  }
}
