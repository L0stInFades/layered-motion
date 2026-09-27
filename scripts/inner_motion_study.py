"""Native-resolution evidence for foreground motion, keeping original frame PTS."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'analysis/inner-motion'
OUT.mkdir(exist_ok=True)
index = json.loads((ROOT / 'analysis/frame-by-frame/index.json').read_text())
source = ROOT / 'originals/Bluetooth/Screenrecorder-2026-09-27-12-47-35-6.mp4'
if not (OUT / 'native-0147.jpg').exists():
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-threads','2','-i',str(source),'-vf',r'select=between(n\,80\,132)+between(n\,134\,156)+between(n\,339\,409)','-fps_mode','passthrough','-q:v','1','-y',str(OUT/'native-%04d.jpg')],check=True)
for i, row in enumerate(index):
    row['native'] = f'native-{i+1:04d}.jpg'
    box=(1360,256,2220,1672) if row['segment'].startswith('control') else (0,156,1030,1672)
    Image.open(OUT/row['native']).crop(box).save(OUT/f'detail-{i+1:04d}.jpg',quality=94)
(OUT / 'index.json').write_text(json.dumps(index,indent=2))

def sheet(name, segment, frames, box, size, cols=4):
    selected=[r for r in index if r['segment']==segment and r['source_frame'] in frames]
    w,h=size; canvas=Image.new('RGB',(cols*w,((len(selected)+cols-1)//cols)*(h+24)+28),'#141a16')
    d=ImageDraw.Draw(canvas);d.text((8,8),name,fill='#b9f6cd')
    for i,r in enumerate(selected):
        im=Image.open(OUT/r['native']).crop(tuple(v*2 for v in box)).resize(size)
        x=i%cols*w;y=i//cols*(h+24)+28
        canvas.paste(im,(x,y));d.text((x+5,y+h+5),f"#{r['source_frame']} | {r['pts']:.3f} s",fill='white')
    canvas.save(OUT/(name+'.jpg'),quality=96)

sheet('assistant-arrival','assistant-enter',range(345,374,2),(0,80,510,835),(510,755),4)
sheet('control-arrival','control-enter',range(88,118,2),(680,130,1110,835),(430,705),4)
sheet('assistant-departure','assistant-exit',range(380,401,2),(0,80,510,835),(510,755),4)
sheet('control-departure','control-exit',range(135,150),(680,130,1110,835),(430,705),5)
print(f'{len(index)} native frames and four detailed sheets: {OUT}')

for name,times,box in [('compare-control',[1.056,1.145,1.233,1.556],(680,128,1110,835)),('compare-assistant',[3.889,3.935,3.98,4.024],(0,78,510,835))]:
    if not all((OUT/f'browser-{t}.png').exists() for t in times):continue
    w,h=box[2]-box[0],box[3]-box[1]
    canvas=Image.new('RGB',(w*4,(h+25)*2),'#101815');draw=ImageDraw.Draw(canvas)
    for i,t in enumerate(times):
        row=min(index,key=lambda r:abs(r['pts']-t))
        source=Image.open(OUT/row['native']).resize((1182,836)).crop(box)
        replica=Image.open(OUT/f'browser-{t}.png').crop(box)
        for j,im in enumerate([source,replica]):
            x=i*w;y=j*(h+25);canvas.paste(im,(x,y))
            draw.text((x+5,y+h+4),f'{"SOURCE" if j==0 else "DOM"} {t:.3f}s',fill='white')
    canvas.save(OUT/f'{name}.jpg',quality=95)
