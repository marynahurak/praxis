#!/bin/bash
# PDF-зріз атласу для Zenodo (технічна записка, UA + EN) з даних сайту.
# Потрібно: Python 3 (pypdf, Pillow), Node + playwright (Chromium), qpdf, шрифти з node_modules/@fontsource.
# Запуск: MYOMAP_DOI=10.5281/zenodo.NNNNNNN scripts/myomap-snapshot/make.sh [uk en]
# DOI — зарезервований у чернетці Zenodo DOI цієї версії. Результат: scripts/myomap-snapshot/build/out/.
set -e
cd "$(dirname "$0")"
: "${MYOMAP_DOI:?set MYOMAP_DOI to the reserved version DOI}"
export MYOMAP_BUILD="${MYOMAP_BUILD:-$PWD/build}"
mkdir -p "$MYOMAP_BUILD/ras" "$MYOMAP_BUILD/out"
node dump_ui.cjs
python3 -c "
from figs import base_svg, D, BUILD
import json
lv_of={v['id']:lv for lv,L in D['levels'].items() for v in L['views']}
json.dump({vid:base_svg(vid,lv) for vid,lv in lv_of.items()}, open(f'{BUILD}/ras/base.json','w'))"
node raster.cjs
VER=$(python3 -c "from figs import D;print(D['meta']['version'])")
for L in ${@:-uk en}; do
  python3 build.py $L
  node print.cjs $L "$MYOMAP_BUILD/pass1-$L.pdf"
  python3 tocpages.py "$MYOMAP_BUILD/pass1-$L.pdf" "$MYOMAP_BUILD/toc-$L.json" "$MYOMAP_BUILD/pages-$L.json"
  python3 build.py $L "$MYOMAP_BUILD/pages-$L.json"
  node print.cjs $L "$MYOMAP_BUILD/raw-$L.pdf"
  OUTF="$MYOMAP_BUILD/out/Hurak_2026_myosite-atlas_v${VER}_${L}.pdf"
  python3 meta.py "$MYOMAP_BUILD/raw-$L.pdf" $L "$OUTF"
  qpdf --object-streams=generate --compression-level=9 --recompress-flate "$OUTF" "$OUTF.tmp" && mv "$OUTF.tmp" "$OUTF"
done
ls -la "$MYOMAP_BUILD/out/"
