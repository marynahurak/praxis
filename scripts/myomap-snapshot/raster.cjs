const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BUILD = process.env.MYOMAP_BUILD || path.join(__dirname, 'build');
const B = JSON.parse(fs.readFileSync(path.join(BUILD, 'ras/base.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2.4 });
  for (const [id, svg] of Object.entries(B)) {
    await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    await p.waitForTimeout(150);
    await p.locator('svg').screenshot({ path: path.join(BUILD, `ras/${id}.jpg`), type: 'jpeg', quality: 88 });
  }
  await b.close();
})();
