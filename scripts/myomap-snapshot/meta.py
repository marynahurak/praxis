# Метадані PDF (Title, Author, Subject, Keywords) без зміни вмісту; закладки й теги зберігаються.
import sys, json, os
from pypdf import PdfReader, PdfWriter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import T, DOI, VERSION

src, lang, dst = sys.argv[1:4]
t = T[lang]
w = PdfWriter(clone_from=PdfReader(src))
w.add_metadata({
    '/Title': t['title_meta'],
    '/Author': 'Maryna Hurak (ORCID 0009-0008-7275-8079)' if lang == 'en' else 'Марина Гурак (ORCID 0009-0008-7275-8079)',
    '/Subject': f'{t["kicker"]} · doi:{DOI}',
    '/Keywords': t['kw'],
    '/Creator': 'Praxis',
})
w.page_mode = '/UseOutlines'
import os
os.makedirs(os.path.dirname(dst), exist_ok=True)
with open(dst, 'wb') as f:
    w.write(f)
print('wrote', dst)
