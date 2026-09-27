const slider=document.querySelector('#node-time');
const button=document.querySelector('#node-play');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let timer=null, observations=[];
function stop(){clearInterval(timer);timer=null;button.textContent='播放节点';button.setAttribute('aria-pressed','false');}
function draw(){
  const frame=observations[Number(slider.value)];if(!frame)return;
  document.querySelector('#source-time').textContent=`${frame.pts.toFixed(3)} s`;
  slider.setAttribute('aria-valuetext',`${frame.pts.toFixed(3)} 秒`);
  document.querySelector('#source-frame').href=frame.image;
  document.querySelectorAll('.motion-row').forEach((row,i)=>{
    const value=frame.dx[i];
    row.querySelector('.motion-card').style.transform=`translateX(${value/550*100}%)`;
    row.querySelector('output').textContent=`${value<0?'−':value>0?'+':''}${Math.abs(value)} px`;
  });
}
slider.addEventListener('input',()=>{stop();draw();});
button.addEventListener('click',()=>{
  if(reduced.matches){stop();slider.value=String((Number(slider.value)+1)%observations.length);draw();return;}
  if(timer){stop();return;}
  slider.value='0';draw();button.textContent='暂停';button.setAttribute('aria-pressed','true');
  timer=setInterval(()=>{if(Number(slider.value)>=observations.length-1){stop();return;}slider.value=String(Number(slider.value)+1);draw();},650);
});
reduced.addEventListener('change',()=>{stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{
  const response=await fetch(new URL('observations.json',import.meta.url));
  if(!response.ok)throw Error('Evidence unavailable');
  observations=await response.json();draw();
}catch{
  slider.disabled=true;button.disabled=true;button.textContent='节点数据未加载';
}
