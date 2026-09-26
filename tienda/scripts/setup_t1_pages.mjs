import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });
const domain = process.env.SHOPIFY_STORE_DOMAIN;

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
    const json = await r.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
  };

  console.log("4. Creando páginas...");
  const pages = ['contacto', 'preguntas-frecuentes', 'envios-y-pagos', 'garantia-y-devoluciones', 'tratamiento-de-datos', 'quienes-somos'];
  for (const page of pages) {
    const html = fs.readFileSync(`tienda/contenido/${page}.html`, 'utf-8');
    const title = html.split('<h1>')[1].split('</h1>')[0];
    await req(`mutation pageCreate($page: PageCreateInput!) {
      pageCreate(page: $page) { userErrors { message } }
    }`, { page: { title, handle: page, body: html } });
  }

  console.log("Script completado con éxito.");
}

run().catch(console.error);
