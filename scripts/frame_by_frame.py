"""Export EVERY native frame in the requested floating-panel transitions."""
import csv,json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analysis/frame-by-frame';OUT.mkdir(exist_ok=True)
rows=list(csv.DictReader((ROOT/'analysis/Screenrecorder-2026-09-27-12-47-35-6/motion.csv').open()))
segments=[('control-enter',.9,1.479),('control-exit',1.501,1.744),('assistant-enter',3.779,4.223),('assistant-exit',4.234,4.557)]
groups=[]
for name,start,end in segments:
    chosen=[r for r in rows if start-1e-7<=float(r['pts'])<=end+1e-7]
    groups.append((name,chosen))
selection='+'.join(f'between(n,{group[0]["frame"]},{group[-1]["frame"]})' for _,group in groups)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-threads','2','-i',str(ROOT/'originals/Bluetooth/Screenrecorder-2026-09-27-12-47-35-6.mp4'),'-vf',f'select={selection.replace(",",chr(92)+",")},scale=1182:836','-fps_mode','passthrough','-q:v','2','-y',str(OUT/'frame-%04d.jpg')],check=True)
files=sorted(OUT.glob('frame-*.jpg'))
assert len(files)==sum(len(g) for _,g in groups),(len(files),sum(len(g) for _,g in groups))
index=[];offset=0
for name,group in groups:
    subset=files[offset:offset+len(group)];offset+=len(group)
    for r,p in zip(group,subset):index.append(dict(segment=name,source_frame=int(r['frame']),pts=float(r['pts']),image=p.name))
    for start in range(0,len(group),28):
        cols=7;cellw=210;cellh=322 if name.startswith('control') else 173
        pairs=list(zip(group[start:start+28],subset[start:start+28]));numrows=(len(pairs)+cols-1)//cols
        sheet=Image.new('RGB',(cols*cellw,numrows*cellh+38),'#101714');draw=ImageDraw.Draw(sheet)
        draw.text((10,10),f'{name} / consecutive source frames / part {start//28+1}',fill='#b9f6cd')
        for i,(row,file) in enumerate(pairs):
            im=Image.open(file)
            if name.startswith('control'):im=im.crop((600,0,1182,836)).resize((207,297))
            else:im=im.resize((207,146))
            x=i%cols*cellw;y=i//cols*cellh+38;sheet.paste(im,(x,y))
            draw.text((x+4,y+im.height+4),f'#{int(row["frame"]):04d}  {float(row["pts"]):.3f}s',fill='#d5e5dc')
        sheet.save(OUT/f'{name}-{start//28+1}.jpg',quality=94)
    print(name,len(group),'consecutive frames',group[0]['pts'],group[-1]['pts'],flush=True)
(OUT/'index.json').write_text(json.dumps(index,indent=2))
