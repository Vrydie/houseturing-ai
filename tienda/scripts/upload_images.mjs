import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: 'infra/.env' });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const mediaDir = 'tienda/media';
const files = [
  '1cf6eba0-b659-4a51-a86d-72d73e0acbf6.jpeg',
  '8c1d2172-b0ee-44c7-b28f-a5f372ccda2e.jpeg',
  '23bf1b6b-bc30-4248-ba34-1b6e46849924.jpeg'
];

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
  const tokenData = await resToken.json();
  const token = tokenData.access_token;
  if (!token) throw new Error("No token");

  const gqlReq = async (query, variables) => {
    const r = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    return (await r.json()).data;
  };

  const data = await gqlReq(`
    query {
      productByHandle(handle: "taladro-24v-dewalt-accesorios-maleta") {
        id
        legacyResourceId
      }
    }
  `);
  const productId = data.productByHandle.legacyResourceId;
  console.log("Product ID:", productId);

  for (const file of files) {
    const filePath = path.join(mediaDir, file);
    if (!fs.existsSync(filePath)) {
       console.log("Not found:", filePath); continue;
    }
    const b64 = fs.readFileSync(filePath, { encoding: 'base64' });
    console.log("Uploading:", file);
    const res = await fetch(`https://${domain}/admin/api/2024-04/products/${productId}/images.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({
        image: { attachment: b64, filename: file }
      })
    });
    const result = await res.json();
    if (result.errors) {
       console.error("Error on", file, result.errors);
    } else {
       console.log("Success", file);
    }
  }
}
run().catch(console.error);
