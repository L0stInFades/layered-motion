"""Independent similarity registration of visible control-center features.
Reports the best gradient-NCC match, not a claim about native animation internals.
"""
import json,csv
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import gaussian_filter
from scipy.signal import fftconvolve
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'analysis/inner-motion'
ix=json.loads((OUT/'index.json').read_text());paths={r['source_frame']:OUT/r['native'] for r in ix}
def frame(n):return Image.open(paths[n]).resize((1182,836),Image.Resampling.LANCZOS)
ref=frame(128)
features={
 'wifi-glyph':(703,161,747,200),'wifi-title':(754,161,841,181),
 'music-play':(772,389,800,424),'music-cast':(839,262,871,289),
 'sun':(926,380,972,425),'volume':(1035,382,1080,423),
 'device-1':(723,489,751,538),'device-2':(823,486,858,543),
 'device-3':(927,487,963,543),'device-5':(717,582,757,623),
 'device-7':(924,581,965,623),'device-8':(1027,591,1070,616),
 'quick-1':(713,692,748,737),'quick-2':(819,691,859,738),
 'quick-1-shell':(686,670,774,758),
 'quick-3':(926,691,968,739),'quick-4':(1042,691,1072,739),
 'quick-5':(711,802,749,836),'quick-6':(817,805,860,836),
 'quick-7':(928,803,968,836),'quick-8':(1038,803,1077,836),
}
def grads(im):
 a=np.asarray(im,dtype=np.float32).mean(axis=2)/255
 return np.gradient(gaussian_filter(a,.5))
def match(im,box,base,exiting):
 cx=(box[0]+box[2])/2;cy=(box[1]+box[3])/2
 px=1102+(cx-1102)*base;py=136+(cy-136)*base
 if exiting:py-=40;px-=10
 roi=(max(650,int(px-85)),max(80,int(py-105)),min(1182,int(px+85)),min(836,int(py+105)))
 rg=grads(im.crop(roi));energy=sum(g*g for g in rg)
 best=(-1,None)
 for sc in np.arange(max(.48,base-.19),min(1.09,base+.19),.01):
  tmp=ref.crop(box).resize((max(5,round((box[2]-box[0])*sc)),max(5,round((box[3]-box[1])*sc))),Image.Resampling.BICUBIC)
  tg=grads(tmp);den=fftconvolve(energy,np.ones(tg[0].shape),mode='valid')*sum((t*t).sum() for t in tg)
  dot=sum(fftconvolve(r,t[::-1,::-1],mode='valid') for r,t in zip(rg,tg))
  score=dot/np.sqrt(np.maximum(den,1e-10));j=np.unravel_index(score.argmax(),score.shape)
  if score[j]>best[0]:best=(float(score[j]),(roi[0]+j[1]+tmp.width/2,roi[1]+j[0]+tmp.height/2,round(float(sc),3)))
 return best
rows=[]
chosen=[90,92,94,96,98,100,102,104,106,110,114,118,122,126,128,135,136,137,138,139,140,141,142]
for n in chosen:
 r=next(r for r in ix if r['source_frame']==n);t=r['pts'];im=frame(n)
 base=np.interp(t,[1.011,1.056,1.101,1.145,1.189,1.25,1.49,1.60],[.69,.78,.86,.93,.97,1,1,.72])
 for name,box in features.items():
  score,(x,y,sc)=match(im,box,base,n>=135)
  rows.append(dict(frame=n,pts=t,feature=name,x=x,y=y,scale=sc,score=round(score,4)))
 print(n,t,{r['feature']:[r['x'],r['y'],r['scale'],r['score']] for r in rows if r['frame']==n and r['feature'] in ['wifi-glyph','sun','device-2','quick-1','quick-2','quick-3','quick-4']},flush=True)
with (OUT/'control-tracks.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
# Local-normalized Wi-Fi and media show whether glyphs move inside their shells.
sel=[90,94,98,102,106,110,114,118]
sheet=Image.new('RGB',(4*420,2*370),'#101815');d=ImageDraw.Draw(sheet)
for i,n in enumerate(sel):
 a=frame(n);rr={r['feature']:r for r in rows if r['frame']==n};r=rr['wifi-glyph'];sc=r['scale']
 x=r['x']-(725-684)*sc;y=r['y']-(180.5-136)*sc
 box=(round(x-5*sc),round(y-4*sc),round(x+207*sc),round(y+313*sc))
 tile=a.crop(box).resize((212,317));px=i%4*420;py=i//4*370
 sheet.paste(tile.resize((212,317)),(px,py));d.text((px+5,py+330),f"{n} / {next(r['pts'] for r in ix if r['source_frame']==n):.3f}s",fill='white')
sheet.save(OUT/'control-local.jpg',quality=95)
