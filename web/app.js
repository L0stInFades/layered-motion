import {Spring, springStep, clamp, mix, smooth, recordings} from './motion.js';
import {createForegroundMotion} from './foreground-motion.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const W = 1182, H = 836;
const device = $('#device'), world = $('#world'), reference = $('#reference');
const icons = {
  wifi:'<path d="M2 8a16 16 0 0 1 20 0M5.5 12a10.5 10.5 0 0 1 13 0" stroke-width="3.2" stroke-linecap="butt"/><path d="M8 16a6.5 6.5 0 0 1 8 0l-4 4.5Z" fill="currentColor" stroke="none"/>',
  search:'<circle cx="10" cy="10" r="7.5"/><path d="m16 16 6 6"/>',
  parcel:'<rect x="3" y="7" width="18" height="14" rx="2" fill="currentColor" stroke="none"/><path d="M4 5h16L18 2H6Z" fill="currentColor" stroke="none"/><path d="M10 12h4" stroke="white"/>',
  parcelOutline:'<path d="M5 3h14l2 5v13H3V8Zm-2 5h18M9 3v5m6-5v5M7 12h4m-4 4h7"/>',
  scanChat:'<path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6"/><ellipse cx="11" cy="11" rx="5" ry="4" fill="currentColor" stroke="none"/><ellipse cx="15.5" cy="15" rx="4" ry="3.5" fill="currentColor" stroke="none"/><path d="m7 14-1 3 4-2m7 2 2 2v-4" fill="currentColor" stroke="none"/><g fill="#35bc32" stroke="none"><circle cx="9" cy="10" r=".65"/><circle cx="12.5" cy="10" r=".65"/><circle cx="14" cy="14" r=".6"/><circle cx="17" cy="14" r=".6"/></g>',
  scanCheck:'<path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6m4-3 4 4 8-8"/>',
  scanPay:'<path d="M3 8V3h6m6 0h6v5m0 8v5h-6m-6 0H3v-5M2 12h20"/>',
  barcode:'<rect x="2" y="2" width="20" height="20" rx="1"/><path d="M7 8v9m3-9v9m4-9v9m3-9v9"/>',
  wechat:'<ellipse cx="10" cy="10" rx="8" ry="6.5" fill="white" stroke="none"/><ellipse cx="16" cy="16" rx="6.5" ry="5.5" fill="white" stroke="#08cf61" stroke-width=".7"/><path d="m4 14-1 4 5-2m12 3 2 4-5-3" fill="white" stroke="none"/><g fill="#08cf61" stroke="none"><circle cx="7" cy="9" r=".9"/><circle cx="12" cy="9" r=".9"/><circle cx="14" cy="15" r=".8"/><circle cx="18" cy="15" r=".8"/></g>',
  data:'<path d="M7 3v18l-4-4M17 21V3l4 4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2 2m11.6 11.6 2 2M4.2 19.8l2-2M17.8 6.2l2-2"/>',
  volume:'<path d="M11 4 5 9H2v6h3l6 5V4Z" fill="currentColor"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  bluetooth:'<path d="m8 7 10 10-6 5V2l6 5L8 17"/>',
  plane:'<path d="m12 1 2 8 8 5v2l-8-3v7l3 2H7l3-2v-7l-8 3v-2l8-5 2-8Z" fill="currentColor" stroke-width=".5"/>',
  bell:'<path d="M6 17h12l-2-4V8a4 4 0 0 0-8 0v5l-2 4Z" fill="currentColor"/><path d="M10 21h4"/>',
  torch:'<path d="M5 2h14M6 6h12l-3 6v10H9V12L6 6Z"/><path d="M12 13v4"/>',
  cut:'<rect x="2" y="2" width="20" height="20" rx="3"/><path d="m7 6 10 12M17 6 7 18"/>',
  battery:'<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M23 10v4M7 12h8m-4-4v8"/>',
  rotate:'<path d="m6 3-4 6 4 6m12-6 4 6-4 6M9 2h6l4 10-4 10H9L5 12 9 2Z"/>',
  lock:'<rect x="6" y="10" width="12" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/>',
  cast:'<path d="M2 7V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M2 21h.01M2 16a5 5 0 0 1 5 5M2 11a10 10 0 0 1 10 10"/>',
  moon:'<path d="M20 16A10 10 0 0 1 8 3a10 10 0 1 0 12 13Z"/>',
  gear:'<path d="m9 3 1-2h4l1 2 3 2 3 1v4l-1 2 1 2v4l-3 1-3 2-1 2h-4l-1-2-3-2-3-1v-4l1-2-1-2V6l3-1 3-2Z"/><circle cx="12" cy="12" r="4"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.gear}</svg>`;
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
$('#devices-tile').innerHTML = ['tower','camera','camera ball','lamp','screen','speakers','hub','more'].map(t => `<div class="device-disc ${t === 'more' ? 'more' : ''}">${t === 'more' ? '•••' : `<span class="mini-device ${t}"></span>`}</div>`).join('');
$('#quick-grid').innerHTML = ['bluetooth','plane','bell','torch','cut','battery','rotate','lock','cast','moon','gear','gear'].map((n,i) => `<button class="glass ${!i ? 'active' : ''}" aria-label="${['蓝牙','飞行模式','铃声','手电筒','截图','省电模式','自动旋转','锁定','投屏','勿扰','设置','更多'][i]}" aria-pressed="${!i}"><span class="icon">${icon(n)}</span></button>`).join('');
$('#quick-grid').addEventListener('click', e => {const b=e.target.closest('button');if(b){b.classList.toggle('active');b.setAttribute('aria-pressed',b.classList.contains('active'));}});
$('#assistant-layer').innerHTML=`
  <div class="assistant-search glass">${icon('search')}<span>搜索</span></div>
  <button class="assistant-add glass" aria-label="添加卡片">＋</button>
  <div class="assistant-card schedule"><div class="parcel-heading">1个快递已签收 <span class="parcel-actions">${icon('search')}${icon('parcelOutline')}</span></div><div class="parcel-row"><i>${icon('parcel')}</i><div><b>快递 <mark>已签收</mark></b><p>您的快件由本人签收，感谢您使用快递，期待再次为…</p></div></div></div>
  <div class="assistant-tools">${['scanChat','scanCheck','scanPay','barcode'].map((n,i)=>`<span>${icon(n)}${i===2?'<i class="pay-badge">支</i>':''}</span>`).join('')}</div>
  <div class="assistant-card photo-card"><div>广州市热门拍照机位推荐 <span>更多 ›</span></div><div class="landscapes">${[1,2,3].map(i=>`<img src="assets/assistant-photo-${i}.jpg" alt="录屏中的拍照机位缩略图" draggable="false">`).join('')}</div></div>
  <div class="assistant-card suggestions"><div class="today-card"><b>今日安排</b><p>· 健身　　□</p></div><div class="assistant-apps"><i class="app-tiktok">♪</i><i class="app-mi">mi</i><i class="app-wechat">${icon('wechat')}</i><i class="app-pink"></i><i class="app-red"></i><i class="app-violet"></i></div></div>`;
const overlayStatus=document.createElement('div');overlayStatus.className='overlay-status';overlayStatus.innerHTML='<span>12:47 <b>●</b> ···</span><span>◒ ▰ 61▰</span>';world.append(overlayStatus);

const origins = {notes:[342,534,78,78],browser:[456,534,78,78],store:[992,75,78,78],files:[751,91,73,73],gallery:[112,534,78,78]};
const appNames = {notes:'笔记',browser:'浏览器',store:'应用商店',files:'文件管理',gallery:'相册'};
const appStatus = '<div class="app-status"><span>12:47 <span style="color:#fa6060">●</span></span><span>···</span><span>◒ ▰ 61</span></div>';
function appHTML(name) {
  if (name === 'notes') return appStatus + `<div class="app-toolbar"><b>笔记</b><span class="spacer"></span><span>☑</span><span>⋮</span><span>⛶</span></div><div class="notes-layout"><div class="notes-sidebar"><div class="notes-search">⌕ 搜索</div><div class="notes-categories"><span>全部</span><span>手写</span><span>录音</span><span>待办</span></div>${[['欢迎使用小米笔记','小米笔记，带口袋里，随处整理。'],['超好用的语音速记','灵感，随时随地记下来。'],['周末清单','把想做的事，慢慢变成日常。'],['今天的小确幸','记录生活里值得留住的时刻。']].map((x,i)=>`<div class="note-row ${i===0?'active':''}"><b>${x[0]}</b><p>${x[1]}</p></div>`).join('')}</div><div class="note-detail"><h2>欢迎使用小米笔记</h2><h3>小米笔记，开口即记，智慧整理</h3><h3>语音速记</h3><p>想法总是在不经意间出现。用文字、声音和画面，把每一个闪现的灵感留下来。</p><div class="note-phone"><b>语音速记</b><p>与朋友分享一个新的想法<br>周末去看一场日落<br>整理今天的阅读笔记</p><small>──────────────</small><p>让记录，自然发生。</p></div></div></div>`;
  if (name === 'browser') return appStatus + '<div class="browser-bar"><span>←</span><span>→</span><span>↻</span><div class="address">◉　搜索或输入网址</div><span>☆</span><span>▣</span><span>≡</span></div><div class="browser-bookmarks"><span>我的主页</span><span>个人收藏</span><span>最近访问</span></div><div class="browser-page"></div>';
  if (name === 'store') return appStatus + `<div class="store-tabs"><b>推荐</b><span>分类</span><span>大屏必备</span><div class="store-search">⌕　发现更适合你的应用</div></div><div class="store-feature"><div><h2>发现更多可能</h2><p>为大屏而来，让每一刻更精彩</p></div><span>✳</span></div><div class="store-items">${[['♪','抖音'],['◉','小红书'],['▧','剪映专业版'],['◈','高德地图'],['▤','WPS for Pad'],['✦','精选应用']].map(([i,n])=>`<div class="store-app"><i>${i}</i><div><b>${n}</b><small>为你的大屏精心推荐</small></div></div>`).join('')}</div><div class="store-bottom"><span style="color:#e8a633">⌂ 推荐</span><span>▧ 游戏</span><span>☆ 榜单</span><span>♙ 我的</span></div>`;
  if (name === 'gallery') return appStatus + '<div class="gallery-preview"></div>';
  return appStatus + `<div class="app-toolbar"><b>文件管理</b><span>最近</span><span>分类</span><span class="spacer"></span><span>⌕</span><span>⋮</span></div><div class="files-grid">${['图片','视频','文档','下载','音乐','收藏','最近文件','其他'].map(n=>`<div class="folder-item"><div>▰</div><span>${n}</span></div>`).join('')}</div>`;
}
$('#recent-grid').innerHTML = ['store','browser','gallery','notes'].map((name,i) => `<button class="recent-card" data-recent="${name}" aria-label="切换到${appNames[name]}"><label><i>${['▧','◉','▰','▤'][i]}</i>${appNames[name]}</label><div class="recent-screen"><div class="app-content">${appHTML(name)}</div></div></button>`).join('');

const channels = {
  control:new Spring(0,430,37), notifications:new Spring(), assistant:new Spring(0,340,33),
  app:new Spring(0,440,38), recents:new Spring(0,310,31), detail:new Spring(0,430,38),
  backdrop:new Spring(0,420,40), shade:new Spring(0,300,34), assistantDepth:new Spring(0,420,40)
};
const rect = {x:new Spring(0,420,38),y:new Spring(0,420,38),w:new Spring(W,420,38),h:new Spring(H,420,38),r:new Spring(0,360,36)};
const controlPose={zoom:new Spring(.42,260,32),lift:new Spring(22,260,32),shift:new Spring(0,260,32)};
const foreground=createForegroundMotion(world);
const allSprings = [...Object.values(channels),...Object.values(rect),...Object.values(controlPose),...foreground.springs];
let currentScene='home', currentApp='notes', appOrigin=origins.notes.slice(), detailType='wifi';
let mode='interact', speed=1, blurMax=28, scale=1, dirty=true, playing=false, playTime=0, eventIndex=0, selectedRecording=recordings[2];
let gesture=null, suppressClickUntil=0, lastTime=0, frameSamples=[], recordMetric=false;
let pressTimer=0,controlScroll=0;
let playbackEnd=Infinity;
let timelineHold=false;
let frameTimes={};
fetch('reference/frame-times.json').then(r=>r.json()).then(data=>{frameTimes=data;}).catch(()=>{});
const detailScenes=['wifi','music','brightness','volume'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneNames={home:'桌面',control:'控制中心',notifications:'通知中心',assistant:'负一屏',app:'应用开合',recents:'多任务',wifi:'WLAN',music:'音乐控制'};
function setRect(values, snap=false) { ['x','y','w','h','r'].forEach((k,i) => snap?rect[k].snap(values[i]):rect[k].to(values[i])); }
function loadApp(name, origin) {
  currentApp = name;
  appOrigin = origin ? origin.slice() : origins[name].slice();
  $('#app-content').innerHTML = appHTML(name);
  $('#icon-proxy').style.backgroundPosition = `-${origins[name][0]}px -${origins[name][1]}px`;
}
function detailHTML(type) {
  if(type==='wifi') return '<div class="detail-title">WLAN <span class="toggle"></span></div><div class="network"><span class="icon">'+icon('wifi')+'</span><div><b>MI-Demo</b><small>已连接</small></div><span>✓</span></div><div class="detail-footer">更多设置</div>';
  if(type==='brightness')return '<div class="expanded-brightness"><input type="range" min="0" max="100" value="81" aria-label="展开的亮度调节"><span class="icon">'+icon('sun')+'</span></div><div class="display-options"><button>☼<small>自动亮度</small></button><button>◉<small>护眼模式</small></button><button>◔<small>深色模式</small></button></div>';
  if(type==='volume')return '<div class="expanded-volumes">'+['媒体音量','铃声音量','闹钟音量'].map((name,i)=>'<label><input type="range" min="0" max="100" value="'+[66,44,70][i]+'" aria-label="'+name+'"><span class="icon">'+icon(i?'bell':'volume')+'</span></label>').join('')+'</div><div class="sound-options"><button>♧　 静音模式</button><button>☾　 勿扰模式</button></div>';
  return '<div class="album-art">♪</div><div class="detail-music-title">暂无播放</div><div class="detail-track"></div><div class="detail-playback"><span>◀</span><button id="detail-play" aria-label="播放音乐">▶</button><span>▶</span></div><div class="detail-volume">◖　 本机</div>';
}
function setScene(scene, app='notes', options={}) {
  if(!options.replay){stopPlayback();timelineHold=false;}
  if(scene==='control-scroll'){controlScroll=85;scene='control';}else if(scene!=='control'){controlScroll=0;}
  const showingControl=scene==='control'||detailScenes.includes(scene);
  foreground.control(showingControl,channels.control.x<.0001);
  foreground.assistantScene(scene==='assistant');
  const k=Number($('#stiffness').value),damping=Number($('#damping').value);
  channels.assistant.stiffness=k*(scene==='assistant'?3.46:80/260);
  channels.assistant.damping=damping*(scene==='assistant'?1.875:18/32);
  channels.control.stiffness=k;channels.control.damping=damping*(showingControl?1:.95);
  Object.values(controlPose).forEach(s=>{s.stiffness=channels.control.stiffness;s.damping=channels.control.damping;});
  if(showingControl){
    if(channels.control.x<.0001){controlPose.zoom.snap(.42);controlPose.lift.snap(22);controlPose.shift.snap(0);}
    controlPose.zoom.to(1);controlPose.lift.to(0);controlPose.shift.to(0);
  }else{controlPose.zoom.to(.94);controlPose.lift.to(-140);controlPose.shift.to(-25);}
  if(detailScenes.includes(scene)){
    detailType=scene;$('#detail-window').dataset.type=scene;$('#detail-content').innerHTML=detailHTML(scene);
    channels.assistantDepth.to(0);
    $$('#detail-content input[type=range]').forEach((input,i)=>{
      const refresh=()=>{input.style.background=`linear-gradient(to top,#fff0ea ${input.value}%,#ffffff18 ${input.value}%)`;if(scene==='brightness'||(scene==='volume'&&i===0))setSlider(scene==='brightness'?$('.brightness'):$('.volume'),Number(input.value)/100);};
      input.addEventListener('input',refresh);refresh();
    });
    channels.control.to(1);channels.detail.to(1);channels.backdrop.to(1);channels.shade.to(1);
    ['notifications','assistant','app','recents'].forEach(k=>channels[k].to(0));
  }else{
    Object.entries(channels).forEach(([k,s])=>s.to(k===scene?1:0));
    channels.backdrop.to(['control','notifications','assistant','recents','app'].includes(scene)?1:0);
    channels.assistantDepth.to(scene==='assistant'?1:0);
    channels.shade.to(['control','notifications','assistant','recents'].includes(scene)?1:0);
    if(scene==='app'){
      const wasVisible=channels.app.x>.001;
      if(app!==currentApp||!wasVisible)loadApp(app,options.origin);
      if(!wasVisible){setRect([...appOrigin,20],true);channels.app.snap(0).to(1);}
      if(options.fromRecent){setRect([...options.fromRecent,28],true);channels.app.snap(1);}
      setRect([0,0,W,H,0]);
    } else if (scene==='recents' && channels.app.x>.01) {
      const i=['store','browser','gallery','notes'].indexOf(currentApp);
      setRect([109+(Math.max(i,0)%2)*473,190+Math.floor(Math.max(i,0)/2)*373,430,306,28]);
    } else if(scene==='home')setRect([...appOrigin,20]);
  }
  currentScene=scene;
  if(reduceMotion.matches&&!options.replay) allSprings.forEach(s=>s.snap(s.target));
  $$('.scene-list button').forEach(b=>b.classList.toggle('selected',b.dataset.scene===(detailScenes.includes(scene)?'control':scene)));
  dirty=true;
}
function visibility(el, value, interactive=true){el.style.opacity=clamp(value);el.style.pointerEvents=interactive&&value>.5?'auto':'none';el.setAttribute('aria-hidden',value<.01?'true':'false');if('inert'in el)el.inert=value<.01;}
const cp=$$('.control-piece');
// Empirical RGB affine transform fitted to a control-center background ROI.
const gradeTarget=[.6794,-.3682,.0594,0,25.3846/255,-.1706,.6405,-.0408,0,18.6086/255,-.1103,-.3392,.8781,0,16.6557/255,0,0,0,1,0];
const assistantGrade=[.99575,-.22539,-.08371,0,17.6367/255,.01286,.88499,-.35301,0,21.2677/255,-.02925,-.03128,.60684,0,23.4323/255,0,0,0,1,0];
// Cache the two color treatments as separate static surfaces; animate only
// their composition and the parent's Gaussian blur, avoiding per-frame SVG edits.
$('#grade-matrix').setAttribute('values',gradeTarget.join(' '));
const svgDefs=$('#grade-matrix').parentElement.parentElement;
const assistantFilter=$('#grade-matrix').parentElement.cloneNode(true);assistantFilter.id='assistant-grade';assistantFilter.firstElementChild.removeAttribute('id');assistantFilter.firstElementChild.setAttribute('values',assistantGrade.join(' '));svgDefs.append(assistantFilter);
const clearPlate=$('#home-plane img');
const controlPlate=clearPlate.cloneNode();controlPlate.alt='';controlPlate.setAttribute('aria-hidden','true');controlPlate.className='graded-plate control-grade';$('#home-plane').append(controlPlate);
const assistantPlate=clearPlate.cloneNode();assistantPlate.alt='';assistantPlate.setAttribute('aria-hidden','true');assistantPlate.className='graded-plate assistant-grade';$('#home-plane').append(assistantPlate);
function render(){
  const c=channels.control.x,n=channels.notifications.x,s=channels.assistant.x,a=channels.app.x,r=channels.recents.x,d=channels.detail.x,bg=clamp(channels.backdrop.x);
  const home=$('#home-plane');
  const depth=clamp(channels.assistantDepth.x);
  home.style.transform=`translate3d(${bg*2.5+depth*1.5}px,${bg*.4+depth*2.5}px,0) scale(${1-.067*bg-.084*depth})`;
  controlPlate.style.opacity=clamp((bg-depth)/Math.max(.0001,1-depth));assistantPlate.style.opacity=depth;
  home.style.filter=bg>.0001?`blur(${(bg+.793*depth)*blurMax}px)`:'none';
  $('#scrim').style.opacity=0;
  $('#home-hotspots').style.pointerEvents=Math.max(c,n,s,a,r,d)<.04?'auto':'none';
  visibility($('#control-layer'),smooth(0,.08,c)*(1-clamp(d)));
  cp[0].style.transform=`translate3d(${90*(1-clamp(c))}px,${controlPose.lift.x*.3}px,0)`;
  cp[0].style.opacity=smooth(0,.4,c);
  foreground.draw(controlScroll,smooth(.25,1,clamp(c))**2);
  visibility($('#notification-layer'),smooth(.03,.4,n));
  $('#notification-layer').style.transform=`translate3d(0,${-130*(1-n)}px,0) scale(${.96+.04*n})`;
  $$('.notification-card').forEach((el,i)=>el.style.transform=`translateY(${-(1-n)*(i*17)}px)`);
  visibility($('#assistant-layer'),smooth(0,.20,s));
  $('#assistant-layer').style.transform='none';
  overlayStatus.style.opacity=clamp(depth*4);overlayStatus.style.pointerEvents='none';
  const x=rect.x.x,y=rect.y.x,w=Math.max(1,rect.w.x),h=Math.max(1,rect.h.x),radius=Math.max(0,rect.r.x),sx=w/W,sy=h/H;
  const win=$('#app-window');
  visibility(win,a>.001?smooth(.015,.16,a):0);
  win.style.transform=`translate3d(${x}px,${y}px,0) scale(${sx},${sy})`;
  win.style.borderRadius=`${radius/sx}px / ${radius/sy}px`;
  $('#app-content').style.opacity=smooth(.12,.42,a);
  const proxy=$('#icon-proxy');
  proxy.style.opacity=clamp(smooth(0,.045,a)*(1-smooth(.06,.31,a)));
  proxy.style.transform=`translate3d(${x}px,${y}px,0) scale(${w/78},${h/78})`;
  proxy.style.borderRadius=`${radius*78/w}px / ${radius*78/h}px`;
  visibility($('#recents-layer'),smooth(.04,.6,r));
  $('#recents-layer').style.transform=`translate3d(0,${105*(1-r)}px,0) scale(${.9+.1*r})`;
  const detail=$('#detail-window');
  visibility(detail,smooth(.025,.16,d));
  const origin=detailType==='wifi'?[684,136,200,90]:detailType==='music'?[684,246,200,200]:[detailType==='volume'?1012:902,246,91,200];
  const target=detailType==='wifi'?[684,100,418,630]:detailType==='music'?[684,246,418,375]:[684,157,418,505];
  const dw=mix(origin[2],target[2],d),dh=mix(origin[3],target[3],d);
  detail.style.width=target[2]+'px';detail.style.height=target[3]+'px';
  detail.style.transform=`translate3d(${mix(origin[0],target[0],d)}px,${mix(origin[1],target[1],d)}px,0) scale(${dw/target[2]},${dh/target[3]})`;
  $('#detail-content').style.opacity=smooth(.12,.6,d);
  const indicator=$('#home-indicator');indicator.style.background=a>.8?'#19191966':'#ffffff66';
  indicator.style.opacity=1-clamp(c)*.98;
  $('#live-state').textContent=playing?'PLAYING':gesture?'DRAGGING':allSprings.some(s=>s.moving)?'SETTLING':'READY';
  dirty=false;
}
function resize(){const full=document.fullscreenElement===device;scale=full?Math.min(device.clientWidth/W,device.clientHeight/H):device.clientWidth/W;world.style.left=full?((device.clientWidth-W*scale)/2)+'px':'0';world.style.top=full?((device.clientHeight-H*scale)/2)+'px':'0';world.style.transform=`scale(${scale})`;dirty=true;}
new ResizeObserver(resize).observe(device);resize();
document.addEventListener('fullscreenchange',resize);
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await device.requestFullscreen();}catch{$('#interaction-hint').textContent='当前浏览器不支持全屏，可使用浏览器的页面缩放。';}};

function stopPlayback(){if(playing)timelineHold=true;playing=false;playbackEnd=Infinity;reference.pause();$('#play').textContent='▶';$('#demo').innerHTML='<span>▶</span> 播放浮窗演示';}
function resetState(){allSprings.forEach(s=>s.snap(0));foreground.reset();setRect([0,0,W,H,0],true);currentScene='home';controlScroll=0;}
function seek(time,updateVideo=true){
  playTime=clamp(time,0,selectedRecording.duration);resetState();eventIndex=0;
  let t=0;
  while(t<playTime+1e-8){
    while(eventIndex<selectedRecording.events.length&&selectedRecording.events[eventIndex][0]<=t+1e-8){const e=selectedRecording.events[eventIndex++];setScene(e[1],e[2],{replay:true});}
    if(t>=playTime)break;
    const nextEvent=selectedRecording.events[eventIndex]?.[0]??Infinity;
    const dt=Math.min(1/120,playTime-t,Math.max(0,nextEvent-t));
    if(dt<1e-9){t=nextEvent;continue;}
    allSprings.forEach(s=>s.step(dt));t+=dt;
  }
  if(updateVideo&&Number.isFinite(reference.duration))reference.currentTime=Math.min(playTime,reference.duration);
  timelineHold=true;updateTransport();dirty=true;render();
}
function updateTransport(){$('#timeline').value=playTime;$('#timecode').textContent=`${playTime.toFixed(2).padStart(5,'0')} / ${selectedRecording.duration.toFixed(2)}`;}
async function startPlayback(){
  if(playTime>=selectedRecording.duration-.05)seek(0);
  playing=true;$('#play').textContent='Ⅱ';$('#demo').innerHTML='<span>Ⅱ</span> 暂停演示';
  reference.playbackRate=speed;
  if(mode==='compare'){
    reference.currentTime=playTime;
    try{await reference.play();}catch{playing=false;$('#live-state').textContent='点击播放以继续';}
  }
}
function switchMode(next){stopPlayback();mode=next;$('#workspace').classList.toggle('compare',next==='compare');$('#workspace').hidden=next==='research';$('#workspace').style.display=next==='research'?'none':'';$('#research').hidden=next!=='research';$$('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===next));$('#stage-title').textContent=next==='compare'?'原片与复刻 · 同一时间轴':'实时网页 · 可直接操作';$('#interaction-hint').innerHTML=next==='compare'?'按录屏事件时间重放 · 拖动时间轴查看过渡 · 参数为近似复刻':'<span>↙</span> 右上角下拉打开控制中心 · 点击桌面应用 · 底部上滑返回';if(next==='compare')seek(playTime);requestAnimationFrame(resize);}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
$$('[data-scene]').forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.scene)));
$$('[data-app]').forEach(b=>b.addEventListener('click',()=>{if(performance.now()>suppressClickUntil)setScene('app',b.dataset.app,{origin:b.dataset.origin==='dock'?[742,716,78,78]:undefined});}));
$('#home').onclick=()=>setScene('home');$('#home-indicator').onclick=()=>{if(performance.now()>suppressClickUntil)setScene('home');};$('#recent-close').onclick=()=>setScene('home');
$('#wifi-tile').onclick=()=>{if(performance.now()>suppressClickUntil)setScene('wifi');};$('#music-tile').onclick=()=>{if(performance.now()>suppressClickUntil)setScene('music');};
$('#clear-notifications').onclick=()=>setScene('home');
$('#recent-grid').onclick=e=>{const card=e.target.closest('[data-recent]');if(!card||performance.now()<suppressClickUntil)return;const i=$$('[data-recent]').indexOf(card);setScene('app',card.dataset.recent,{fromRecent:[109+i%2*473,190+Math.floor(i/2)*373,430,306]});};
$('#detail-content').onclick=e=>{const b=e.target.closest('#detail-play');if(b){b.textContent=b.textContent==='▶'?'Ⅱ':'▶';$('.detail-music-title').textContent=b.textContent==='Ⅱ'?'演示播放':'暂无播放';}const toggle=e.target.closest('.display-options button,.sound-options button');if(toggle){toggle.classList.toggle('active');toggle.setAttribute('aria-pressed',toggle.classList.contains('active'));}};
$('#play').onclick=()=>playing?stopPlayback():startPlayback();
$('#demo').onclick=()=>{if(playing){stopPlayback();return;}if(mode==='research')switchMode('interact');if(selectedRecording.id!==3){$('#clip').value='3';$('#clip').onchange();}seek(0);playbackEnd=mode==='compare'?Infinity:5.75;startPlayback();};
$('#timeline').addEventListener('input',()=>{stopPlayback();seek(Number($('#timeline').value));});
$('#clip').onchange=()=>{stopPlayback();selectedRecording=recordings[Number($('#clip').value)-1];reference.src=`reference/clip-${selectedRecording.id}.mp4`;$$('#home-plane img').forEach(img=>img.src=`assets/home-${selectedRecording.id}.jpg`);overlayStatus.firstElementChild.innerHTML=['12:35','12:37','12:47'][selectedRecording.id-1]+' <b>●</b> ···';$('#timeline').max=selectedRecording.duration;$('#timeline').step=.001;$('#source-fps').textContent=selectedRecording.id===3?'≈ 90 fps':'≈ 24 fps';seek(0);};
function stepFrame(direction){stopPlayback();const times=frameTimes[selectedRecording.id];if(times){const t=direction>0?times.find(t=>t>playTime+.0001):times.findLast(t=>t<playTime-.0001);seek(t??(direction>0?selectedRecording.duration:0));}else seek(playTime+direction/(selectedRecording.id===3?90:24.3));}
$('#prev-frame').onclick=()=>stepFrame(-1);$('#next-frame').onclick=()=>stepFrame(1);
$$('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);reference.playbackRate=speed;$$('[data-speed]').forEach(el=>el.classList.toggle('selected',el===b));});

function updateTuning(){
  const k=Number($('#stiffness').value),c=Number($('#damping').value);blurMax=Number($('#blur').value);
  allSprings.forEach(s=>{s.stiffness=k;s.damping=c;});
  channels.backdrop.stiffness=k*1.66;channels.backdrop.damping=c*1.3;
  channels.shade.stiffness=k*1.66;channels.shade.damping=c*1.3;
  channels.assistantDepth.stiffness=k*1.66;channels.assistantDepth.damping=c*1.3;
  channels.assistant.stiffness=k*3.46;channels.assistant.damping=c*1.875;
  foreground.tune(k,c);
  $('#stiffness-value').value=k;$('#damping-value').value=c;$('#blur-value').value=blurMax+' px';
  let path='';for(let i=0;i<=160;i++){const [x]=springStep(0,0,1,i/200,k,c);path+=`${i?'L':'M'}${(i/160*260).toFixed(2)} ${(58-x*44).toFixed(2)} `;}$('#curve-path').setAttribute('d',path);dirty=true;
}
['stiffness','damping','blur'].forEach(id=>$('#'+id).addEventListener('input',updateTuning));$('#reset-tuning').onclick=()=>{$('#stiffness').value=260;$('#damping').value=32;$('#blur').value=27;updateTuning();};updateTuning();

// Pointer coordinates are mapped back into the captured tablet's coordinate space.
function point(e){const r=world.getBoundingClientRect();return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};}
function setSlider(el,value){const p=clamp(value);el.querySelector('.slider-fill').style.height=p*100+'%';el.setAttribute('aria-valuenow',Math.round(p*100));}
$$('[data-slider]').forEach(el=>el.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();setSlider(el,(Number(el.getAttribute('aria-valuenow'))+(['ArrowUp','ArrowRight'].includes(e.key)?5:-5))/100);}}));
device.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  if(e.target.matches('#detail-content input'))return;
  stopPlayback();timelineHold=false;const p=point(e),slider=e.target.closest('[data-slider]'),edge=e.target.closest('[data-gesture]');
  let type=edge?.dataset.gesture;
  if(slider)type='slider';
  else if(type==='home')type=channels.app.x>.5?'app-close':'dismiss';
  else if(!type){if(channels.detail.x>.4)type='detail';else if(channels.control.x>.4)type='control';else if(channels.notifications.x>.4)type='notifications';else if(channels.assistant.x>.4)type='assistant';else if(channels.recents.x>.4)type='dismiss';else if(channels.app.x<.1)type='assistant';}
  if(!type)return;
  const relevant=channels[type];
  gesture={id:e.pointerId,type,slider,start:p,last:p,lastAt:e.timeStamp,velocity:{x:0,y:0},moved:false,edge:!!edge,startProgress:relevant?.x||0,startBackdrop:channels.backdrop.x,startedScene:currentScene,startZoom:controlPose.zoom.x,startLift:controlPose.lift.x,startShift:controlPose.shift.x,foreground:foreground.capture()};
  if(slider)setSlider(slider,1-(p.y-246)/200);
  clearTimeout(pressTimer);
  if(slider)pressTimer=setTimeout(()=>{if(gesture&&!gesture.moved){gesture.expanded=true;setScene(slider.dataset.slider);}},360);
  $('#touch-dot').style.display=e.pointerType==='mouse'?'block':'none';$('#touch-dot').style.transform=`translate(${p.x-15}px,${p.y-15}px)`;
});
device.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const g=gesture,p=point(e),dx=p.x-g.start.x,dy=p.y-g.start.y,dt=Math.max(.001,(e.timeStamp-g.lastAt)/1000);
  g.velocity={x:clamp(g.velocity.x*.55+(p.x-g.last.x)/dt*.45,-3000,3000),y:clamp(g.velocity.y*.55+(p.y-g.last.y)/dt*.45,-3000,3000)};g.last=p;g.lastAt=e.timeStamp;
  $('#touch-dot').style.transform=`translate(${p.x-15}px,${p.y-15}px)`;
  if(!g.moved&&Math.hypot(dx,dy)<7)return;
  if(!g.moved){clearTimeout(pressTimer);device.setPointerCapture(e.pointerId);g.moved=true;}
  e.preventDefault();
  if(g.type==='slider'){setSlider(g.slider,1-(p.y-246)/200);return;}
  if(g.type==='app-close'){
    const shrink=clamp(-dy/1100,0,.58),ww=W*(1-shrink),hh=H*(1-shrink);
    const vals=[(W-ww)/2+dx*.35,dy*.27+(H-hh)/2,ww,hh,36*clamp(shrink*6)];
    ['x','y','w','h','r'].forEach((k,i)=>{const v=(vals[i]-rect[k].x)/dt;rect[k].snap(vals[i],v);});
    channels.backdrop.snap(clamp(-dy/350));channels.shade.snap(clamp(-dy/600));
  }else if(['control','notifications','assistant'].includes(g.type)){
    const horizontal=g.type==='assistant',distance=horizontal?420:360,delta=horizontal?dx:dy;
    const p=clamp(g.startProgress+delta/distance,-.035,1.04),v=(horizontal?g.velocity.x:g.velocity.y)/distance;
    if(horizontal){
      foreground.dragAssistant(dx,g.velocity.x,g);
      const start=g.startProgress<.01?1-503/W:g.startProgress;
      channels.assistant.snap(clamp(start+dx/W,1-510/W,1.05),g.velocity.x/W);
      g.reveal=clamp(g.startBackdrop+dx/420);
      channels.backdrop.snap(g.reveal);channels.assistantDepth.snap(g.reveal);
    }else{
      channels[g.type].snap(p,v);channels.backdrop.snap(clamp(p));channels.assistantDepth.to(0);
      if(g.type==='control'){
        foreground.dragControl(p,v,g,dy);
        if(g.startProgress<.01){controlPose.zoom.snap(.42+.58*p,.58*v);controlPose.lift.snap(22*(1-p),-22*v);controlPose.shift.snap(0);}
        else{controlPose.zoom.snap(g.startZoom+.1*(p-g.startProgress),.1*v);controlPose.lift.snap(g.startLift+dy*.25,g.velocity.y*.25);controlPose.shift.snap(g.startShift-25*(g.startProgress-p),25*v);}
      }
    }
    channels.shade.snap(horizontal?g.reveal:clamp(p));
    Object.keys(channels).filter(k=>!['backdrop','shade','assistantDepth',g.type].includes(k)).forEach(k=>channels[k].to(0));
    currentScene=g.type;
  }dirty=true;
});
function release(e,cancelled=false){
  if(!gesture||gesture.id!==e.pointerId)return;
  const g=gesture;gesture=null;clearTimeout(pressTimer);$('#touch-dot').style.display='none';
  // Holding still before release consumes the fling velocity. Otherwise a short
  // drag followed by a pause would unexpectedly complete as a fast swipe.
  if(e.timeStamp-g.lastAt>90){g.velocity={x:0,y:0};if(channels[g.type])channels[g.type].v=0;if(g.type==='app-close')Object.values(rect).forEach(s=>s.v=0);if(g.type==='control')Object.values(controlPose).forEach(s=>s.v=0);foreground.stopVelocity();}
  if(device.hasPointerCapture(e.pointerId))device.releasePointerCapture(e.pointerId);
  if(g.moved){
    suppressClickUntil=performance.now()+220;
    if(g.type==='app-close'){
      const dy=g.last.y-g.start.y;
      if(cancelled)setScene('app',currentApp);
      else if(dy<-230&&Math.abs(g.velocity.y)<350)setScene('recents');
      else setScene(dy<-75||g.velocity.y<-550?'home':'app',currentApp);
    }else if(['control','notifications','assistant'].includes(g.type)){
      const p=g.type==='assistant'?g.reveal:channels[g.type].x,v=g.type==='assistant'?g.velocity.x/420:channels[g.type].v;
      setScene(cancelled?g.startedScene:p+v*.13>.45?g.type:'home');
    }else if(g.type==='dismiss')setScene('home');
  }else if(!cancelled){
    if(g.edge)setScene(g.type==='dismiss'?'home':g.type==='app-close'?'home':g.type);
    else if(g.type==='detail'&&!e.target.closest('#detail-window'))setScene('control');
    else if(g.type==='control'&&!e.target.closest('.control-piece'))setScene('home');
    else if(['control','notifications','assistant'].includes(g.type)&&!e.target.closest('#control-layer,#notification-layer,#assistant-layer,.hotspot'))setScene('home');
  }
  dirty=true;
}
device.addEventListener('pointerup',e=>release(e));device.addEventListener('pointercancel',e=>release(e,true));
device.addEventListener('wheel',e=>{if(channels.control.x>.5&&channels.detail.x<.1){e.preventDefault();controlScroll=clamp(controlScroll+e.deltaY*.3,0,210);dirty=true;}},{passive:false});
window.addEventListener('pointerup',e=>{if(gesture)release(e);});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea'))return;
  if(e.key==='Escape'){e.preventDefault();setScene(channels.detail.x>.1?'control':'home');}
  if(e.key===' '){e.preventDefault();playing?stopPlayback():startPlayback();}
  const shortcut={c:'control',n:'notifications',w:'assistant',a:'app',r:'recents'}[e.key.toLowerCase()];if(shortcut)setScene(shortcut);
});
document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden)stopPlayback();});

function tick(now){
  let dt=lastTime?Math.max(0,(now-lastTime)/1000):0;lastTime=now;
  if(recordMetric&&dt>0)frameSamples.push(dt*1000);
  if(playing){
    const next=mode==='compare'&&!reference.paused?reference.currentTime:playTime+dt*speed;
    // Reconstruct from source time on compare seeks/drift; otherwise integrate at
    // exact event boundaries so a late browser frame cannot delay an event.
    if(next<playTime||next-playTime>.15){seek(next,false);}else{
      let t=playTime;
      while(eventIndex<selectedRecording.events.length&&selectedRecording.events[eventIndex][0]<=next){
        const e=selectedRecording.events[eventIndex++];const step=Math.max(0,e[0]-t);allSprings.forEach(s=>s.step(step));t=Math.max(t,e[0]);setScene(e[1],e[2],{replay:true});
      }
      allSprings.forEach(s=>s.step(Math.max(0,next-t)));playTime=next;updateTransport();
    }
    if(playTime>=Math.min(selectedRecording.duration,playbackEnd)){playTime=Math.min(selectedRecording.duration,playbackEnd);stopPlayback();updateTransport();}
    dirty=true;
  }else if(gesture){if(foreground.dragStep(Math.min(dt,.15)*speed,gesture))dirty=true;}
  else if(allSprings.some(s=>s.moving)&&!timelineHold){allSprings.forEach(s=>s.step(Math.min(dt,.15)*speed));dirty=true;}
  if(dirty)render();requestAnimationFrame(tick);
}
loadApp('notes');setScene('home');render();requestAnimationFrame(tick);

// Small public inspection surface for reproducible browser verification.
window.motionLab={setScene,seek,switchMode,snapshot:()=>({scene:currentScene,app:currentApp,mode,playing,playTime,moving:allSprings.some(s=>s.moving),channels:Object.fromEntries(Object.entries(channels).map(([k,s])=>[k,{x:s.x,v:s.v,target:s.target}])),rect:Object.fromEntries(Object.entries(rect).map(([k,s])=>[k,s.x])),foreground:foreground.snapshot()}),startMetrics:()=>{frameSamples=[];recordMetric=true;},stopMetrics:()=>{recordMetric=false;return frameSamples;}};

// Every exported source frame is inspectable; this panel uses no generated frames.
async function initFrameInspector(){
  const response=await fetch('../analysis/frame-by-frame/index.json');if(!response.ok)return;
  const index=await response.json();
  const names={'control-enter':'下拉浮窗 · 进入','control-exit':'下拉浮窗 · 退出','assistant-enter':'负一屏 · 进入','assistant-exit':'负一屏 · 退出'};
  const notes={'control-enter':'逐个看按钮中心：WLAN、媒体、滑块、设备区、快捷按钮的横向位置、纵向位置与缩放不是同一个进度，尾段还会轻微越过终点再收稳。','control-exit':'注意圆形按钮自身的直径与按钮中心间距：直径收缩更多。整个网格一起缩小无法复现这个差别。','assistant-enter':'搜索栏 → 快递卡 → 快捷图标 → 照片卡 → 底部应用依次收稳。3.935 秒，各层距终点约为 44 / 70 / 106 / 164 / 271 px；同一排快捷图标保持相对位置。','assistant-exit':'先共同向左移动，后段下方几层离开更快。退出有独立轨迹，不能把进入动画倒放。'};
  const el=document.createElement('section');el.className='frame-inspector';el.innerHTML=`<div class="frame-inspector-heading"><div><span class="eyebrow">EVERY ORIGINAL FRAME</span><h3>147 帧，一张一张看。</h3></div><select id="frame-segment" aria-label="选择逐帧片段">${Object.entries(names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div class="frame-photo"><img id="frame-image" alt="原录屏的连续原始帧" width="1182" height="836"><span id="frame-number"></span></div><div class="frame-controls"><button id="frame-prev" aria-label="查看前一张原帧">←</button><input id="frame-range" type="range" min="0" step="1" value="0" aria-label="连续原帧序号"><button id="frame-next" aria-label="查看后一张原帧">→</button><output id="frame-position"></output></div><p id="frame-observation"></p><a href="../analysis/逐帧观察.md" target="_blank">打开逐帧观察记录 ↗</a>`;
  $('#research .research-grid').before(el);
  const zoom=document.createElement('button');zoom.id='frame-detail';zoom.className='frame-detail';zoom.textContent='查看整屏';zoom.setAttribute('aria-pressed','true');el.querySelector('.frame-inspector-heading').append(zoom);
  const native=document.createElement('a');native.id='frame-native';native.target='_blank';native.textContent='打开原尺寸图片 ↗';el.append(native);
  let detail=true;
  let selected='control-enter',position=0,group=index.filter(x=>x.segment===selected);
  function show(){const f=group[position];$('#frame-image').src=detail?'../analysis/inner-motion/'+f.image.replace('frame-','detail-'):'../analysis/frame-by-frame/'+f.image;native.href='../analysis/inner-motion/'+f.image.replace('frame-','native-');$('#frame-number').textContent=`原帧 #${String(f.source_frame).padStart(4,'0')}　${f.pts.toFixed(3)} s${detail?'　原分辨率局部':''}`;$('#frame-range').max=group.length-1;$('#frame-range').value=position;$('#frame-position').value=`${position+1} / ${group.length}`;$('#frame-prev').disabled=position===0;$('#frame-next').disabled=position===group.length-1;$('#frame-observation').textContent=notes[selected];}
  zoom.onclick=()=>{detail=!detail;zoom.textContent=detail?'查看整屏':'放大图标';zoom.setAttribute('aria-pressed',String(detail));show();};
  $('#frame-segment').onchange=e=>{selected=e.target.value;group=index.filter(x=>x.segment===selected);position=0;show();};
  $('#frame-prev').onclick=()=>{position=Math.max(0,position-1);show();};$('#frame-next').onclick=()=>{position=Math.min(group.length-1,position+1);show();};$('#frame-range').oninput=e=>{position=Number(e.target.value);show();};
  show();
}
initFrameInspector().catch(()=>{});
