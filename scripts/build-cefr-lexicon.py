"""Build the bundled lexical index; runtime classification never uses the network.
Sources pinned to Open Language Profiles revision d4e45b75b38f27b30dfc5c44d8c571aec7e7092f.
Usage: python scripts/build-cefr-lexicon.py [--source-dir PATH]
See lib/cefr/data/README.md for attribution and data licenses.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request

revision = 'd4e45b75b38f27b30dfc5c44d8c571aec7e7092f'
sources = {
    'cefrj-vocabulary-profile-1.5.csv': 'e89799a7f91a8ae5540e722874edf9158ef8685b',
    'octanove-vocabulary-profile-c1c2-1.0.csv': '3a0505e98c9a6ef92be32466e43de4b7f14683d0',
}
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path)
args = parser.parse_args()
words, phrases = {}, {}
for filename, sha in sources.items():
    if args.source_dir:
        data = (args.source_dir / filename).read_bytes()
    else:
        url = f'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/{revision}/{filename}'
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read()
        if hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() != sha:
            raise ValueError('Upstream content does not match pinned Git blob')
    for row in csv.DictReader(io.StringIO(data.decode('utf-8-sig'))):
        level = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6}.get(row['CEFR'].strip())
        if not level:
            continue
        for headword in row['headword'].lower().split('/'):
            headword = re.sub(r'\s+', ' ', headword.strip().replace('’', "'"))
            if not re.fullmatch(r"[a-z]+(?:[ '-][a-z]+)*", headword):
                continue
            target = phrases if ' ' in headword else words
            target[headword] = min(target.get(headword, 6), level)
result = {'words': dict(sorted(words.items())), 'phrases': dict(sorted(phrases.items()))}
root = Path(__file__).resolve().parent.parent
(root / 'lib/cefr/data/vocabulary.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Built lexical profile: {len(words)} words and {len(phrases)} phrases.')
