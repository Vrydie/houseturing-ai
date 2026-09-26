const fs = require('fs');
const content = fs.readFileSync('templates/index.json', 'utf8');
const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
const indexJson = JSON.parse(cleanContent);

indexJson.sections = {
  "landing_content": {
    "type": "landing-estrella",
    "settings": {
      "main_product": "taladro-24v-dewalt-accesorios-maleta"
    }
  }
};
indexJson.order = ["landing_content"];

fs.writeFileSync('templates/index.json', JSON.stringify(indexJson, null, 2));
