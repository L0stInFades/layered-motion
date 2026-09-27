"""Fit visible window edges and an effective Gaussian background blur.

These fits describe rendered pixels, not the source OS's private implementation.
"""
import csv
import json
from pathlib import Path
import subprocess
import numpy as np
from scipy.optimize import least_squares, minimize
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analysis'
rows=list(csv.DictReader((OUT/'Screenrecorder-2026-09-27-12-47-35-6/motion.csv').open()))
results=[]
for name,start,end,icon_width,guess in [('notes-open',5.88,6.33,39,5.85),('browser-open',8.93,9.4,39,8.89),('store-open',12.68,13.15,39,12.64)]:
    subset=[r for r in rows if start<=float(r['pts'])<=end]
    ts=np.array([float(r['pts']) for r in subset]); widths=np.array([float(r['white_w']) for r in subset])
    # White mask excludes two pixels of anti-aliased border at either screen edge.
    terminal=587
    def model(params):
        onset,omega=params
        t=np.maximum(0,ts-onset)
        p=1-np.exp(-omega*t)*(1+omega*t)
        return icon_width+(terminal-icon_width)*p
    fit=least_squares(lambda x:model(x)-widths,[guess,22],bounds=([guess-.08,5],[guess+.035,70]))
    pred=model(fit.x); omega=float(fit.x[1]); onset=float(fit.x[0])
    result=dict(transition=name,observed_range=[start,end],samples=len(subset),
                fit='critical damped step, zero initial velocity, window width only',
                onset_s=round(onset,5),omega_rad_s=round(omega,4),
                stiffness_mass_1=round(omega**2,2),damping_mass_1=round(2*omega,2),
                rmse_analysis_px=round(float(np.sqrt(np.mean((pred-widths)**2))),3),
                rmse_original_px=round(float(4*np.sqrt(np.mean((pred-widths)**2))),3),
                time_to_95_ms=round(4.74386/omega*1000,1),
                observations=[dict(t=float(t),width=float(w),fit=float(p)) for t,w,p in zip(ts,widths,pred)])
    results.append(result)
    print({k:v for k,v in result.items() if k!='observations'},flush=True)

src=ROOT/'originals/Bluetooth/Screenrecorder-2026-09-27-12-47-35-6.mp4'
def frame(t):
    raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(src),'-frames:v','1','-vf','scale=591:418','-f','rawvideo','-pix_fmt','rgb24','-'])
    return np.frombuffer(raw,dtype=np.uint8).reshape(418,591,3).astype(float).mean(axis=2)
home=frame(0)
yy,xx=np.mgrid[35:360:2,30:310:2]
blur_results=[]
for time in [.944,1.011,1.079,1.211,1.412]:
    target=frame(time)[35:360:2,30:310:2]
    def evaluate(params,details=False):
        sigma,scale,tx,ty=params
        blurry=gaussian_filter(home,sigma=sigma)
        coords=[(yy-209-ty)/scale+209,(xx-295.5-tx)/scale+295.5]
        sample=map_coordinates(blurry,coords,order=1,mode='nearest')
        design=np.stack([sample.ravel(),np.ones(sample.size)],axis=1)
        gain,offset=np.linalg.lstsq(design,target.ravel(),rcond=None)[0]
        pred=gain*sample+offset
        error=float(np.mean((pred-target)**2))
        return (error,float(gain),float(offset)) if details else error
    fit=minimize(evaluate,[10,1,0,0],bounds=[(.3,30),(.85,1.12),(-20,20),(-20,20)],method='L-BFGS-B',options={'maxiter':65})
    error,gain,offset=evaluate(fit.x,True)
    result=dict(source_s=time,sigma_analysis_px=round(float(fit.x[0]),3),
                sigma_at_1182_css_px=round(float(fit.x[0])*2,3),scale=round(float(fit.x[1]),4),
                translation_analysis_px=[round(float(x),3) for x in fit.x[2:]],
                gain=round(gain,4),offset=round(offset,3),rmse_gray_0_255=round(error**.5,3),
                optimizer_converged=bool(fit.success))
    blur_results.append(result);print(result,flush=True)
report={'window_fits':results,'blur_fits':blur_results,
        'limitations':['White-region segmentation can miss dark edges and UI content; widths are measured at 591×418 then scaled.',
                       'Critical damping is a compact empirical approximation, not proof of the native engine.',
                       'Gaussian blur + uniform scale + affine grayscale brightness approximates a multistage color renderer.',
                       'Recorded frames do not expose touch events; inferred onset is model-dependent.']}
(OUT/'calibration-regenerated.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

# A self-contained SVG plotting artifact, generated from measured values.
colors=['#b9f6cd','#8fbbff','#ffb987']
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="490" viewBox="0 0 1000 490"><rect width="1000" height="490" fill="#0e1711"/><g font-family="Arial,sans-serif" fill="#b5cbbb"><text x="55" y="42" font-size="22">Window expansion: observed vs. critically damped fit</text><text x="55" y="70" font-size="12" fill="#6c8b76">Source 12:47 / actual frame PTS / width normalized from icon to fullscreen</text>']
for tick in range(6):
    x=70+tick/5*840
    svg.append(f'<path d="M{x} 100V410" stroke="#203728"/><text x="{x-12}" y="435" font-size="11">{tick*100} ms</text>')
for tick in range(5):
    y=410-tick/4*295
    svg.append(f'<path d="M70 {y}H910" stroke="#203728"/><text x="31" y="{y+4}" font-size="11">{tick*25}%</text>')
for j,r in enumerate(results):
    pts=[]
    for obs in r['observations']:
        x=70+(obs['t']-r['onset_s'])/.5*840;y=410-(obs['fit']-39)/(587-39)*295
        pts.append(f'{x:.2f},{y:.2f}')
        ym=410-(obs['width']-39)/(587-39)*295
        svg.append(f'<circle cx="{x:.2f}" cy="{ym:.2f}" r="2.7" fill="{colors[j]}" opacity=".7"/>')
    svg.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{colors[j]}" stroke-width="1.5"/>')
    svg.append(f'<text x="{90+j*295}" y="470" fill="{colors[j]}" font-size="12">{r["transition"]}: 95% in {r["time_to_95_ms"]} ms</text>')
svg.append('</g></svg>');(OUT/'window-fit.svg').write_text(''.join(svg))
