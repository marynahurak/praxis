// Друк atlas-{lang}.html у PDF (Chromium, CSS-поля сторінки, закладки, теги доступності).
const { chromium } = require('playwright'); const path = require('path');
const BUILD = process.env.MYOMAP_BUILD || path.join(__dirname, 'build');
const [, , lang, out] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(`file://${path.join(BUILD, `atlas-${lang}.html`)}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.pdf({ path: out, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
  await b.close();
})();
