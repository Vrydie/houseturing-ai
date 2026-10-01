import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });
const domain = process.env.SHOPIFY_STORE_DOMAIN;
async function run() {
  const resToken = await fetch(`https://${domain}/admin/oauth/access_token`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  const { access_token: token } = await resToken.json();
  const r = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, { method: 'POST', headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query: '{ pages(first: 10) { nodes { id handle title } } }' }) });
  const json = await r.json();
  console.log(JSON.stringify(json, null, 2));
}
run();
