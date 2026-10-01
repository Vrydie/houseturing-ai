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

  console.log("Eliminando página contact...");
  const pagesData = await req(`{ pages(first: 10, query: "handle:contact") { nodes { id } } }`);
  if (pagesData.pages.nodes.length > 0) {
    const id = pagesData.pages.nodes[0].id;
    await req(`mutation { pageDelete(id: "${id}") { userErrors { field message } } }`);
    console.log("Página contact eliminada.");
  } else {
    console.log("Página contact no encontrada, asumiendo ya eliminada.");
  }

  console.log("Consultando menús...");
  const menusData = await req(`{ menus(first: 100) { nodes { id handle } } }`);
  const menuNodes = menusData.menus.nodes;

  const mainId = menuNodes.find(m => m.handle === 'main-menu')?.id;
  const footerId = menuNodes.find(m => m.handle === 'footer')?.id;

  const mainItems = [
    { title: "Inicio", type: "FRONTPAGE", tags: [] },
    { title: "Preguntas frecuentes", type: "PAGE", resourceId: "gid://shopify/Page/preguntas-frecuentes", tags: [] },
    { title: "Envíos y pagos", type: "PAGE", resourceId: "gid://shopify/Page/envios-y-pagos", tags: [] },
    { title: "Contacto", type: "PAGE", resourceId: "gid://shopify/Page/contacto", tags: [] }
  ];

  const footerItems = [
    { title: "Envíos y pagos", type: "PAGE", resourceId: "gid://shopify/Page/envios-y-pagos", tags: [] },
    { title: "Garantía y devoluciones", type: "PAGE", resourceId: "gid://shopify/Page/garantia-y-devoluciones", tags: [] },
    { title: "Tratamiento de datos", type: "PAGE", resourceId: "gid://shopify/Page/tratamiento-de-datos", tags: [] },
    { title: "Términos y condiciones", type: "SHOP_POLICY", resourceId: "gid://shopify/ShopPolicy/TERMS_OF_SERVICE", tags: [] },
    { title: "Contacto", type: "PAGE", resourceId: "gid://shopify/Page/contacto", tags: [] }
  ];

  // Necesitamos obtener los IDs reales de las páginas y políticas para enviar resourceId
  // O bien enviar url si es que MenuItemCreateInput acepta url (no siempre).
  // Probemos con tags: [], title, url como lo pide MenuItemCreateInput?
  // MenuItemCreateInput: title: String!, url: URL, type: MenuItemType, resourceId: ID, tags: [String!]
  
  const fixItems = (items) => items.map(i => ({
    title: i.title,
    type: i.type,
    // url is required for some types, maybe omit if resourceId is provided? 
    // Let's just use url. The user wants them to link to /pages/handle
    url: i.type === 'FRONTPAGE' ? '/' : (i.type === 'SHOP_POLICY' ? i.resourceId : '/pages/' + i.resourceId.split('/').pop())
  })).map(i => {
    // Para simplificar MenuItemUpdateInput:
    const finalUrl = i.type === 'SHOP_POLICY' ? '/policies/terms-of-service' : i.url;
    return { title: i.title, type: 'HTTP', url: finalUrl };
  });

  const updateMenu = async (id, handle, title, items) => {
    const formattedItems = fixItems(items);
    if (id) {
      await req(`mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { userErrors { field message } }
      }`, { id, title, handle, items: formattedItems });
      console.log(`Menú ${handle} actualizado.`);
    } else {
      await req(`mutation menuCreate($menu: MenuCreateInput!) {
        menuCreate(menu: $menu) { userErrors { field message } }
      }`, { menu: { handle, title, items: formattedItems } });
      console.log(`Menú ${handle} creado.`);
    }
  };

  await updateMenu(mainId, 'main-menu', 'Main menu', mainItems);
  await updateMenu(footerId, 'footer', 'Footer menu', footerItems);

  console.log("Menús configurados con éxito.");
}
run().catch(console.error);
