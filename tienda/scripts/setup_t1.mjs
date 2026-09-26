import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });
const domain = process.env.SHOPIFY_STORE_DOMAIN;

async function run() {
  // Get token
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

  console.log("1. Buscando producto...");
  const productsData = await req(`{ products(first: 1) { edges { node { id title } } } }`);
  const product = productsData.products.edges[0]?.node;
  if (!product) throw new Error("No product found!");
  console.log("Producto encontrado:", product.title);

  console.log("2. Creando definiciones de metafields...");
  const defs = [
    { name: "Hook", namespace: "landing", key: "hook", type: "single_line_text_field" },
    { name: "Subtitulo", namespace: "landing", key: "subtitulo", type: "multi_line_text_field" },
    { name: "Beneficios", namespace: "landing", key: "beneficios", type: "list.single_line_text_field" },
    { name: "Como Funciona", namespace: "landing", key: "como_funciona", type: "list.single_line_text_field" },
    { name: "FAQ", namespace: "landing", key: "faq", type: "json" },
    { name: "Garantia", namespace: "landing", key: "garantia", type: "multi_line_text_field" },
    { name: "WhatsApp Texto", namespace: "landing", key: "whatsapp_texto", type: "single_line_text_field" }
  ];
  
  for (const def of defs) {
    await req(`mutation CreateMetafieldDef($def: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $def) {
        createdDefinition { id }
        userErrors { message field }
      }
    }`, { def: { ...def, ownerType: "PRODUCT" } });
  }

  console.log("3. Actualizando metafields del producto estrella...");
  const updateRes = await req(`mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { message }
    }
  }`, {
    input: {
      id: product.id,
      metafields: [
        { namespace: "landing", key: "hook", type: "single_line_text_field", value: "Atraviesa concreto, metal y madera sin esfuerzo" },
        { namespace: "landing", key: "subtitulo", type: "multi_line_text_field", value: "Un potente taladro inalámbrico de 48V con doble batería y maletín máster repleto de herramientas. No dependas de nadie más." },
        { namespace: "landing", key: "beneficios", type: "list.single_line_text_field", value: JSON.stringify(["Nunca te quedas a medias: Incluye 2 baterías de litio", "El taller completo en tu mano: Trae brocas, copas, puntas, etc.", "Cero riesgos: Pagas en efectivo al recibir"]) },
        { namespace: "landing", key: "como_funciona", type: "list.single_line_text_field", value: JSON.stringify(["Inserta una batería", "Selecciona atornillador, taladro o percutor", "¡Listo para trabajar!"]) },
        { namespace: "landing", key: "faq", type: "json", value: JSON.stringify({ preguntas: [{ q: "¿Cuánto le dura la batería?", a: "Varias horas de uso continuo. Trae dos para que no te vares." }, { q: "¿El pago es seguro?", a: "Sí, es Pago Contra Entrega. Pagas al mensajero." }] }) },
        { namespace: "landing", key: "garantia", type: "multi_line_text_field", value: "30 días por defectos de fábrica. Devoluciones fáciles por WhatsApp." },
        { namespace: "landing", key: "whatsapp_texto", type: "single_line_text_field", value: "¡Hola! Quiero pedir el Taladro 48V con pago contra entrega." }
      ]
    }
  });
  console.log("Update result:", updateRes.productUpdate.userErrors);

  console.log("4. Creando páginas...");
  const pages = ['contacto', 'preguntas-frecuentes', 'envios-y-pagos', 'garantia-y-devoluciones', 'tratamiento-de-datos', 'quienes-somos'];
  for (const page of pages) {
    const html = fs.readFileSync(`tienda/contenido/${page}.html`, 'utf-8');
    const title = html.split('<h1>')[1].split('</h1>')[0];
    await req(`mutation pageCreate($page: PageCreateInput!) {
      pageCreate(page: $page) { userErrors { message } }
    }`, { page: { title, handle: page, bodyHtml: html } });
  }

  console.log("Script completado con éxito.");
}

run().catch(console.error);
