import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ACCESS_TOKEN;
if (!token) throw new Error("Falta SHOPIFY_ACCESS_TOKEN en infra/.env (o genera uno con tienda/scripts/exchange.mjs)");

async function run() {
  const q = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({
      query: `{ products(first: 5) { edges { node { id title handle } } } }`
    })
  });
  console.log(JSON.stringify(await q.json(), null, 2));
}
run();
