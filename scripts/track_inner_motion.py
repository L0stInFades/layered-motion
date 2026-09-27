"""Track visible features independently; all reported coordinates are 1182px CSS units.

Horizontal normalized gradient correlation uses fixed source rows for negative-one.
It distinguishes row-wise translation from apparent sequencing caused by clipping.
Control-center geometry is registered separately using each tile's visible contour.
"""
import json, csv
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import gaussian_filter

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'analysis/inner-motion'
ix=json.loads((OUT/'index.json').read_text())
paths={r['source_frame']:OUT/r['native'] for r in ix}
def frame(n):return np.asarray(Image.open(paths[n]),dtype=np.float32)/255
ref=frame(377)
# Tight feature crops exclude glass; contour crops explicitly measure the backing.
features={
 'search-glyph':(95,100,123,131), 'search-text':(133,99,180,134),
 'plus':(458,101,485,133), 'parcel-title':(93,204,241,233),
 'parcel-search':(418,205,444,230), 'parcel-icon':(101,263,130,293),
 'parcel-text':(144,253,259,279),
 'shortcut-1-glyph':(96,434,142,480), 'shortcut-2-glyph':(208,434,255,480),
 'shortcut-3-glyph':(326,435,371,480), 'shortcut-4-glyph':(438,435,484,480),
 'photo-title':(90,547,306,575), 'photo-1':(97,595,207,680),
 'photo-2':(234,595,341,680),'photo-3':(366,595,477,680),
 'bottom-today':(93,783,160,808),'bottom-app-1':(297,779,341,819),
 'bottom-app-2':(365,779,407,819),'bottom-app-3':(434,779,474,819),
}

def gradient(a):
    # Suppress codec noise and use high-frequency structure, not changing backdrop.
    g=gaussian_filter(a.mean(axis=2),.65)
    return np.gradient(g,axis=1),np.gradient(g,axis=0)

def track(box, a):
    x0,y0,x1,y1=[int(v*2) for v in box]
    tg=gradient(ref[y0:y1,x0:x1]); rg=gradient(a[y0:y1,:min(1120,x1+44)])
    dot=sum(np.sum([np.correlate(rr,tt,mode='valid') for rr,tt in zip(r,t)],axis=0) for r,t in zip(rg,tg))
    energy=sum(np.convolve((r*r).sum(axis=0),np.ones(x1-x0),mode='valid') for r in rg)
    score=dot/np.sqrt(energy*sum((t*t).sum() for t in tg)+1e-12)
    j=int(np.argmax(score));dx=(j-x0)/2
    return round(dx,2),round(float(score[j]),4)

rows=[]
for r in ix:
    if not r['segment'].startswith('assistant'):continue
    a=frame(r['source_frame']); row={'frame':r['source_frame'],'pts':r['pts']}
    for name,box in features.items():
        dx,score=track(box,a);row[name+'_dx']=dx;row[name+'_score']=score
    # Flat central area of the parcel backing gives a clean right boundary.
    strip=a[550:630].mean(axis=0);white=np.flatnonzero(strip.min(axis=1)>.65)
    row['parcel-shell_dx']=(int(white[-1])+1)/2-503 if len(white) else None
    rows.append(row)
with (OUT/'assistant-tracks.csv').open('w') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

chosen=[349,353,357,361,365,369,373,377,384,387,390]
keys=['plus','parcel-title','parcel-search','shortcut-1-glyph','shortcut-2-glyph','shortcut-3-glyph','shortcut-4-glyph','photo-title','photo-1','photo-2','photo-3','bottom-app-1','bottom-app-2','bottom-app-3']
for r in rows:
    if r['frame'] not in chosen:continue
    print(r['frame'],r['pts'],'parcel-shell',r['parcel-shell_dx'],{k:r[k+'_dx'] if r[k+'_score']>.73 else '--' for k in keys})

# Card-local crops make differential movement visible at native resolution.
for names,filename,ylim in [(['shortcut-1-glyph','shortcut-2-glyph','shortcut-3-glyph','shortcut-4-glyph'],'shortcut-local',(413,504)),(['parcel-title','parcel-icon','parcel-text'],'parcel-local',(187,384))]:
    selected=[r for r in rows if 353<=r['frame']<=375 and (r['frame']-353)%2==0]
    cw,ch=425,ylim[1]-ylim[0];im=Image.new('RGB',(cw*4,(ch+26)*3),'#141a16');d=ImageDraw.Draw(im)
    for i,r in enumerate(selected):
        # Anchor every row to parcel backing, not to the feature being tested.
        dx=r['parcel-shell_dx'];a=Image.open(OUT/next(p['native'] for p in ix if p['source_frame']==r['frame']))
        box=(round((78+dx)*2),ylim[0]*2,round((503+dx)*2),ylim[1]*2)
        crop=a.crop(box).resize((cw,ch));x=i%4*cw;y=i//4*(ch+26);im.paste(crop,(x,y));d.text((x+5,y+ch+5),f"{r['pts']:.3f} s | anchored to parcel shell",fill='white')
    im.save(OUT/(filename+'.jpg'),quality=95)
