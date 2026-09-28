import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://zp1wvd-02.myshopify.com?preview_theme_id=157512106102', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'tienda/qa/test.png' });
  await browser.close();
})();
