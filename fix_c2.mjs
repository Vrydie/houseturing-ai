import fs from 'fs';

// 1. Clean header-group.json
let hgText = fs.readFileSync('tienda/theme/sections/header-group.json', 'utf8');
const hgClean = hgText.replace(/\/\*[\s\S]*?\*\//g, '');
const hg = JSON.parse(hgClean);

hg.order = ["header_section"]; // Remove header_announcements_9jGBFp
hg.sections.header_section.settings.show_search = false;
delete hg.sections.header_announcements_9jGBFp;

fs.writeFileSync('tienda/theme/sections/header-group.json', JSON.stringify(hg, null, 2));

// 2. Clean footer-group.json
let fgText = fs.readFileSync('tienda/theme/sections/footer-group.json', 'utf8');
const fgClean = fgText.replace(/\/\*[\s\S]*?\*\//g, '');
const fg = JSON.parse(fgClean);

// Remove the email signup and welcome block
delete fg.sections.footer_m9NzUG;
fg.order = ["footer_utilities_jLGE8U"];

// Remove social links and powered by
if (fg.sections.footer_utilities_jLGE8U) {
  const blocks = fg.sections.footer_utilities_jLGE8U.blocks;
  delete blocks.social_links_Ew63Kq;
  if (blocks.footer_copyright_jweRK8) {
    blocks.footer_copyright_jweRK8.settings.show_powered_by = false;
  }
  fg.sections.footer_utilities_jLGE8U.block_order = [
    "footer_copyright_jweRK8",
    "footer_policy_list_VCdnpa"
  ];
}

fs.writeFileSync('tienda/theme/sections/footer-group.json', JSON.stringify(fg, null, 2));
