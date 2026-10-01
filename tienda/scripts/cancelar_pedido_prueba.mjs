import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const args = process.argv.slice(2);
const aplicarIndex = args.indexOf('--aplicar');
const aplicar = aplicarIndex !== -1;
if (aplicar) args.splice(aplicarIndex, 1);
const orderIdOrName = args[0];

async function run() {
  if (!orderIdOrName) {
    console.error("Uso: node cancelar_pedido_prueba.mjs <id_o_nombre> [--aplicar]");
    return;
  }
  
  if (!aplicar) console.log("MODO SIMULACIÓN: No se realizarán cambios. Usa --aplicar para ejecutar.");

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
    const r = await fetch(`https://${domain}/admin/api/${process.env.SHOPIFY_API_VERSION || '2026-07'}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables })
    });
    const json = await r.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
    if (json.data && Object.values(json.data).some(v => v?.userErrors?.length)) {
      throw new Error(JSON.stringify(json.data.userErrors || json.data, null, 2));
    }
    return json.data;
  };

  let searchQ = `query { order(id: "${orderIdOrName.startsWith('gid://') ? orderIdOrName : `gid://shopify/Order/${orderIdOrName}`}") { id name tags cancelledAt customAttributes { key value } } }`;
  if (!orderIdOrName.startsWith('gid://') && isNaN(parseInt(orderIdOrName))) {
    // Es un nombre
    searchQ = `query { orders(first: 1, query: "name:${orderIdOrName}") { nodes { id name tags cancelledAt customAttributes { key value } } } }`;
  }

  const result = await req(searchQ);
  const order = result.order || (result.orders && result.orders.nodes[0]);

  if (!order) {
    throw new Error(`Pedido ${orderIdOrName} no encontrado.`);
  }

  if (order.cancelledAt) {
    console.log(`El pedido ${order.name} ya está cancelado.`);
    return;
  }

  const isTest = order.tags.includes('TEST');
  const isOt06 = order.customAttributes.some(a => a.key === 'prueba' && a.value === 'ot-06');

  if (!isTest || !isOt06) {
    throw new Error(`Se denegó la cancelación: el pedido ${order.name} no tiene el tag TEST o el atributo prueba=ot-06.`);
  }

  if (!aplicar) {
    console.log(`\n[SIMULACIÓN] Se cancelaría el pedido ${order.name} (${order.id}) con restock:true, sin notificar al cliente.`);
  } else {
    const cancelQ = `
      mutation orderCancel($orderId: ID!, $notifyCustomer: Boolean, $reason: OrderCancelReason, $restock: Boolean) {
        orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, reason: $reason, restock: $restock) {
          job { id }
          userErrors { field message }
        }
      }
    `;
    const resCancel = await req(cancelQ, {
      orderId: order.id,
      notifyCustomer: false,
      reason: "OTHER",
      restock: true
    });
    console.log(`\nPedido ${order.name} cancelado con éxito.`);
    console.dir(resCancel.orderCancel, { depth: null });
  }
}

run().catch(console.error);
