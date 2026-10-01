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
    const r = await fetch(`https://${domain}/admin/api/${process.env.SHOPIFY_API_VERSION || '2024-04'}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    const json = await r.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
    if (json.data && Object.values(json.data).some(v => v?.userErrors?.length)) {
      throw new Error(JSON.stringify(json.data, null, 2));
    }
    return json.data;
  };

  const politicas = [
    { type: 'PRIVACY_POLICY', file: 'privacidad.md' },
    { type: 'REFUND_POLICY', file: 'reembolso.md' },
    { type: 'TERMS_OF_SERVICE', file: 'terminos.md' },
    { type: 'SHIPPING_POLICY', file: 'envios.md' },
    { type: 'CONTACT_INFORMATION', file: 'contacto.md' },
  ];

  for (const pol of politicas) {
    const body = fs.readFileSync(`tienda/contenido/politicas/${pol.file}`, 'utf-8');
    try {
      await req(`mutation shopPolicyUpdate($shopPolicy: ShopPolicyInput!) {
        shopPolicyUpdate(shopPolicy: $shopPolicy) {
          userErrors { field message }
        }
      }`, { shopPolicy: { body, type: pol.type } });
      console.log(`Política ${pol.type} actualizada.`);
    } catch (e) {
      console.error(`Error actualizando ${pol.type}:`, e.message);
    }
  }

  console.log("Políticas actualizadas con éxito.");
}
run().catch(console.error);
