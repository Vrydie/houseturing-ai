
function normalizeCity(city) {
  if (!city) return '';
  return city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function validarEntrada(input) {
  if (input.confirmado_por_cliente !== true) return { ok: false, error: 'Pedido no confirmado explícitamente' };
  if (!input.datos_envio) return { ok: false, error: 'Faltan datos de envío' };
  
  const env = input.datos_envio;
  if (!env.celular || !/^3[0-9]{9}$/.test(env.celular.toString().trim())) return { ok: false, error: 'Celular inválido' };
  if (!env.direccion || env.direccion.trim().length < 5) return { ok: false, error: 'Dirección inválida' };
  if (!env.barrio || env.barrio.trim().length < 2) return { ok: false, error: 'Barrio inválido' };
  if (!env.ciudad || env.ciudad.trim().length < 2) return { ok: false, error: 'Ciudad inválida' };
  
  return { ok: true, env, cityNorm: normalizeCity(env.ciudad) };
}

function armarPayload(env, db, wa_id, conversacion_id, esPrueba) {
  const address2 = env.complemento ? env.barrio + ' - ' + env.complemento : env.barrio;
  const tags = ["canal:whatsapp", "wa:" + wa_id];
  if (esPrueba) tags.push("TEST");

  // Si la división no es exacta, fallamos.
  const price = Math.floor(db.precio_total / db.cantidad);
  if (price * db.cantidad !== parseFloat(db.precio_total)) {
    throw new Error("División de precio no es exacta");
  }

  return {
    query: "mutation CrearPedidoContraentrega($order: OrderCreateOrderInput!) { orderCreate(order: $order) { order { id name } userErrors { message } } }",
    variables: {
      order: {
        currency: "COP",
        financialStatus: "PENDING",
        phone: "+57" + env.celular.toString().trim(),
        shippingAddress: {
          firstName: env.nombre,
          lastName: env.apellido,
          address1: env.direccion,
          address2: address2,
          city: db.ciudad_oficial,
          provinceCode: db.shopify_province_code,
          countryCode: "CO",
          phone: "+57" + env.celular.toString().trim()
        },
        billingAddress: {
          firstName: env.nombre,
          lastName: env.apellido,
          address1: env.direccion,
          address2: address2,
          city: db.ciudad_oficial,
          provinceCode: db.shopify_province_code,
          countryCode: "CO",
          phone: "+57" + env.celular.toString().trim()
        },
        lineItems: [
          {
            variantId: db.shopify_variant_gid,
            quantity: db.cantidad,
            priceSet: { shopMoney: { amount: price.toString(), currencyCode: "COP" } }
          }
        ],
        transactions: [
          {
            kind: "SALE",
            status: "PENDING",
            gateway: "Pago contra entrega",
            amountSet: { shopMoney: { amount: db.precio_total.toString(), currencyCode: "COP" } }
          }
        ],
        tags: tags,
        customAttributes: [
          { key: "wa_id", value: wa_id },
          { key: "conversacion_id", value: conversacion_id ? conversacion_id.toString() : "" }
        ],
        options: { sendReceipt: false, sendFulfillmentReceipt: false }
      }
    }
  };
}

// Export for unit tests
if (typeof module !== 'undefined') {
  module.exports = { normalizeCity, validarEntrada, armarPayload };
}
