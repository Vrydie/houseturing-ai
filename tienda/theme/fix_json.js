const fs = require('fs');
const content = fs.readFileSync('templates/product.json', 'utf8');
// remove comments like /* ... */
const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
const productJson = JSON.parse(cleanContent);

productJson.sections.landing_content = {
  "type": "landing-estrella",
  "settings": {}
};

productJson.order.push("landing_content");

fs.writeFileSync('templates/product.estrella.json', JSON.stringify(productJson, null, 2));
