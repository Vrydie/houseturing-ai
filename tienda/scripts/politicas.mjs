import fs from 'fs';
import dotenv from 'dotenv';
import { marked } from 'marked';
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

  const aplicar = process.argv.includes('--aplicar');
  if (!aplicar) console.log("MODO SIMULACIÓN: No se realizarán cambios. Usa --aplicar para ejecutar.");

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

  const backupDir = `tienda/respaldos/${new Date().toISOString().split('T')[0]}`;
  if (aplicar) {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  }

  // Fetch current policies to compare
  const currentPoliciesRes = await req(`{ shop { shopPolicies { type body } } }`);
  const currentPoliciesList = currentPoliciesRes.shop.shopPolicies || [];
  const currentBodies = {};
  for (const p of currentPoliciesList) {
    currentBodies[p.type] = p.body || '';
  }

  const politicas = [
    { type: 'PRIVACY_POLICY', file: 'privacidad.md' },
    { type: 'REFUND_POLICY', file: 'reembolso.md' },
    { type: 'TERMS_OF_SERVICE', file: 'terminos.md' },
    { type: 'SHIPPING_POLICY', file: 'envios.md' },
    { type: 'CONTACT_INFORMATION', file: 'contacto.md' },
  ];

  for (const pol of politicas) {
    const mdBody = fs.readFileSync(`tienda/contenido/politicas/${pol.file}`, 'utf-8');
    const htmlBody = marked.parse(mdBody);
    
    const existingBody = currentBodies[pol.type] || '';
    if (existingBody !== htmlBody) {
      if (aplicar) {
        fs.writeFileSync(`${backupDir}/policy_${pol.type}_backup.html`, existingBody);
        try {
          await req(`mutation shopPolicyUpdate($shopPolicy: ShopPolicyInput!) {
            shopPolicyUpdate(shopPolicy: $shopPolicy) {
              userErrors { field message }
            }
          }`, { shopPolicy: { body: htmlBody, type: pol.type } });
          console.log(`Política ${pol.type} actualizada.`);
        } catch (e) {
          console.error(`Error actualizando ${pol.type}:`, e.message);
        }
      } else {
        console.log(`[SIMULACIÓN] Política ${pol.type} cambiará (la versión actual difiere del nuevo HTML).`);
      }
    } else {
      console.log(`Política ${pol.type} ya está al día.`);
    }
  }

  console.log("Proceso de políticas finalizado.");
}
run().catch(console.error);
