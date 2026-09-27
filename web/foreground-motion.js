import {Spring} from './motion.js';
import {controlFits, assistantFits} from './foreground-data.js';

// Delays live on simulation time, so scrubbing, slow playback and interruption
// use the same path. Residual velocity coasts through a short wait, rather than
// freezing a layer or silently dropping the measured wait at the end of entry.
class LayerSpring extends Spring {
  delay = 0;
  to(value, delay = 0) {
    if (value === this.target) return this;
    this.delay = delay;
    return super.to(value);
  }
  snap(value, velocity = 0) { this.delay = 0; return super.snap(value, velocity); }
  step(dt) {
    const held = Math.min(dt, this.delay);
    this.x += this.v * held;
    this.delay -= held;
    return super.step(dt - held);
  }
  get moving() { return this.delay > 0 || super.moving; }
}

export function createForegroundMotion(root) {
  const one = s => root.querySelector(s), all = s => [...root.querySelectorAll(s)];
  const selectors = {wifi:'#wifi-tile',music:'#music-tile',brightness:'.brightness',volume:'.volume',devices:'#devices-tile'};
  const quick = all('#quick-grid > button');
  const layers = Object.entries(selectors).map(([name,selector]) => ({name,el:one(selector),fit:controlFits[name]}));
  layers.splice(1,0,{name:'data',el:one('#data-tile'),fit:{...controlFits.wifi,center:[1002,181],axes:{...controlFits.wifi.axes,x:{...controlFits.wifi.axes.x,start:92}}}});
  quick.forEach((el,i) => {
    const fit=controlFits[`quick-${i<8?i+1:i%4+5}`];
    layers.push({name:`quick-${i+1}`,el,fit,quick:true,center:[730+i%4*109,715+Math.floor(i/4)*109]});
  });
  layers.forEach(layer => {
    layer.center ??= layer.fit.center;
    layer.axes=Object.fromEntries(Object.entries(layer.fit.axes).map(([key,fit]) => [key,new LayerSpring(key==='scale'?1:0,fit.k,fit.d)]));
    layer.el.style.transformOrigin='50% 50%';
  });
  const assistant = [
    ['search','.assistant-search, .assistant-add','plus'],
    ['parcel','.schedule','parcel-search'],
    ['shortcuts','.assistant-tools','shortcut-4-glyph'],
    ['photos','.photo-card','photo-3'],
    ['apps','.suggestions','bottom-app-3']
  ].map(([name,selector,fit]) => ({name,els:all(selector),fit:assistantFits[fit],x:new LayerSpring(-550)}));
  const springs=[...layers.flatMap(l=>Object.values(l.axes)),...assistant.map(l=>l.x)];
  let stiffness=1,damping=1,controlOpen=false,assistantOpen=false;
  function configure(layer,open) {
    for (const [key,s] of Object.entries(layer.axes)) {
      s.stiffness=(open?layer.fit.axes[key].k:565)*stiffness;
      s.damping=(open?layer.fit.axes[key].d:46)*damping;
    }
  }
  function configureAssistant(layer,open) {
    const fit=open?layer.fit:layer.fit.exit;
    layer.x.stiffness=fit.k*stiffness;layer.x.damping=fit.d*damping;
  }
  function tune(k,d) {
    stiffness=k/260;damping=d/32;
    layers.forEach(l=>configure(l,controlOpen));
    assistant.forEach(l=>configureAssistant(l,assistantOpen));
  }
  function control(show,wasHidden) {
    if(show===controlOpen && !wasHidden)return;
    controlOpen=show;
    layers.forEach(l=>{
      configure(l,show);
      if(show && wasHidden)for(const [key,s] of Object.entries(l.axes))s.snap(l.fit.axes[key].start);
      // A circle shrinks around its own center. Its center travels only 38%
      // of the equivalent group-scale distance during dismissal.
      const [cx,cy]=l.center,anchor=l.quick?1204:l.name==='devices'?1042:997;
      const targets=show?{x:0,y:0,scale:1}:{x:(anchor-cx)*.55*(l.quick?.38:1),y:-75-(cy-136)*.27,scale:.45};
      for(const [key,s] of Object.entries(l.axes))s.to(targets[key]);
    });
  }
  function assistantScene(show) {
    if(show===assistantOpen)return;
    assistantOpen=show;
    const hidden=assistant.every(l=>l.x.x < -510);
    assistant.forEach(l=>{
      configureAssistant(l,show);
      if(show&&hidden)l.x.snap(-550);
      const fit=show?l.fit:l.fit.exit;
      const atRestEnd=Math.abs(l.x.x)<5&&Math.abs(l.x.v)<150;
      const wait=(show&&hidden)||(!show&&atRestEnd)?fit.delay:0;
      l.x.to(show?0:-1182,wait/Math.sqrt(stiffness));
    });
  }
  function draw(scroll,opacity) {
    for(const l of layers){
      const {x,y,scale}=l.axes;
      l.el.style.transform=`translate3d(${x.x}px,${y.x-(l.quick?0:scroll)}px,0) scale(${Math.max(.01,scale.x)})`;
      l.el.style.opacity=opacity*(l.name==='data'?.48:1);
      if(l.quick)l.el.style.visibility=Number(l.name.slice(6))>8&&scroll===0?'hidden':'visible';
    }
    one('#quick-grid').style.transform=`translateY(${-scroll}px)`;
    one('#quick-grid').style.opacity=1;
    assistant.forEach(l=>l.els.forEach(el=>el.style.transform=`translate3d(${l.x.x}px,0,0)`));
  }
  function capture() {return {control:layers.map(l=>Object.fromEntries(Object.entries(l.axes).map(([k,s])=>[k,s.x]))),assistant:assistant.map(l=>l.x.x)};}
  function dragControl(progress,velocity,g,dy) {
    controlOpen=null; // release must retarget every layer even if the scene name agrees
    layers.forEach((l,i)=>{
      if(g.startProgress<.01){
        for(const [key,s] of Object.entries(l.axes)){
          const end=key==='scale'?1:0,start=l.fit.axes[key].start;
          s.snap(start+(end-start)*progress,(end-start)*velocity);
        }
      }else{
        const state=g.foreground.control[i],closing=g.startProgress-progress;
        l.axes.x.snap(state.x+(l.quick?18:30)*closing,-(l.quick?18:30)*velocity);
        l.axes.y.snap(state.y+dy*(l.quick?.28:.22),velocity*360*(l.quick?.28:.22));
        l.axes.scale.snap(Math.max(.3,state.scale-.5*closing),.5*velocity);
      }
    });
  }
  function dragAssistant(dx,velocity,g) {
    assistantOpen=null;
    assistant.forEach((l,i)=>{
      const start=g.startProgress<.01?-503:g.foreground.assistant[i];
      if(g.startProgress<.01){
        // Follow the moving pointer with a faster search row and progressively
        // slower lower rows. Do not restart a timer on every pointer event.
        l.x.stiffness=[1500,1100,800,600,450][i]*stiffness;
        l.x.damping=2*Math.sqrt(l.x.stiffness)*damping;
        l.x.to(Math.min(40,start+dx));
      }else l.x.snap(Math.min(40,start+dx),velocity);
    });
  }
  function dragStep(dt,g){
    if(g?.type!=='assistant'||!g.moved||g.startProgress>=.01)return false;
    const moving=assistant.some(l=>l.x.moving);
    if(moving)assistant.forEach(l=>l.x.step(dt));
    return moving;
  }
  function reset() {
    controlOpen=false;assistantOpen=false;
    layers.forEach(l=>Object.entries(l.axes).forEach(([k,s])=>s.snap(k==='scale'?1:0)));
    assistant.forEach(l=>l.x.snap(-550));
  }
  function snapshot() {
    return {control:layers.map(l=>({name:l.name,...Object.fromEntries(Object.entries(l.axes).map(([k,s])=>[k,{x:s.x,v:s.v,target:s.target}]))})),assistant:assistant.map(l=>({name:l.name,x:l.x.x,v:l.x.v,target:l.x.target,delay:l.x.delay}))};
  }
  return {springs,tune,control,assistantScene,draw,capture,dragControl,dragAssistant,dragStep,reset,snapshot,stopVelocity:()=>springs.forEach(s=>s.v=0)};
}
