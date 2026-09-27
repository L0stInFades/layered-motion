"""Fit independent render-layer entry paths to tracked source landmarks.
All fits are empirical approximations, not recovered native spring parameters.
"""
import csv,json
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'analysis/inner-motion'
rows=list(csv.DictReader((OUT/'control-tracks.csv').open()))
rs={int(r['frame']):{} for r in rows}
for r in rows:rs[int(r['frame'])][r['feature']]={k:float(r[k]) for k in ['pts','x','y','scale','score']}
groups={
 'wifi':([784,181],['wifi-glyph','wifi-title']),
 'music':([784,346],['music-play','music-cast']),
 'brightness':([947.5,346],['sun']),
 'volume':([1057.5,346],['volume']),
 'devices':([893,557],['device-1','device-2','device-3','device-5','device-7','device-8']),
 **{f'quick-{i}':([730+(i-1)%4*109,715+(i-1)//4*109],[f'quick-{i}-shell' if i==1 else f'quick-{i}']) for i in range(1,9)}
}
def decay(t,k,c):
 a=c/2;w=np.sqrt(abs(k-a*a)+1e-8)
 if k>a*a:return np.exp(-a*t)*(np.cos(w*t)+a/w*np.sin(w*t))
 return .5*((1+a/w)*np.exp((-a+w)*t)+(1-a/w)*np.exp((-a-w)*t))
out={}
for name,(center,features) in groups.items():
 samples=[];center=np.array(center)
 for n,data in rs.items():
  if n>=135:continue
  # Correlation below .7 is not reliable; blue active glyphs are especially faint.
  fs=[f for f in features if data[f]['score']>(.42 if name=='wifi' else .7)]
  if not fs:continue
  a=np.array([[rs[128][f]['x'],rs[128][f]['y']] for f in fs]);b=np.array([[data[f]['x'],data[f]['y']] for f in fs])
  if len(fs)>1:
   ac=a-a.mean(axis=0);bc=b-b.mean(axis=0);sc=(ac*bc).sum()/(ac*ac).sum()
  else:sc=data[fs[0]]['scale']/rs[128][fs[0]]['scale']
  delta=b.mean(axis=0)-a.mean(axis=0)*sc+center*(sc-1)
  samples.append([data[fs[0]]['pts']-.898,delta[0],delta[1],sc-1])
 arr=np.array(samples);axes={}
 for i,key in enumerate(['x','y','scale']):
  target=arr[:,i+1];t=arr[:,0]
  fits=[]
  for k,d in [(260,32),(400,35),(180,22)]:
   initial=target[0]/decay(t[0],k,d);initial=np.clip(initial,-790,990)
   bounds=([-1000,50,6],[1200,2200,150]) if key!='scale' else ([-.95,50,6],[-.05,2200,150])
   if key=='scale':initial=float(np.clip(initial,-.9,-.1))
   f=least_squares(lambda v:v[0]*decay(t,v[1],v[2])-target,[initial,k,d],bounds=bounds)
   fits.append(f)
  f=min(fits,key=lambda f:(f.fun*f.fun).sum())
  axes[key]=dict(start=round(float(f.x[0]+(1 if key=='scale' else 0)),4),k=round(float(f.x[1]),3),d=round(float(f.x[2]),3),rmse=round(float(np.sqrt(np.mean(f.fun**2))),3))
 out[name]=dict(center=center.tolist(),axes=axes,samples=len(samples))
(OUT/'control-fit.json').write_text(json.dumps(out,indent=2))
assistant={}
assistant_rows=list(csv.DictReader((OUT/'assistant-tracks.csv').open()))
for name in ['plus','parcel-search','shortcut-4-glyph','photo-3','bottom-app-3']:
 r=[r for r in assistant_rows if 3.78<float(r['pts'])<4.201 and float(r[name+'_score'])>.8]
 t=np.array([float(r['pts'])-3.769 for r in r]);observed=np.array([float(r[name+'_dx']) for r in r])
 f=least_squares(lambda v:-550*decay(np.maximum(0,t-v[2]),v[0],v[1])-observed,[900,60,.02],bounds=([300,20,0],[3000,150,.10]))
 assistant[name]=dict(k=float(f.x[0]),d=float(f.x[1]),delay=float(f.x[2]),rmse=float(np.sqrt(np.mean(f.fun**2))))
 r=[r for r in assistant_rows if float(r['pts'])>4.226 and float(r[name+'_score'])>.8]
 t=np.array([float(r['pts'])-4.226 for r in r]);observed=np.array([float(r[name+'_dx']) for r in r])
 def exit_residual(v):
  u=np.maximum(0,t-v[1]);w=v[0]
  return -1182*(1-(1+w*u)*np.exp(-w*u))-observed
 f=least_squares(exit_residual,[8,.005],bounds=([2,0],[20,.05]))
 assistant[name]['exit']=dict(k=float(f.x[0]**2),d=float(f.x[0]*2),delay=float(f.x[1]),rmse=float(np.sqrt(np.mean(f.fun**2))))
(OUT/'assistant-fit.json').write_text(json.dumps(assistant,indent=2))
(ROOT/'web/foreground-data.js').write_text('// Empirical source-frame fits. See analysis/inner-motion for landmarks and residuals.\nexport const controlFits = '+json.dumps(out,ensure_ascii=False,indent=2)+';\nexport const assistantFits = '+json.dumps(assistant,indent=2)+';\n')
for name,v in out.items():print(name,v['axes'])
