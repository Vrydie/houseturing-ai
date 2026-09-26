import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ACCESS_TOKEN;
if (!token) throw new Error("Falta SHOPIFY_ACCESS_TOKEN en infra/.env (o genera uno con tienda/scripts/exchange.mjs)");

async function run() {
  const req = async (query, variables) => {
    const r = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    return (await r.json()).data;
  };

  const productsData = await req(`{ products(first: 1) { edges { node { id } } } }`);
  const product = productsData.products.edges[0]?.node;

  await req(`mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id templateSuffix }
      userErrors { message }
    }
  }`, {
    input: {
      id: product.id,
      templateSuffix: "estrella"
    }
  });
  console.log("Template asignado!");
}
run();
