import fs from 'fs';

function parseJSON(str) {
  return JSON.parse(str.replace(/\/\*[\s\S]*?\*\//g, ''));
}

let schemaPath = 'tienda/theme/config/settings_schema.json';
let schema = parseJSON(fs.readFileSync(schemaPath, 'utf-8'));
schema.push({
  name: "WhatsApp",
  settings: [
    {
      type: "text",
      id: "whatsapp_number",
      label: "Número de WhatsApp",
      default: "573000000000"
    }
  ]
});
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

let dataPath = 'tienda/theme/config/settings_data.json';
let dataStr = fs.readFileSync(dataPath, 'utf-8');
// To keep comments if we want, we can just replace the JSON part, but Shopify doesn't strictly need comments.
let data = parseJSON(dataStr);
if (!data.current) data.current = {};
data.current.whatsapp_number = "573160944561";
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log("WhatsApp settings updated.");
