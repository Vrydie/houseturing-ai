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

  const faqData = JSON.stringify([
    { pregunta: "¿Tiene garantía?", respuesta: "Sí, cuentas con garantía de 30 días por defectos de fábrica." },
    { pregunta: "¿Cuánto tarda el envío?", respuesta: "Te lo enviamos y suele tardar entre 2 a 5 días hábiles dependiendo de la ciudad." },
    { pregunta: "¿Cómo es el método de pago?", respuesta: "Es totalmente contra entrega. Pagas en efectivo directamente al repartidor cuando tengas el producto en tus manos." }
  ]);

  const r = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: `
      mutation {
        metafieldsSet(metafields: [
          {
            ownerId: "${productId}",
            namespace: "landing",
            key: "faq",
            type: "json",
            value: ${JSON.stringify(faqData)}
          }
        ]) {
          metafields { id key value }
          userErrors { field message }
        }
      }
    `})
  });
  const json = await r.json();
  console.log(JSON.stringify(json, null, 2));
}
run().catch(console.error);
