import fs from 'fs';
import path from 'path';

const sectionsDir = 'tienda/theme/sections';

// Helpers
function writeSection(name, content) {
  fs.writeFileSync(path.join(sectionsDir, `${name}.liquid`), content.trim());
}

// 1. ANNOUNCEMENT BAR
writeSection('landing-announcement', `
<div style="background: var(--color-naranja, #F2661B); color: white; text-align: center; padding: 8px; font-size: 14px; font-weight: bold; font-family: var(--font-body);">
  🔥 OFERTA POR TIEMPO LIMITADO: ENVÍO GRATIS A TODO COLOMBIA 🔥
</div>
{% schema %}
{ "name": "Landing Announcement", "presets": [{ "name": "Landing Announcement" }] }
{% endschema %}
`);

// 2. HERO
writeSection('landing-hero', `
{% assign selected_product = section.settings.main_product | default: product %}
<style>
@keyframes latido {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0.7); }
  6% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(37,211,102,0.5); }
  12% { transform: scale(1); box-shadow: 0 0 0 16px rgba(37,211,102,0); }
  18% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(37,211,102,0); }
  24% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,211,102,0); }
}
@keyframes sello {
  0% { transform: scale(1.2) rotate(-3deg); opacity: 0; }
  100% { transform: scale(1) rotate(-3deg); opacity: 1; }
}
.btn-whatsapp {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--color-whatsapp); color: var(--color-whatsapp-text, #ffffff);
  font-family: var(--font-titulos); font-size: 20px; font-weight: 800;
  text-decoration: none; padding: 16px 32px; border-radius: 8px;
  width: 100%; max-width: 400px; margin: 16px auto; text-transform: none;
  transition: transform 0.2s;
}
@media (prefers-reduced-motion: no-preference) { .btn-whatsapp.is-visible-btn { animation: latido 6s infinite; } }
.btn-whatsapp:hover, .btn-whatsapp:focus { animation-play-state: paused; }
.anim-sello { display: inline-block; background: var(--color-naranja, #F2661B); color: white; padding: 8px 16px; border-radius: 4px; font-family: var(--font-titulos); font-size: 40px; font-weight: 900; }
@media (prefers-reduced-motion: no-preference) { .anim-sello { animation: sello 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } }
.hero-container { max-width: 1200px; margin: 0 auto; text-align: center; }
@media (min-width: 1024px) {
  .hero-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; text-align: left; }
  .hero-text { order: 1; } .hero-image { order: 2; }
}
.chip { display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
.figures { display: flex; justify-content: center; gap: 16px; margin: 24px 0; color: white; font-size: 14px; }
@media (min-width: 1024px) { .figures { justify-content: flex-start; } }
.figures div { text-align: center; }
.figures strong { display: block; font-size: 24px; color: var(--color-naranja, #F2661B); font-family: var(--font-titulos); }
</style>
<div style="background: var(--color-grafito, #1A1A1A); color: white; padding: 40px 20px;">
  <div class="hero-container">
    <div class="hero-text">
      <div class="chip">🚀 Producto Estrella</div>
      <h1 style="color: white; font-weight: 800; font-size: 40px; margin-bottom: 16px; text-transform: none; line-height: 1.1;">
        {{ selected_product.metafields.landing.hook.value | default: "Haz todo tú mismo sin llamar al técnico" }}
      </h1>
      <p style="font-size: 18px; margin-bottom: 24px;">{{ selected_product.metafields.landing.subtitulo.value | default: "El taladro percutor que revolucionará tu hogar." }}</p>
      <div style="margin-bottom: 24px;">
        <div class="anim-sello">{{ selected_product.price | money }}</div>
      </div>
      <a id="hero-btn" href="https://wa.me/{{ settings.whatsapp_number }}?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="btn-whatsapp is-visible-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"></path></svg> Pedir por WhatsApp
      </a>
      <div class="figures">
        <div><strong>30</strong><span>Accesorios</span></div>
        <div><strong>2</strong><span>Baterías</span></div>
        <div><strong>30</strong><span>Días Garantía</span></div>
      </div>
    </div>
    <div class="hero-image">
      {% if selected_product.images[0] %}
        <img src="{{ selected_product.images[0] | image_url: width: 800 }}" style="width: 100%; border-radius: 8px; object-fit: cover;" alt="Producto">
      {% endif %}
    </div>
  </div>
</div>
<script>
document.addEventListener("DOMContentLoaded", function() {
  const heroBtn = document.getElementById('hero-btn');
  const stickyBar = document.getElementById('sticky-bar');
  const stickyBtn = document.getElementById('sticky-btn');
  if (heroBtn && stickyBar) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stickyBar.style.transform = 'translateY(100%)';
          heroBtn.classList.add('is-visible-btn');
          if(stickyBtn) stickyBtn.classList.remove('is-visible-btn');
        } else {
          stickyBar.style.transform = 'translateY(0)';
          heroBtn.classList.remove('is-visible-btn');
          if(stickyBtn) stickyBtn.classList.add('is-visible-btn');
        }
      });
    }, { threshold: 0 });
    observer.observe(heroBtn);
  }
});
</script>
{% schema %}
{ "name": "Landing Hero", "settings": [{ "type": "product", "id": "main_product", "label": "Producto" }], "presets": [{ "name": "Landing Hero" }] }
{% endschema %}
`);

// 3. TRUST (Franja de confianza)
writeSection('landing-trust', `
<div style="background: white; color: black; padding: 24px 20px; border-bottom: 1px solid #ddd;">
  <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 24px;">
    <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; font-family: var(--font-body);"><span style="font-size: 24px;">🚚</span> Pago al recibir</div>
    <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; font-family: var(--font-body);"><span style="font-size: 24px;">📦</span> Envío a todo Colombia</div>
    <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; font-family: var(--font-body);"><span style="font-size: 24px;">🛡️</span> Garantía directa</div>
  </div>
</div>
{% schema %}
{ "name": "Landing Trust", "presets": [{ "name": "Landing Trust" }] }
{% endschema %}
`);

// 4. VIDEO (Míralo funcionando)
writeSection('landing-video', `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: #F9F9F9; padding: 60px 20px; text-align: center;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 24px; color: #111;">Míralo funcionando</h2>
    <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      {% assign video = selected_product.media | where: "media_type", "video" | first %}
      {% if video %}
        {{ video | video_tag: autoplay: true, loop: true, muted: true, controls: true, style: "width: 100%; display: block;" }}
      {% else %}
        <div style="background: #ccc; padding: 100px 0; color: #666; font-weight: bold;">[Video del Producto Aquí]</div>
      {% endif %}
    </div>
  </div>
</div>
{% schema %}
{ "name": "Landing Video", "settings": [{ "type": "product", "id": "main_product", "label": "Producto" }], "presets": [{ "name": "Landing Video" }] }
{% endschema %}
`);

// 5. MODES (Un taladro, tres modos)
writeSection('landing-modes', `
<div style="background: white; padding: 60px 20px; text-align: center;">
  <div style="max-width: 1200px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 40px; color: #111;">Un taladro, tres modos</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
      <div style="background: #F1F2F3; padding: 24px; border-radius: 8px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 16px;">🔩</div>
        <h3 style="font-family: var(--font-titulos); font-size: 20px; font-weight: bold; margin-bottom: 8px;">Atornillador</h3>
        <p>Para armar muebles y ajustes rápidos.</p>
      </div>
      <div style="background: #F1F2F3; padding: 24px; border-radius: 8px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 16px;">🪵</div>
        <h3 style="font-family: var(--font-titulos); font-size: 20px; font-weight: bold; margin-bottom: 8px;">Taladro</h3>
        <p>Perfora madera, plástico y metal blando.</p>
      </div>
      <div style="background: #F1F2F3; padding: 24px; border-radius: 8px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 16px;">🧱</div>
        <h3 style="font-family: var(--font-titulos); font-size: 20px; font-weight: bold; margin-bottom: 8px;">Percutor</h3>
        <p>Impacto para taladrar mampostería y ladrillo.</p>
      </div>
    </div>
  </div>
</div>
{% schema %}
{ "name": "Landing Modes", "presets": [{ "name": "Landing Modes" }] }
{% endschema %}
`);

// 6. COMPARE (Por separado o en maletín)
writeSection('landing-compare', `
<div style="background: #111; color: white; padding: 60px 20px; text-align: center;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 40px; color: var(--color-naranja, #F2661B);">¿Por separado o en un solo maletín?</h2>
    <table style="width: 100%; border-collapse: collapse; text-align: left; background: #222; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #333;">
          <th style="padding: 16px;">Característica</th>
          <th style="padding: 16px; text-align: center;">Comprando suelto</th>
          <th style="padding: 16px; text-align: center; color: var(--color-naranja, #F2661B);">Nuestro Kit</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #444;">
          <td style="padding: 16px;">Taladro inalámbrico</td><td style="padding: 16px; text-align: center;">$150.000</td><td style="padding: 16px; text-align: center; color: var(--color-naranja, #F2661B);">Incluido</td>
        </tr>
        <tr style="border-bottom: 1px solid #444;">
          <td style="padding: 16px;">Batería extra</td><td style="padding: 16px; text-align: center;">$60.000</td><td style="padding: 16px; text-align: center; color: var(--color-naranja, #F2661B);">Incluida</td>
        </tr>
        <tr style="border-bottom: 1px solid #444;">
          <td style="padding: 16px;">Set de 30 brocas/copas</td><td style="padding: 16px; text-align: center;">$80.000</td><td style="padding: 16px; text-align: center; color: var(--color-naranja, #F2661B);">Incluido</td>
        </tr>
        <tr>
          <td style="padding: 16px; font-weight: bold;">Total aproximado</td><td style="padding: 16px; text-align: center; text-decoration: line-through;">$290.000</td><td style="padding: 16px; text-align: center; font-weight: bold; font-size: 20px; color: var(--color-naranja, #F2661B);">$219.900</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
{% schema %}
{ "name": "Landing Compare", "presets": [{ "name": "Landing Compare" }] }
{% endschema %}
`);

// 7. INCLUYE (2 columns on #F1F2F3)
writeSection('landing-incluye', `
<div style="background: #F1F2F3; color: #111; padding: 60px 20px;">
  <div style="max-width: 1000px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 40px; text-align: center;">¿Qué incluye la caja?</h2>
    <div style="display: grid; grid-template-columns: 1fr; gap: 16px; font-size: 16px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin-bottom: 12px;">✅ 1 Taladro Percutor Inalámbrico</li>
          <li style="margin-bottom: 12px;">✅ 2 Baterías recargables</li>
          <li style="margin-bottom: 12px;">✅ 1 Cargador de pared</li>
          <li style="margin-bottom: 12px;">✅ 1 Maletín plástico de alto impacto</li>
          <li style="margin-bottom: 12px;">✅ 3 Brocas para madera</li>
          <li style="margin-bottom: 12px;">✅ 3 Brocas para metal/pared</li>
        </ul>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="margin-bottom: 12px;">✅ 9 Copas hexagonales</li>
          <li style="margin-bottom: 12px;">✅ 1 Adaptador para puntas</li>
          <li style="margin-bottom: 12px;">✅ 1 Extensión flexible</li>
          <li style="margin-bottom: 12px;">✅ 6 Puntas de destornillador</li>
          <li style="margin-bottom: 12px;">✅ 1 Cinta métrica</li>
          <li style="margin-bottom: 12px;">✅ Manual de usuario</li>
        </ul>
      </div>
    </div>
  </div>
</div>
{% schema %}
{ "name": "Landing Incluye", "presets": [{ "name": "Landing Incluye" }] }
{% endschema %}
`);

// 8. GARANTIA (White card on the left)
writeSection('landing-garantia', `
<div style="background: #F1F2F3; padding: 60px 20px;">
  <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 40px;">
    <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: left;">
      <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 24px; color: #111;">Garantía de Satisfacción</h2>
      <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
        Tu compra está protegida. Tienes 30 días de garantía directa por defectos de fábrica (el motor no enciende o baterías no cargan). Compras hoy y pagas al recibir.
      </p>
      <a href="/pages/garantia-y-devoluciones" style="color: var(--color-naranja, #F2661B); font-weight: bold; text-decoration: underline;">Ver condiciones completas</a>
    </div>
  </div>
</div>
{% schema %}
{ "name": "Landing Garantia", "presets": [{ "name": "Landing Garantia" }] }
{% endschema %}
`);

// 9. FAQ (Native details on white)
writeSection('landing-faq', `
<div style="background: white; padding: 60px 20px;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 40px; text-align: center; color: #111;">Preguntas Frecuentes</h2>
    <details style="background: #F9F9F9; padding: 16px; border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
      <summary style="font-weight: bold; font-size: 18px;">¿Qué voltaje tienen las baterías?</summary>
      <p style="margin-top: 12px; color: #555;">Son de 24V nominal (aunque el diseño del fabricante indique 48V, rinden como un sistema continuo de 24V para proyectos del hogar).</p>
    </details>
    <details style="background: #F9F9F9; padding: 16px; border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
      <summary style="font-weight: bold; font-size: 18px;">¿Sirve para concreto o pared?</summary>
      <p style="margin-top: 12px; color: #555;">Sí, cuenta con la función de percutor, ideal para taladrar mampostería y pared de ladrillo con las brocas adecuadas.</p>
    </details>
    <details style="background: #F9F9F9; padding: 16px; border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
      <summary style="font-weight: bold; font-size: 18px;">¿Se puede abrir el paquete antes de pagar?</summary>
      <p style="margin-top: 12px; color: #555;">No, por políticas estrictas de las transportadoras se debe pagar el paquete primero para poder entregártelo.</p>
    </details>
  </div>
</div>
{% schema %}
{ "name": "Landing FAQ", "presets": [{ "name": "Landing FAQ" }] }
{% endschema %}
`);

// 10. CIERRE
writeSection('landing-cierre', `
{% assign selected_product = section.settings.main_product | default: product %}
<div style="background: var(--color-grafito, #1A1A1A); color: white; padding: 60px 20px; text-align: center;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="font-family: var(--font-titulos); font-size: 32px; font-weight: 800; margin-bottom: 24px;">No esperes más para tener tus herramientas</h2>
    <div style="margin-bottom: 32px;">
        <div class="anim-sello" style="display: inline-block; background: var(--color-naranja, #F2661B); color: white; padding: 8px 16px; border-radius: 4px; font-family: var(--font-titulos); font-size: 40px; font-weight: 900;">{{ selected_product.price | money }}</div>
    </div>
    <a href="https://wa.me/{{ settings.whatsapp_number }}?text={{ selected_product.metafields.landing.whatsapp_texto.value | url_encode }} (web-{{ selected_product.sku }})" class="btn-whatsapp" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-whatsapp); color: var(--color-whatsapp-text, #ffffff); font-family: var(--font-titulos); font-size: 20px; font-weight: 800; text-decoration: none; padding: 16px 32px; border-radius: 8px; width: 100%; max-width: 400px; margin: 0 auto 24px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"></path></svg> Pedir por WhatsApp
    </a>
    <p style="color: #aaa; font-size: 14px;">Horario de atención: Lunes a Sábado de 8:00 AM a 6:00 PM</p>
  </div>
</div>
{% schema %}
{ "name": "Landing Cierre", "settings": [{ "type": "product", "id": "main_product", "label": "Producto" }], "presets": [{ "name": "Landing Cierre" }] }
{% endschema %}
`);

// 11. REMOVE 'landing-pasos.liquid' (Cómo pedir)
if (fs.existsSync(path.join(sectionsDir, 'landing-pasos.liquid'))) {
  fs.unlinkSync(path.join(sectionsDir, 'landing-pasos.liquid'));
}

console.log("Sections rebuilt!");
