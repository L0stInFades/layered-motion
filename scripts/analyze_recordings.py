"""Decode original presentation timestamps; measure motion; create annotated evidence sheets.

Run with python scripts/analyze_recordings.py (see requirements.txt).
No FPS conversion: each CSV row corresponds to an actual decoded source frame.
"""
import csv
import json
from pathlib import Path
import subprocess
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'analysis'
W, H = 591, 418
manifest = json.loads((OUT / 'source-manifest.json').read_text())
summary = []
for recording in manifest:
    if not recording['playable']:
        continue
    src = ROOT / recording['local_path']
    dest = OUT / src.stem
    dest.mkdir(exist_ok=True)
    metadata = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_frames',
        '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(src)
    ]))
    timestamps = [float(f['best_effort_timestamp_time']) for f in metadata['frames']]
    proc = subprocess.Popen([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-threads', '2', '-i', str(src),
        '-vf', f'scale={W}:{H}', '-fps_mode', 'passthrough',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ], stdout=subprocess.PIPE)
    rows, thumbs = [], []
    last = None
    next_thumb = 0
    for i, pts in enumerate(timestamps):
        raw = proc.stdout.read(W * H * 3)
        if len(raw) != W * H * 3:
            raise RuntimeError(f'Incomplete decode at {i}')
        rgb = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
        gray = rgb.astype(np.float32).mean(axis=2)
        # The clock/widget area is outside control-center cards. Its edge energy
        # is a blur/scale proxy, NOT an absolute Gaussian sigma estimate.
        roi = gray[25:305, 40:280]
        energy = float(np.mean(np.diff(roi, axis=0)**2) + np.mean(np.diff(roi, axis=1)**2))
        delta = float(np.abs(gray - last).mean()) if last is not None else 0.0
        mask = (rgb.min(axis=2) > 202) & (np.ptp(rgb, axis=2) < 58)
        labels, _ = ndimage.label(ndimage.binary_closing(mask, iterations=2))
        counts = np.bincount(labels.ravel()); counts[0] = 0
        label = int(counts.argmax())
        ys, xs = np.where(labels == label)
        row = dict(frame=i, pts=pts, edge_energy=round(energy, 5),
                   frame_difference=round(delta, 5), white_fraction=round(float(mask.mean()), 6),
                   largest_white_fraction=round(float(counts[label] / (W * H)), 6),
                   white_x=int(xs.min()) if len(xs) else 0, white_y=int(ys.min()) if len(ys) else 0,
                   white_w=int(xs.max()-xs.min()+1) if len(xs) else 0,
                   white_h=int(ys.max()-ys.min()+1) if len(ys) else 0)
        rows.append(row)
        if pts >= next_thumb:
            im = Image.fromarray(rgb).resize((236, 167))
            thumbs.append((pts, im))
            next_thumb += .25
        last = gray
    proc.stdout.close()
    if proc.wait() != 0:
        raise RuntimeError('ffmpeg failed')
    with (dest/'motion.csv').open('w') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
    for n in range(0, len(thumbs), 32):
        sheet = Image.new('RGB', (8 * 240, 4 * 192), '#15181d')
        draw = ImageDraw.Draw(sheet)
        for j, (pts, im) in enumerate(thumbs[n:n+32]):
            x, y = j % 8 * 240, j // 8 * 192
            sheet.paste(im, (x, y))
            draw.text((x+6, y+170), f'{pts:06.3f}s', fill='#c7d7e0')
        sheet.save(dest/f'timeline-{n//32+1}.jpg', quality=92)
    intervals = np.diff(timestamps)
    result = dict(file=src.name, frames=len(rows), first_pts=timestamps[0], last_pts=timestamps[-1],
                  median_frame_ms=round(float(np.median(intervals)*1000), 3),
                  min_frame_ms=round(float(intervals.min()*1000), 3),
                  max_frame_ms=round(float(intervals.max()*1000), 3),
                  measured_mean_fps=round((len(rows)-1)/(timestamps[-1]-timestamps[0]), 3),
                  measurement_resolution=[W,H])
    summary.append(result)
    (OUT/'timing-summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(result), flush=True)
