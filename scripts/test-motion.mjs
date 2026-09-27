import assert from 'node:assert/strict';
import {Spring,springStep} from '../web/motion.js';

// A physical-time spring must be invariant under display refresh rate, for all
// damping regimes and nonzero velocities, including after direction reversal.
for(const damping of [15,2*Math.sqrt(360),55]){
  const expected=springStep(.25,-2,1,.7,360,damping);
  for(const fps of [24,60,90,120]){
    let [x,v]=[.25,-2];const frames=Math.floor(.7*fps);
    for(let i=0;i<frames;i++)[x,v]=springStep(x,v,1,1/fps,360,damping);
    [x,v]=springStep(x,v,1,.7-frames/fps,360,damping);
    assert.ok(Math.abs(x-expected[0])<1e-10,`position at ${fps}fps, damping ${damping}`);
    assert.ok(Math.abs(v-expected[1])<1e-10,`velocity at ${fps}fps, damping ${damping}`);
  }
}
const s=new Spring();s.to(1);s.step(.09);const x=s.x,v=s.v;s.to(0);
assert.equal(s.x,x);assert.equal(s.v,v);assert.ok(v>0);
s.step(.001);assert.ok(s.x>x,'momentum is preserved immediately after reversal');
for(let i=0;i<240;i++)s.step(1/120);
assert.equal(s.x,0);assert.equal(s.v,0);
for(let i=0;i<1000;i++){s.to(i%2);s.step(.004);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.v));}
console.log('PASS: 24/60/90/120 Hz invariance, under/critical/over damping, continuous retargeting, settling and rapid reversal.');
