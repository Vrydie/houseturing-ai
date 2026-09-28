import fs from 'fs';
let html = fs.readFileSync('tienda/theme/sections/landing-incluye.liquid', 'utf-8');
html = html.replace(
  /<video src="{{ 'video_taladro\.mp4' \| asset_url }}"[\s\S]*?<\/video>/,
  `{% assign video = selected_product.media | where: "media_type", "video" | first %}{% if video %}{{ video | video_tag: autoplay: true, loop: true, muted: true, controls: false, style: "width: 100%; max-width: 600px; border-radius: 8px;" }}{% endif %}`
);
fs.writeFileSync('tienda/theme/sections/landing-incluye.liquid', html);
