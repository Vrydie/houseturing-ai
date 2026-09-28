import fs from 'fs';

// Clean header
let header = JSON.parse(fs.readFileSync('tienda/theme/sections/header-group.json', 'utf-8'));
if (header.sections.header && header.sections.header.settings) {
  header.sections.header.settings.show_line_separator = false;
  header.sections.header.settings.color_scheme = "background-1";
  // Assuming there's a way to hide icons, but we might just replace it with an empty header.
  // Actually, to fully remove cart and account in standard Dawn/Horizon:
  header.sections.header.settings.show_icons = false; 
}
fs.writeFileSync('tienda/theme/sections/header-group.json', JSON.stringify(header, null, 2));

// Clean footer
let footer = JSON.parse(fs.readFileSync('tienda/theme/sections/footer-group.json', 'utf-8'));
if (footer.sections.footer && footer.sections.footer.settings) {
  footer.sections.footer.settings.show_social = false;
  footer.sections.footer.settings.show_payment_icons = false;
  footer.sections.footer.settings.show_policy = false;
  footer.sections.footer.settings.show_language_selector = false;
  footer.sections.footer.settings.show_country_selector = false;
}
fs.writeFileSync('tienda/theme/sections/footer-group.json', JSON.stringify(footer, null, 2));

// Set fonts in settings_data.json
function parseJSON(str) { return JSON.parse(str.replace(/\/\*[\s\S]*?\*\//g, '')); }
let settings = parseJSON(fs.readFileSync('tienda/theme/config/settings_data.json', 'utf-8'));
settings.current.type_header_font = "Barlow Condensed_n8";
settings.current.type_body_font = "Barlow_n4";
fs.writeFileSync('tienda/theme/config/settings_data.json', JSON.stringify(settings, null, 2));

console.log("R7 fixed.");
