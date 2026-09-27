"""Copy the requested noon recordings, preserve duplicates and verify both ends."""
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import argparse
import re

parser = argparse.ArgumentParser(description='Import date-matched recordings into a new archive.')
parser.add_argument('--date', required=True, help='YYYY-MM-DD')
parser.add_argument('--serial', help='Optional adb device serial')
parser.add_argument('--output', type=Path, required=True, help='New destination directory')
args = parser.parse_args()
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.date): parser.error('Invalid date')
ROOT = args.output.resolve()
if ROOT.exists(): parser.error('--output must be a new directory')
adb = ['adb'] + (['-s', args.serial] if args.serial else [])
search = subprocess.run(adb + ['shell',
    'find /sdcard/DCIM /sdcard/Movies /sdcard/Pictures /sdcard/Download '
    f'-type f -iname "Screenrecorder*{args.date}*" 2>/dev/null'
], capture_output=True, text=True)
files = sorted(p for p in search.stdout.splitlines() if p.endswith('.mp4'))
if not files: raise SystemExit('No recordings found; check adb connection and date.')
(ROOT / 'analysis').mkdir(parents=True)
(ROOT / 'analysis/phone-inventory.txt').write_text('\n'.join(files) + '\n')
manifest = []
for src in files:
    rel = src.removeprefix('/sdcard/')
    dst = ROOT / 'originals' / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(adb + ['pull', '-a', src, str(dst)], check=True)
    sha = hashlib.sha256(dst.read_bytes()).hexdigest()
    remote = subprocess.check_output(adb + [
        'shell', 'sha256sum ' + shlex.quote(src)
    ], text=True).split()[0]
    probe_result = subprocess.run([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(dst)
    ], capture_output=True, text=True)
    probe = json.loads(probe_result.stdout or '{}')
    if 'format' in probe: probe['format']['filename'] = str(dst.relative_to(ROOT))
    row = dict(phone_path=src, local_path=str(dst.relative_to(ROOT)), bytes=dst.stat().st_size,
               sha256=sha, phone_sha256=remote, verified=sha == remote, probe=probe,
               playable=probe_result.returncode == 0, probe_error=probe_result.stderr.strip().replace(str(ROOT) + '/', ''))
    manifest.append(row)
    (ROOT / 'analysis/source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(json.dumps({k: v for k, v in row.items() if k != 'probe'}, ensure_ascii=False), flush=True)
    if sha != remote:
        raise RuntimeError('Checksum mismatch: ' + src)
print('Copied', len(manifest), 'files; unique', len({x['sha256'] for x in manifest}))
