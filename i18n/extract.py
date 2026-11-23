"""Extract every translatable Chinese text segment (text-node level) from index.html and src/*.js.
Template placeholders ${...} become {0},{1},... Output: i18n/keys.json (ordered, unique)."""
import re, glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
CJK = re.compile(r'[㐀-鿿]')
keys = []
seen = set()
def add(seg):
    seg = re.sub(r'\s+', ' ', seg).strip()
    seg = seg.replace('&nbsp;', ' ')
    if not CJK.search(seg) or seg in seen: return
    seen.add(seg); keys.append(seg)
LIT = re.compile(r"'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|\"((?:[^\"\\\n]|\\.)*)\"")
def scan(code):
    for m in LIT.finditer(code):
        t = next(g for g in m.groups() if g is not None)
        if CJK.search(t): segments(t)
def split_template(t):
    # replace ${...} (balanced braces) with {n}; string literals inside the expression are extracted too
    out, n, i = '', 0, 0
    while i < len(t):
        if t.startswith('${', i):
            d, j = 1, i + 2
            while j < len(t) and d:
                d += {'{': 1, '}': -1}.get(t[j], 0); j += 1
            scan(t[i + 2:j - 1])
            out += '{%d}' % n; n += 1; i = j
        else: out += t[i]; i += 1
    return out
def segments(t):
    t = split_template(t)
    # placeholders that sit at tag boundaries are fine; split on HTML tags
    for part in re.split(r'<[^>]*>', t):
        # renumber placeholders inside this segment from 0
        k = [0]
        def rn(m): r = '{%d}' % k[0]; k[0] += 1; return r
        add(re.sub(r'\{\d+\}', rn, part))
for f in ['src/data.js', 'src/ui.js', 'src/battle.js', 'src/online.js', 'src/shop.js', 'src/store.js', 'src/scene.js', 'src/audio.js']:
    s = open(os.path.join(ROOT, f)).read()
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S); s = re.sub(r'(?m)^\s*//.*$', '', s); s = re.sub(r'(?m)\s//\s.*$', '', s)
    scan(s)
h = open(os.path.join(ROOT, 'index.html')).read()
h = re.sub(r'<script.*?</script>', '', h, flags=re.S); h = re.sub(r'<style.*?</style>', '', h, flags=re.S)
for t in re.findall(r'>([^<>]+)<', h): add(t)
for t in re.findall(r'(?:placeholder|title|aria-label)="([^"]*)"', h): add(t)
json.dump(keys, open(os.path.join(HERE, 'keys.json'), 'w'), ensure_ascii=False, indent=0)
print(len(keys), 'keys', sum(len(k) for k in keys), 'chars')
