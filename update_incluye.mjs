import fs from 'fs';

let html = fs.readFileSync('tienda/theme/sections/landing-incluye.liquid', 'utf-8');

// Replace the img tag with the video asset
// From:
//    {% if selected_product.images[1] %}
//      <img src="{{ selected_product.images[1] | image_url: width: 800 }}" style="width: 100%; max-width: 600px; border-radius: 8px;" alt="Qué incluye">
//    {% endif %}
// To:
//    <video src="{{ 'video_taladro.mp4' | asset_url }}" autoplay loop muted playsinline style="width: 100%; max-width: 600px; border-radius: 8px;"></video>

html = html.replace(
  /{% if selected_product.images\[1\] %}[\s\S]*?{% endif %}/,
  `<video src="{{ 'video_taladro.mp4' | asset_url }}" autoplay loop muted playsinline style="width: 100%; max-width: 600px; border-radius: 8px;"></video>`
);

fs.writeFileSync('tienda/theme/sections/landing-incluye.liquid', html);
