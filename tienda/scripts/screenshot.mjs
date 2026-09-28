import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config({ path: 'infra/.env' });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://zp1wvd-02.myshopify.com/products/taladro-24v-dewalt-accesorios-maleta?preview_theme_id=157512106102&pb=0', { waitUntil: 'networkidle2' });
  
  if (await page.$('#Password')) {
    await page.evaluate(() => document.querySelector('dialog').showModal());
    await page.type('#Password', process.env.SHOPIFY_STOREFRONT_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('.password-dialog__submit-button')
    ]);
  }
  
  await page.goto('https://zp1wvd-02.myshopify.com/products/taladro-24v-dewalt-accesorios-maleta?preview_theme_id=157512106102&pb=0', { waitUntil: 'networkidle2' });

  // SCROLL TO BOTTOM TO TRIGGER LAZY LOAD
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 1000));

  // FORCE HIDE STICKY BAR FOR ALL ELEMENT SCREENSHOTS
  await page.evaluate(() => {
    const s = document.querySelector('#sticky-bar');
    if (s) s.style.display = 'none';
  });

  await page.setViewport({ width: 1440, height: 900 });
  await page.screenshot({ path: 'tienda/qa/1440px_completa.png', fullPage: true });

  await page.setViewport({ width: 390, height: 844 });
  
  const ids = [
    { idSelector: '[id$="__announcement"]', name: '01_anuncio' },
    { idSelector: '[id$="__hero"]', name: '02_hero' },
    { idSelector: '[id$="__trust"]', name: '03_confianza' },
    { idSelector: '[id$="__video"]', name: '04_video' },
    { idSelector: '[id$="__incluye"]', name: '05_incluye' },
    { idSelector: '[id$="__modes"]', name: '06_modos' },
    { idSelector: '[id$="__compare"]', name: '07_comparar' },
    { idSelector: '[id$="__garantia"]', name: '08_garantia' },
    { idSelector: '[id$="__faq"]', name: '09_preguntas' },
    { idSelector: '[id$="__cierre"]', name: '10_cierre' }
  ];

  const h = await page.$('.header-wrapper');
  if (h) {
    try { await h.screenshot({ path: `tienda/qa/390px_00_header.png` }); } catch(e){}
  }

  for (const s of ids) {
    const el = await page.$(s.idSelector);
    if (el) {
      try {
        await el.screenshot({ path: `tienda/qa/390px_${s.name}.png` });
      } catch(e) {
        console.log("Failed " + s.name + ": " + e.message);
      }
    }
  }

  const f = await page.$('.footer');
  if(f) {
    try { await f.screenshot({ path: `tienda/qa/390px_11_footer.png` }); } catch(e){}
  }

  // FORCE SHOW STICKY BAR, HIDE HERO BUTTON
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const s = document.querySelector('#sticky-bar');
    if (s) {
      s.style.display = 'flex';
      s.style.transform = 'translateY(0)';
    }
    const hb = document.querySelector('#hero-btn');
    if (hb) hb.style.display = 'none';
  });
  
  await new Promise(r => setTimeout(r, 1000));
  // Take screenshot of the viewport
  await page.screenshot({ path: `tienda/qa/390px_12_sticky_bar.png` });

  await browser.close();
  console.log("Screenshots done!");
})();
