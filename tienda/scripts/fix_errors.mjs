import fs from 'fs';

// Fix settings_schema.json duplicated whatsapp_number
let schemaPath = 'tienda/theme/config/settings_schema.json';
let schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
// Filter out the duplicated whatsapp block (keep only the first one)
let seenWhatsApp = false;
let newSchema = schema.filter(section => {
  if (section.name === "WhatsApp") {
    if (seenWhatsApp) return false;
    seenWhatsApp = true;
  }
  return true;
});
fs.writeFileSync(schemaPath, JSON.stringify(newSchema, null, 2));

// Fix font handle
let dataPath = 'tienda/theme/config/settings_data.json';
let data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
// If Barlow_n4 is invalid, let's use standard lowercase font handles or standard Shopify font names.
// "barlow_n4" and "barlow_condensed_n8". Or maybe just remove them and let the user pick in the visual editor.
// Claude specifically said: "poner Barlow y Barlow Condensed en los ajustes del tema, no solo con !important desde theme.liquid."
// Shopify fonts handles typically look like: "barlow_n4" or "shopify_sans_n4"
data.current.type_header_font = "barlow_condensed_n8";
data.current.type_body_font = "barlow_n4";
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
