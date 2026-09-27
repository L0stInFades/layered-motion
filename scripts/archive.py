"""Package, restore and verify the untouched source recordings. Python 3.11+."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'analysis/source-manifest.json'
CATALOG = ROOT / 'archive/catalog.json'
BUNDLE = 'source-recordings-2026-09-27.tar.gz'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['pack', 'restore', 'verify'])
parser.add_argument('--bundle', type=Path, help='Downloaded bundle for restore')
args = parser.parse_args()
rows = json.loads(MANIFEST.read_text())

def digest(path):
    with path.open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()

def verify():
    for row in rows:
        path = ROOT / row['local_path']
        if not path.is_file(): raise SystemExit('Missing: ' + row['local_path'])
        if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
            raise SystemExit('Checksum mismatch: ' + row['local_path'])
    print(f'Verified {len(rows)} original files; {sum(r["bytes"] for r in rows):,} bytes.')

if args.action == 'restore':
    bundle = args.bundle or ROOT / 'dist' / BUNDLE
    catalog = json.loads(CATALOG.read_text())
    if digest(bundle) != catalog['bundle']['sha256']: raise SystemExit('Bundle checksum mismatch')
    allowed = {r['local_path']: r for r in rows}
    with tempfile.TemporaryDirectory(prefix='layered-motion-') as temporary:
        temp = Path(temporary)
        with tarfile.open(bundle, 'r:gz') as source:
            found = set()
            for member in source:
                if member.name not in allowed: continue
                if not member.isfile() or member.name in found: raise SystemExit('Invalid archive member')
                row = allowed[member.name]
                if member.size != row['bytes']: raise SystemExit('Invalid member size')
                dst = temp / member.name
                dst.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(member) as incoming, dst.open('wb') as output:
                    shutil.copyfileobj(incoming, output)
                if digest(dst) != row['sha256']: raise SystemExit('Invalid member hash')
                found.add(member.name)
        if found != set(allowed): raise SystemExit('Incomplete original archive')
        for name, row in allowed.items():
            dst = ROOT / name
            if dst.exists() and digest(dst) != row['sha256']:
                raise SystemExit('Will not overwrite a different existing file: ' + name)
        for name in allowed:
            dst = ROOT / name
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists(): shutil.copyfile(temp / name, dst)
    verify()
elif args.action == 'verify':
    verify()
else:
    verify()
    (ROOT / 'dist').mkdir(exist_ok=True)
    path = ROOT / 'dist' / BUNDLE
    names = sorted([r['local_path'] for r in rows] + ['analysis/source-manifest.json', 'MEDIA_NOTICE.md'])
    # Stable metadata; no local uid, username, absolute path or gzip timestamp.
    with path.open('wb') as output, gzip.GzipFile(filename='', mode='wb', fileobj=output, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name in names:
                data = (ROOT / name).read_bytes()
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o644
                info.mtime = 0
                archive.addfile(info, io.BytesIO(data))
    sha = digest(path)
    (ROOT / 'dist/SHA256SUMS').write_text(f'{sha}  {BUNDLE}\n')
    catalog = {
        'version': '0.1.0', 'captureDate': '2026-09-27',
        'release': 'https://github.com/L0stInFades/layered-motion/releases/tag/v0.1.0',
        'bundle': {'filename': BUNDLE, 'bytes': path.stat().st_size, 'sha256': sha,
            'url': 'https://github.com/L0stInFades/layered-motion/releases/download/v0.1.0/' + BUNDLE},
        'originals': [{'path': r['local_path'], 'bytes': r['bytes'], 'sha256': r['sha256'], 'playable': r['playable']} for r in rows],
        'evidence': {'totalSourceFrames': 2409, 'continuousDetailedFrames': 147,
            'frameIndex': '../analysis/frame-by-frame/index.json', 'nativeIndex': '../analysis/inner-motion/index.json',
            'sourceManifest': '../analysis/source-manifest.json', 'inventory': 'evidence-sha256.json'},
        'audioReview': {'method': 'ffmpeg volumedetect', 'meanAndPeakDb': -91.0, 'scope': 'all three valid original audio tracks'},
    }
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(path.name, path.stat().st_size, sha)
