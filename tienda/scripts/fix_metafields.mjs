import dotenv from 'dotenv';
dotenv.config({ path: 'infra/.env' });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const productId = 'gid://shopify/Product/9032076853366';

async function run() {
  const resToken = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const { access_token: token } = await resToken.json();

  const req = async (query, variables) => {
    const r = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    return (await r.json()).data;
  };

  const mfs = [
    {
      ownerId: productId,
      namespace: "landing",
      key: "hook",
      type: "single_line_text_field",
      value: "Atraviesa concreto, metal y madera sin esfuerzo"
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "subtitulo",
      type: "multi_line_text_field",
      value: "Kit profesional de taladro inalámbrico de 48V con doble batería de litio, percutor y maletín maestro."
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "beneficios",
      type: "list.single_line_text_field",
      value: JSON.stringify([
        "Taladro inalámbrico 48V con percutor",
        "2 baterías de litio recargables",
        "Cargador rápido de pared",
        "Juego de brocas para madera, metal y pared",
        "Juego de copas y puntas",
        "Extensor flexible",
        "Destornilladores manuales",
        "Alicate y bisturí",
        "Cinta métrica",
        "Cinta aislante",
        "Probador de corriente",
        "Maletín rígido anti-impactos"
      ])
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "como_funciona",
      type: "list.single_line_text_field",
      value: JSON.stringify([
        "Pide ahora desde tu celular sin pagar nada por adelantado.",
        "Te lo enviamos gratis a tu ciudad en menos de 48 horas.",
        "Pagas en efectivo únicamente cuando lo recibas en tus manos."
      ])
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "garantia",
      type: "multi_line_text_field",
      value: "Tienes derecho de retracto y garantía legal sobre fallas de fábrica. No tienes que pagar nada por adelantado, solo pagas cuando recibas el paquete en tus manos."
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "whatsapp_texto",
      type: "single_line_text_field",
      value: "Hola. Quiero pedir el Taladro 48V con pago contra entrega."
    }
  ];

  for (const mf of mfs) {
    await req(`
      mutation ($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id value }
          userErrors { field message }
        }
      }
    `, { metafields: [mf] });
  }
  console.log("Metafields updated!");
}
run().catch(console.error);
