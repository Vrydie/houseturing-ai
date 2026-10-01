import dotenv from 'dotenv';
dotenv.config({ path: './infra/.env' });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const aplicar = process.argv.includes('--aplicar');

const mask = (str, showLast = 4) => {
  if (!str) return '';
  if (str.length <= showLast) return str;
  return str.slice(0, 3) + '*'.repeat(str.length - 3 - showLast) + str.slice(-showLast);
};

async function run() {
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

  // 1. Check existing pending order
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const searchOrdersQ = `
    query searchOrders {
      orders(first: 5, query: "created_at:>=${oneDayAgo} tag:TEST") {
        nodes {
          id
          name
          displayFulfillmentStatus
          cancelledAt
          customAttributes { key value }
        }
      }
    }
  `;
  const existingOrders = await req(searchOrdersQ);
  const activeTest = existingOrders.orders.nodes.find(o => 
    !o.cancelledAt && 
    o.customAttributes.some(a => a.key === 'prueba' && a.value === 'ot-06')
  );

  if (activeTest) {
    console.log(`\nIdempotencia: Ya existe un pedido de prueba activo (${activeTest.name}, ID: ${activeTest.id}). Cancelalo antes de crear uno nuevo.`);
    return;
  }

  // 2. Fetch Variant CM-135
  const variantQ = `
    query getVariant {
      productVariants(first: 1, query: "sku:CM-135") {
        nodes {
          id
          price
        }
      }
    }
  `;
  const varRes = await req(variantQ);
  if (varRes.productVariants.nodes.length === 0) {
    throw new Error("Variante CM-135 no encontrada.");
  }
  const variant = varRes.productVariants.nodes[0];
  if (parseFloat(variant.price) !== 219900) {
    throw new Error(`Precio incorrecto para CM-135. Esperado 219900, pero es ${variant.price}`);
  }

  // 3. Prepare payload
  const celular = process.env.PRUEBA_CELULAR || '';
  const dir = process.env.PRUEBA_DIRECCION || '';
  const payload = {
    order: {
      currency: "COP",
      financialStatus: "PENDING",
      phone: celular.startsWith('+57') ? celular : `+57${celular}`,
      tags: ["TEST", "canal:whatsapp", `wa:57${celular.replace('+57', '')}`],
      note: "PEDIDO DE PRUEBA OT-06 - NO DESPACHAR",
      customAttributes: [
        { key: "wa_id", value: `57${celular.replace('+57', '')}` },
        { key: "conversacion_id", value: "prueba-ot-06" },
        { key: "prueba", value: "ot-06" }
      ],
      lineItems: [
        { variantId: variant.id, quantity: 1, priceSet: { shopMoney: { amount: "219900", currencyCode: "COP" } } }
      ],
      customer: {
        toUpsert: {
          firstName: process.env.PRUEBA_NOMBRE,
          lastName: process.env.PRUEBA_APELLIDO,
          phone: celular.startsWith('+57') ? celular : `+57${celular}`
        }
      },
      shippingAddress: {
        firstName: process.env.PRUEBA_NOMBRE,
        lastName: process.env.PRUEBA_APELLIDO,
        address1: process.env.PRUEBA_DIRECCION,
        address2: process.env.PRUEBA_BARRIO,
        city: process.env.PRUEBA_CIUDAD,
        provinceCode: process.env.PRUEBA_PROVINCE_CODE,
        countryCode: "CO",
        phone: celular.startsWith('+57') ? celular : `+57${celular}`
      },
      billingAddress: {
        firstName: process.env.PRUEBA_NOMBRE,
        lastName: process.env.PRUEBA_APELLIDO,
        address1: process.env.PRUEBA_DIRECCION,
        address2: process.env.PRUEBA_BARRIO,
        city: process.env.PRUEBA_CIUDAD,
        provinceCode: process.env.PRUEBA_PROVINCE_CODE,
        countryCode: "CO",
        phone: celular.startsWith('+57') ? celular : `+57${celular}`
      },
      transactions: [
        {
          kind: "SALE",
          status: "PENDING",
          gateway: "Pago contra entrega",
          amountSet: { shopMoney: { amount: "219900", currencyCode: "COP" } }
        }
      ]
    },
    options: {
      sendReceipt: false,
      sendFulfillmentReceipt: false
    }
  };

  const payloadForLog = JSON.parse(JSON.stringify(payload));
  payloadForLog.order.phone = mask(payloadForLog.order.phone);
  payloadForLog.order.shippingAddress.address1 = mask(payloadForLog.order.shippingAddress.address1);
  payloadForLog.order.shippingAddress.phone = mask(payloadForLog.order.shippingAddress.phone);
  payloadForLog.order.billingAddress.address1 = mask(payloadForLog.order.billingAddress.address1);
  payloadForLog.order.billingAddress.phone = mask(payloadForLog.order.billingAddress.phone);
  payloadForLog.order.customer.toUpsert.phone = mask(payloadForLog.order.customer.toUpsert.phone);

  if (!aplicar) {
    console.log("\nPayload a enviar (enmascarado):");
    console.dir(payloadForLog, { depth: null });
    console.log("\n[SIMULACIÓN] No se creó el pedido.");
  } else {
    const mutation = `
      mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
        orderCreate(order: $order, options: $options) {
          order { id name }
          userErrors { field message }
        }
      }
    `;
    const result = await req(mutation, payload);
    console.log("\nResultado de creación:");
    console.dir(result.orderCreate, { depth: null });
  }
}

run().catch(console.error);
