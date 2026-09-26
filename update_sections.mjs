import fs from 'fs';

const btnSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"></path></svg>`;

const globalCss = `
<style>
@keyframes latido {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0.7); }
  5% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(37,211,102,0); }
  10% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0); }
  15% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(37,211,102,0); }
  20% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0); }
}
@keyframes sello {
  0% { transform: scale(2) rotate(-15deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.btn-whatsapp {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--color-whatsapp); color: var(--color-whatsapp-text);
  font-family: var(--font-titulos); font-size: 20px; font-weight: 800;
  text-decoration: none; padding: 16px 32px; border-radius: 8px;
  width: 100%; max-width: 400px; margin: 16px auto; text-transform: none;
  transition: transform 0.2s;
}

@media (prefers-reduced-motion: no-preference) {
  .btn-whatsapp.is-visible-btn {
    animation: latido 6s infinite;
  }
}

.btn-whatsapp:hover, .btn-whatsapp:focus {
  animation-play-state: paused;
}

.anim-sello {
  display: inline-block;
}
@media (prefers-reduced-motion: no-preference) {
  .anim-sello {
    animation: sello 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
}
</style>
`;

const hero = `
{% assign selected_product = section.settings.main_product | default: product %}
${globalCss}
<div style="background: var(--color-grafito); color: var(--color-gris-claro); padding: 40px 20px;">
  <div class="hero-container">
    <div class="hero-text">
      {% if selected_product.metafields.landing.hook %}
        <h1 style="color: var(--color-naranja); font-weight: 800; font-size: 40px; margin-bottom: 16px; text-transform: uppercase;">
          {{ selected_product.metafields.landing.hook.value }}
        </h1>
      {% endif %}
      {% if selected_product.metafields.landing.subtitulo %}
        <p style="font-size: 18px; margin-bottom: 24px;">{{ selected_product.metafields.landing.subtitulo.value }}</p>
      {% endif %}
      
      <div class="price anim-sello" style="font-family: var(--font-titulos); font-size: 48px; font-weight: 800; margin-bottom: 16px; color: var(--color-naranja);">
        {{ selected_product.price | money }}
      </div>

      <a id="hero-btn" href="https://wa.me/573000000000?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="btn-whatsapp is-visible-btn">
        ${btnSvg} Pedir por WhatsApp
      </a>
    </div>
    
    <div class="hero-image">
      {% if selected_product.images[0] %}
        <img src="{{ selected_product.images[0] | image_url: width: 800 }}" style="width: 100%; border-radius: 8px;" alt="Portada">
      {% endif %}
    </div>
  </div>
</div>

<style>
.hero-container {
  max-width: 1200px; margin: 0 auto;
  text-align: center;
}
.hero-image {
  margin-top: 24px;
}
@media (min-width: 1024px) {
  .hero-container {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
    text-align: left;
  }
  .hero-text { order: 1; }
  .hero-image { order: 2; margin-top: 0; }
  .btn-whatsapp { margin: 16px 0; }
}
</style>

<script>
document.addEventListener("DOMContentLoaded", function() {
  const heroBtn = document.getElementById('hero-btn');
  const stickyBar = document.getElementById('sticky-bar');
  const stickyBtn = document.getElementById('sticky-btn');
  
  if (heroBtn && stickyBar) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Hero button is visible
          stickyBar.style.transform = 'translateY(100%)';
          heroBtn.classList.add('is-visible-btn');
          stickyBtn.classList.remove('is-visible-btn');
        } else {
          // Hero button is hidden
          stickyBar.style.transform = 'translateY(0)';
          heroBtn.classList.remove('is-visible-btn');
          stickyBtn.classList.add('is-visible-btn');
        }
      });
    }, { threshold: 0 });
    
    observer.observe(heroBtn);
  }
});
</script>
{% schema %}
{ "name": "Landing Hero", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Hero" }] }
{% endschema %}
`;

const incluye = `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-gris-claro); color: var(--color-grafito); padding: 40px 20px;">
  <h2 style="font-weight: 800; font-size: 32px; text-align: center; margin-bottom: 24px; text-transform: uppercase;">¿Qué incluye?</h2>
  
  <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 24px;">
    {% if selected_product.images[1] %}
      <img src="{{ selected_product.images[1] | image_url: width: 800 }}" style="width: 100%; max-width: 600px; border-radius: 8px;" alt="Qué incluye">
    {% endif %}
    
    <ul style="max-width: 400px; list-style: none; padding: 0;">
    {% for item in selected_product.metafields.landing.beneficios.value %}
      <li style="display: flex; gap: 12px; margin-bottom: 12px; font-size: 18px; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-naranja); flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
        {{ item }}
      </li>
    {% endfor %}
    </ul>
  </div>
</div>
{% schema %}
{ "name": "Landing Incluye", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Incluye" }] }
{% endschema %}
`;

const pasos = `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-grafito); color: var(--color-gris-claro); padding: 40px 20px;">
  <h2 style="font-weight: 800; font-size: 32px; text-align: center; margin-bottom: 24px; text-transform: uppercase; color: var(--color-naranja);">Cómo pedir</h2>
  <div style="max-width: 400px; margin: 0 auto;">
    {% for paso in selected_product.metafields.landing.como_funciona.value %}
      <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--color-naranja); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--color-naranja); flex-shrink: 0;">{{ forloop.index }}</div>
        <p style="font-size: 18px; margin: 0; align-self: center;">{{ paso }}</p>
      </div>
    {% endfor %}
  </div>
  <div style="text-align: center; margin-top: 32px;">
    <a href="https://wa.me/573000000000?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="btn-whatsapp">
      ${btnSvg} Pedir por WhatsApp
    </a>
  </div>
</div>
{% schema %}
{ "name": "Landing Pasos", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Pasos" }] }
{% endschema %}
`;

const garantia = `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-gris-claro); color: var(--color-grafito); padding: 40px 20px;">
  <div style="border: 2px solid var(--color-linea); padding: 32px 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; text-align: center;">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
    <h2 style="font-weight: 800; font-size: 28px; margin-bottom: 16px; text-transform: uppercase;">Garantía</h2>
    <p style="font-size: 18px; line-height: 1.5;">{{ selected_product.metafields.landing.garantia.value }}</p>
  </div>
</div>
{% schema %}
{ "name": "Landing Garantia", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Garantia" }] }
{% endschema %}
`;

const faq = `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-grafito); color: var(--color-gris-claro); padding: 40px 20px;">
  <h2 style="font-weight: 800; font-size: 32px; text-align: center; margin-bottom: 32px; text-transform: uppercase; color: var(--color-naranja);">Preguntas frecuentes</h2>
  <div style="max-width: 600px; margin: 0 auto;">
    {% for faq in selected_product.metafields.landing.faq.value %}
      <details style="margin-bottom: 16px; border-bottom: 1px solid var(--color-linea); padding-bottom: 16px;">
        <summary style="font-weight: 700; font-size: 18px; cursor: pointer; list-style: none; display: flex; justify-content: space-between;">
          {{ faq.pregunta }}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <p style="margin-top: 12px; font-size: 16px; color: #ccc;">{{ faq.respuesta }}</p>
      </details>
    {% endfor %}
  </div>
</div>
{% schema %}
{ "name": "Landing FAQ", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing FAQ" }] }
{% endschema %}
`;

const cierre = `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-acero); color: var(--color-gris-claro); padding: 60px 20px; text-align: center;">
  {% if selected_product.images[2] %}
    <img src="{{ selected_product.images[2] | image_url: width: 800 }}" style="width: 100%; max-width: 600px; border-radius: 8px; margin-bottom: 32px;" alt="Cierre">
  {% endif %}
  <h2 style="font-weight: 800; font-size: 36px; margin-bottom: 16px; text-transform: uppercase; color: var(--color-naranja);">¿Listo para trabajar?</h2>
  <div style="font-family: var(--font-titulos); font-size: 40px; font-weight: 800; margin-bottom: 24px;">
    {{ selected_product.price | money }}
  </div>
  <a href="https://wa.me/573000000000?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="btn-whatsapp">
    ${btnSvg} Pedir por WhatsApp
  </a>
</div>
{% schema %}
{ "name": "Landing Cierre", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Cierre" }] }
{% endschema %}
`;

const sticky = `
{% assign selected_product = section.settings.main_product | default: product %}
<div id="sticky-bar" class="landing-sticky" style="transform: translateY(100%);">
  <div class="sticky-price" style="color: var(--color-naranja);">{{ selected_product.price | money }}</div>
  <a id="sticky-btn" href="https://wa.me/573000000000?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="sticky-btn">
    ${btnSvg} Pedir por WhatsApp
  </a>
</div>
<style>
.landing-sticky {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--color-acero); padding: 12px 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.2); z-index: 999;
  transition: transform 0.3s ease-in-out;
}
@media (min-width: 768px) {
  .landing-sticky { display: none !important; }
}
.sticky-price {
  font-family: var(--font-titulos); font-size: 24px; font-weight: 800;
}
.sticky-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--color-whatsapp); color: var(--color-whatsapp-text);
  font-family: var(--font-titulos); font-size: 18px; font-weight: 800;
  text-decoration: none; padding: 12px 24px; border-radius: 8px; flex: 1;
}
</style>
{% schema %}
{ "name": "Landing Sticky", "settings": [{ "type": "product", "id": "main_product", "label": "Producto Estrella" }], "presets": [{ "name": "Landing Sticky" }] }
{% endschema %}
`;

fs.writeFileSync('tienda/theme/sections/landing-hero.liquid', hero);
fs.writeFileSync('tienda/theme/sections/landing-incluye.liquid', incluye);
fs.writeFileSync('tienda/theme/sections/landing-pasos.liquid', pasos);
fs.writeFileSync('tienda/theme/sections/landing-garantia.liquid', garantia);
fs.writeFileSync('tienda/theme/sections/landing-faq.liquid', faq);
fs.writeFileSync('tienda/theme/sections/landing-cierre.liquid', cierre);
fs.writeFileSync('tienda/theme/sections/landing-sticky.liquid', sticky);
