import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://zp1wvd-02.myshopify.com?preview_theme_id=157512106102', { waitUntil: 'networkidle2' });
  const title = await page.title();
  console.log("TITLE:", title);
  await browser.close();
})();
