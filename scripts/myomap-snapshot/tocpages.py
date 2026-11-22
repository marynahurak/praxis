# Номери сторінок для змісту: з закладок PDF першого проходу (Chromium створює їх із заголовків).
import json, sys, re
from pypdf import PdfReader

pdf, toc_json, out = sys.argv[1:4]
r = PdfReader(pdf)
items = []
def walk(o):
    for it in o:
        if isinstance(it, list):
            walk(it)
        else:
            items.append((re.sub(r'\s+', ' ', it.title).strip(), r.get_destination_page_number(it) + 1))
walk(r.outline)
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
pages = {}
for id_, num, title, lvl in json.load(open(toc_json)):
    hit = next((p for t, p in items if norm(t).endswith(norm(title))), None)
    if hit is None:
        sys.exit(f'no outline entry for {title!r}')
    pages[id_] = hit
json.dump(pages, open(out, 'w'))
print('toc pages', pages)
