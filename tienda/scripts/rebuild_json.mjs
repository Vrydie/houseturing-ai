import fs from 'fs';
let json = JSON.parse(fs.readFileSync('tienda/theme/templates/product.estrella.json', 'utf-8'));
json.sections = {
  "announcement": { "type": "landing-announcement" },
  "hero": { "type": "landing-hero" },
  "trust": { "type": "landing-trust" },
  "video": { "type": "landing-video" },
  "modes": { "type": "landing-modes" },
  "compare": { "type": "landing-compare" },
  "incluye": { "type": "landing-incluye" },
  "garantia": { "type": "landing-garantia" },
  "faq": { "type": "landing-faq" },
  "cierre": { "type": "landing-cierre" },
  "sticky": { "type": "landing-sticky" }
};
json.order = [
  "announcement", "hero", "trust", "video", "modes", "compare", "incluye", "garantia", "faq", "cierre", "sticky"
];
fs.writeFileSync('tienda/theme/templates/product.estrella.json', JSON.stringify(json, null, 2));
console.log("JSON template updated!");
