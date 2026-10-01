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
      value: "Haz todo tú mismo sin llamar al técnico"
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "subtitulo",
      type: "multi_line_text_field",
      value: "Un kit de herramientas portátil y potente que te permite taladrar, atornillar y reparar en casa sin depender de cables."
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "beneficios",
      type: "list.single_line_text_field",
      value: JSON.stringify([
        "Inalámbrico y portátil con 2 baterías",
        "Múltiples accesorios en un solo maletín",
        "Tres modos: taladro, percutor y atornillador",
        "Luz LED integrada para espacios oscuros"
      ])
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "como_funciona",
      type: "list.single_line_text_field",
      value: JSON.stringify([
        "Carga una de las baterías al 100% antes de usarlo.",
        "Inserta la batería y selecciona la broca o punta.",
        "Ajusta el torque y el modo según el material."
      ])
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "garantia",
      type: "multi_line_text_field",
      value: "Tienes 30 días de garantía directa por defectos de fábrica (el motor no enciende o baterías no cargan). Escalaré tu caso con soporte técnico si lo necesitas."
    },
    {
      ownerId: productId,
      namespace: "landing",
      key: "whatsapp_texto",
      type: "single_line_text_field",
      value: "Hola. Quiero pedir el Kit Taladro Percutor con pago contra entrega."
    }
  ];

  for (const mf of mfs) {
    const res = await req(`
      mutation ($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id value }
          userErrors { field message }
        }
      }
    `, { metafields: [mf] });
    if(res.metafieldsSet.userErrors.length > 0) {
      console.log("Error en MF", mf.key, res.metafieldsSet.userErrors);
    }
  }
  console.log("Metafields updated!");
}
run().catch(console.error);
