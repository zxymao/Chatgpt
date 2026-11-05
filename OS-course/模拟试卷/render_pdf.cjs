// Use the runtime-provided Playwright and Chromium; no website dependencies.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    for (const [stem, kind] of [['操作系统模拟试卷A-试卷', '试卷'], ['操作系统模拟试卷A-参考答案', '参考答案']]) {
      const page = await browser.newPage();
      await page.route('**/*', route => route.abort());
      await page.setContent(fs.readFileSync(path.join(__dirname, stem+'.html'), 'utf8'), {waitUntil: 'load'});
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({media: 'print'});
      const heights = await page.locator('.page').evaluateAll(pages => pages.map(p => Math.round(p.getBoundingClientRect().height)));
      const maxHeight = (297-16-17)*96/25.4;
      if (heights.some(h => h > maxHeight)) throw Error(`${stem}: overflowing page heights: ${heights}`);
      await page.pdf({path: path.join(__dirname, stem+'.pdf'), format:'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate:'<span></span>', footerTemplate:`<div style="width:100%;font-family:sans-serif;font-size:9px;text-align:center;color:black">操作系统模拟试卷 A · ${kind}　|　第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</div>`});
      console.log(`${stem}: content heights=${heights.join(',')} px; limit=${maxHeight.toFixed(0)} px`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exit(1);});
