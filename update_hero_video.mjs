import fs from 'fs';

let hero = fs.readFileSync('tienda/theme/sections/landing-hero.liquid', 'utf-8');

// Replace the hero-image div with a media player
const newImageBlock = `
    <div class="hero-image">
      {% assign first_video = selected_product.media | where: "media_type", "video" | first %}
      {% assign first_external_video = selected_product.media | where: "media_type", "external_video" | first %}
      
      {% if selected_product.metafields.landing.video != blank %}
        <video src="{{ selected_product.metafields.landing.video.value.url }}" autoplay loop muted playsinline style="width: 100%; border-radius: 8px;"></video>
      {% elsif first_video %}
        {{ first_video | video_tag: autoplay: true, loop: true, muted: true, controls: false, image_size: "800x", style: "width: 100%; border-radius: 8px;" }}
      {% elsif first_external_video %}
        {{ first_external_video | external_video_tag: autoplay: true, loop: true, muted: true, style: "width: 100%; border-radius: 8px; aspect-ratio: 16/9;" }}
      {% elsif selected_product.images[0] %}
        <img src="{{ selected_product.images[0] | image_url: width: 800 }}" style="width: 100%; border-radius: 8px;" alt="Portada">
      {% endif %}
    </div>
`;

hero = hero.replace(/<div class="hero-image">[\s\S]*?<\/div>/, newImageBlock.trim());

fs.writeFileSync('tienda/theme/sections/landing-hero.liquid', hero);
