const fs = require('fs');
const productJson = JSON.parse(fs.readFileSync('templates/product.json', 'utf8'));

productJson.sections.landing_content = {
  "type": "landing-estrella",
  "settings": {}
};

productJson.order.push("landing_content");

fs.writeFileSync('templates/product.estrella.json', JSON.stringify(productJson, null, 2));
