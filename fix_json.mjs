import fs from 'fs';

const pJsonStr = fs.readFileSync('tienda/theme/templates/product.estrella.json', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const iJsonStr = fs.readFileSync('tienda/theme/templates/index.json', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const pJson = JSON.parse(pJsonStr);
const iJson = JSON.parse(iJsonStr);

const sections = {
  "hero": { "type": "landing-hero", "settings": {} },
  "incluye": { "type": "landing-incluye", "settings": {} },
  "pasos": { "type": "landing-pasos", "settings": {} },
  "garantia": { "type": "landing-garantia", "settings": {} },
  "faq": { "type": "landing-faq", "settings": {} },
  "cierre": { "type": "landing-cierre", "settings": {} },
  "sticky": { "type": "landing-sticky", "settings": {} }
};

const iSections = {
  "hero": { "type": "landing-hero", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "incluye": { "type": "landing-incluye", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "pasos": { "type": "landing-pasos", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "garantia": { "type": "landing-garantia", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "faq": { "type": "landing-faq", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "cierre": { "type": "landing-cierre", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } },
  "sticky": { "type": "landing-sticky", "settings": { "main_product": "taladro-24v-dewalt-accesorios-maleta" } }
};

const order = ["hero", "incluye", "pasos", "garantia", "faq", "cierre", "sticky"];

pJson.sections = sections;
pJson.order = order;

iJson.sections = iSections;
iJson.order = order;

fs.writeFileSync('tienda/theme/templates/product.estrella.json', JSON.stringify(pJson, null, 2));
fs.writeFileSync('tienda/theme/templates/index.json', JSON.stringify(iJson, null, 2));

// Delete old landing-estrella.liquid
if (fs.existsSync('tienda/theme/sections/landing-estrella.liquid')) {
  fs.unlinkSync('tienda/theme/sections/landing-estrella.liquid');
}
