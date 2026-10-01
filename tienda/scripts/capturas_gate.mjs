// Capturas del gate de diseño (C6): 390 px por sección, barra fija y 1440 px de página completa.
// Uso (desde la raíz): node --env-file=infra/.env tienda/scripts/capturas_gate.mjs [ruta]
import puppeteer from 'puppeteer';
import fs from 'fs';

const dominio = process.env.SHOPIFY_STORE_DOMAIN;
const tema = fs.readFileSync('tienda/theme/THEME_ID', 'utf8').trim();
const ruta = process.argv[2] || '/products/taladro-24v-dewalt-accesorios-maleta';
const url = `https://${dominio}${ruta}?preview_theme_id=${tema}&pb=0`;
const salida = 'tienda/qa';

const launchOptions = { headless: 'new', userDataDir: '.cache/capturas-perfil' };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
const nav = await puppeteer.launch(launchOptions);
const p = await nav.newPage();
await p.goto(`https://${dominio}/password`, { waitUntil: 'networkidle2' });
if (await p.$('#Password')) {
  await Promise.all([
    p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    p.evaluate((clave) => { const i = document.querySelector('#Password'); i.value = clave; i.form.submit(); }, process.env.SHOPIFY_STOREFRONT_PASSWORD),
  ]);
}

const cargar = async (ancho) => {
  await p.setViewport({ width: ancho, height: 844 });
  await p.goto(url, { waitUntil: 'networkidle2' });
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} #preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}' });
  await p.evaluate(() => document.fonts.ready);
  if (await p.$('input[type=password]')) throw new Error('Sigue en la página de contraseña');
};

for (const f of fs.readdirSync(salida)) if (/^(390|1440)px_.*\.png$/.test(f)) fs.unlinkSync(`${salida}/${f}`);

await cargar(390);
const secciones = await p.$$('[id^="shopify-section-"]');
await p.addStyleTag({ content: '#sticky-bar{visibility:hidden!important}' });
let i = 0;
for (const s of secciones) {
  const id = await s.evaluate(e => e.id.split('__').pop());
  const caja = await s.boundingBox();
  if (!caja || caja.height < 2) continue;
  await s.screenshot({ path: `${salida}/390px_${String(++i).padStart(2, '0')}_${id}.png` });
}
// Barra fija: con el botón del hero fuera de pantalla.
await p.addStyleTag({ content: '#sticky-bar{visibility:visible!important}' });
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
await new Promise(r => setTimeout(r, 800));
await p.screenshot({ path: `${salida}/390px_barra_fija_en_pantalla.png` });

await cargar(1440);
const alto = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, ...[...document.querySelectorAll('main, #MainContent, .page-wrapper')].map(e => e.scrollHeight)));
await p.setViewport({ width: 1440, height: alto });
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `${salida}/1440px_completa.png` });
await nav.close();
console.log('capturas listas en', salida);
