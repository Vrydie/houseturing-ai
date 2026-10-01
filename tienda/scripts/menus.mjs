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
    import('fs').then(fs => {
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    });
  }

  console.log("Eliminando página contact...");
  const pagesData = await req(`{ pages(first: 10, query: "handle:contact") { nodes { id title } } }`);
  if (pagesData.pages.nodes.length > 0) {
    const id = pagesData.pages.nodes[0].id;
    if (aplicar) {
      const fs = await import('fs');
      fs.writeFileSync(`${backupDir}/deleted_page_contact.json`, JSON.stringify(pagesData.pages.nodes[0], null, 2));
      await req(`mutation { pageDelete(id: "${id}") { userErrors { field message } } }`);
      console.log("Página contact eliminada.");
    } else {
      console.log(`[SIMULACIÓN] Se eliminaría la página contact (ID: ${id})`);
    }
  } else {
    console.log("Página contact no encontrada, asumiendo ya eliminada.");
  }

  console.log("Consultando menús...");
  const menusData = await req(`{ menus(first: 100) { nodes { id handle title items { title url } } } }`);
  const menuNodes = menusData.menus.nodes;

  const mainId = menuNodes.find(m => m.handle === 'main-menu')?.id;
  const footerId = menuNodes.find(m => m.handle === 'footer')?.id;

  const mainItems = [
    { title: "Inicio", type: "FRONTPAGE", resourceId: "" },
    { title: "Preguntas frecuentes", type: "PAGE", resourceId: "gid://shopify/Page/preguntas-frecuentes" },
    { title: "Envíos y pagos", type: "PAGE", resourceId: "gid://shopify/Page/envios-y-pagos" },
    { title: "Contacto", type: "PAGE", resourceId: "gid://shopify/Page/contacto" }
  ];

  const footerItems = [
    { title: "Envíos y pagos", type: "PAGE", resourceId: "gid://shopify/Page/envios-y-pagos" },
    { title: "Garantía y devoluciones", type: "PAGE", resourceId: "gid://shopify/Page/garantia-y-devoluciones" },
    { title: "Tratamiento de datos", type: "PAGE", resourceId: "gid://shopify/Page/tratamiento-de-datos" },
    { title: "Términos y condiciones", type: "SHOP_POLICY", resourceId: "gid://shopify/ShopPolicy/TERMS_OF_SERVICE" },
    { title: "Contacto", type: "PAGE", resourceId: "gid://shopify/Page/contacto" }
  ];

  const fixItems = (items) => items.map(i => {
    const finalUrl = i.type === 'FRONTPAGE' ? '/' : (i.type === 'SHOP_POLICY' ? '/policies/terms-of-service' : '/pages/' + i.resourceId.split('/').pop());
    return { title: i.title, type: 'HTTP', url: finalUrl };
  });

  const updateMenu = async (id, handle, title, items) => {
    const formattedItems = fixItems(items);
    const existingMenu = menuNodes.find(m => m.handle === handle);
    
    if (existingMenu) {
      const isDiff = JSON.stringify(existingMenu.items) !== JSON.stringify(formattedItems.map(f => ({ title: f.title, url: f.url })));
      if (isDiff) {
        if (aplicar) {
          const fs = await import('fs');
          fs.writeFileSync(`${backupDir}/menu_${handle}_backup.json`, JSON.stringify(existingMenu, null, 2));
          await req(`mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
            menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { userErrors { field message } }
          }`, { id, title, handle, items: formattedItems });
          console.log(`Menú ${handle} actualizado.`);
        } else {
          console.log(`[SIMULACIÓN] Menú ${handle} cambiará:`);
          console.log(`  Actual: ${existingMenu.items.map(i => i.title).join(', ')}`);
          console.log(`  Nuevo : ${formattedItems.map(i => i.title).join(', ')}`);
        }
      } else {
        console.log(`Menú ${handle} ya está al día.`);
      }
    } else {
      if (aplicar) {
        await req(`mutation menuCreate($menu: MenuCreateInput!) {
          menuCreate(menu: $menu) { userErrors { field message } }
        }`, { menu: { handle, title, items: formattedItems } });
        console.log(`Menú ${handle} creado.`);
      } else {
        console.log(`[SIMULACIÓN] Se crearía el menú ${handle}.`);
      }
    }
  };

  await updateMenu(mainId, 'main-menu', 'Main menu', mainItems);
  await updateMenu(footerId, 'footer', 'Footer menu', footerItems);

  console.log("Proceso de menús finalizado.");
}
run().catch(console.error);
