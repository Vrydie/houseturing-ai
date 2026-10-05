import fs from 'node:fs';

const pureFunctions = `
function normalizeCity(city) {
  if (!city) return '';
  return city.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
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
`;

fs.writeFileSync(new URL('./dst2_logic.js', import.meta.url), pureFunctions);

const codeNode1 = `
const logic = {
${pureFunctions.replace(/if \(typeof module[\s\S]*/, '')}
};
const input = $input.first().json;
const val = logic.validarEntrada(input);
if (!val.ok) {
  return [{ json: { ok: false, error: val.error, action: 'end' } }];
}
const wa_id = input.wa_id || input.sessionId; // depending on how DS-02 passes it
const conversacion_id = input.conversacion_id;
return [{ json: { ok: true, input: val.env, cityNorm: val.cityNorm, wa_id, conversacion_id, oferta_id: input.oferta_id } }];
`;

const codeNode2 = `
const logic = {
${pureFunctions.replace(/if \(typeof module[\s\S]*/, '')}
};
const data = $input.first().json;
if (!data.ok) return [{ json: data }];

const db = data.db; // From Postgres node
if (db.pedido_id_existente) {
  return [{ json: { ok: true, action: 'end_idempotent', numero_pedido: db.shopify_order_name || ('SIM-' + db.pedido_id_existente), total: db.precio_total, moneda: 'COP', dias_entrega: db.dias_entrega_min + ' a ' + db.dias_entrega_max + ' días hábiles' } }];
}
if (!db.disponible) return [{ json: { ok: false, action: 'end', error: 'sin stock' } }];
if (!db.acepta_contraentrega) return [{ json: { ok: false, action: 'end', error: 'ciudad sin cobertura' } }];

const esPrueba = db.modo_pedidos === 'prueba' || db.modo_pedidos === 'simulado';
let payload;
try {
  payload = logic.armarPayload(data.input, db, data.wa_id, data.conversacion_id, esPrueba);
} catch(e) {
  return [{ json: { ok: false, action: 'end', error: 'Error interno: ' + e.message } }];
}

return [{ json: { ok: true, action: db.modo_pedidos, payload, db, input: data.input, wa_id: data.wa_id, conversacion_id: data.conversacion_id, oferta_id: data.oferta_id } }];
`;

const workflow = {
  id: 'ds-t2-crear-pedido-uuid',
  name: 'DS-T2 crear_pedido_contraentrega',
  nodes: [
    {
      parameters: {},
      name: 'Execute Workflow Trigger',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: { jsCode: codeNode1 },
      name: 'Validar Entrada',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [200, 0]
    },
    {
      parameters: {
        conditions: { boolean: [{ value1: '={{ $json.ok }}', value2: true }] }
      },
      name: 'Check Valid?',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [400, 0]
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          WITH cfg AS (
            SELECT 
              (SELECT valor FROM config WHERE clave = 'modo_pedidos') AS modo_pedidos,
              (SELECT valor FROM config WHERE clave = 'shopify_access_token') AS shopify_access_token,
              (SELECT valor FROM config WHERE clave = 'shopify_gateway_contraentrega') AS gateway
          ),
          oferta AS (SELECT precio_total, cantidad, sku FROM ofertas WHERE id = $1),
          prod AS (SELECT disponible, shopify_variant_gid FROM productos WHERE sku = (SELECT sku FROM oferta)),
          idem AS (SELECT id AS pedido_id, shopify_order_name FROM pedidos WHERE wa_id = $2 AND oferta_id = $1 AND estado = 'creado' AND creado_en > NOW() - INTERVAL '2 HOURS' LIMIT 1),
          cob AS (SELECT shopify_province_code, acepta_contraentrega, ciudad_oficial, dias_entrega_min, dias_entrega_max FROM cobertura WHERE ciudad_norm = $3 LIMIT 1)
          SELECT 
            cfg.*, oferta.*, prod.*, idem.pedido_id AS pedido_id_existente, idem.shopify_order_name, cob.* 
          FROM cfg
          LEFT JOIN oferta ON true
          LEFT JOIN prod ON true
          LEFT JOIN idem ON true
          LEFT JOIN cob ON true;
        `,
        queryParameters: '={{ $json.oferta_id }}, {{ $json.wa_id }}, {{ $json.cityNorm }}'
      },
      name: 'DB Fetch',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [600, -100],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: { jsCode: `const json = $input.first().json; return [{json: { ...$('Validar Entrada').first().json, db: json }}];` },
      name: 'Merge DB and Input',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [800, -100]
    },
    {
      parameters: { jsCode: codeNode2 },
      name: 'Construir Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1000, -100]
    },
    {
      parameters: {
        dataType: 'string',
        value1: '={{ $json.action }}',
        rules: {
          rules: [
            { value2: 'simulado', output: 0 },
            { value2: 'prueba', output: 1 },
            { value2: 'real', output: 1 },
            { value2: 'end', output: 2 },
            { value2: 'end_idempotent', output: 2 }
          ]
        },
        fallbackOutput: 2
      },
      name: 'Switch Modo',
      type: 'n8n-nodes-base.switch',
      typeVersion: 1,
      position: [1200, -100]
    },
    // Output 0: simulado
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          INSERT INTO pedidos (conversacion_id, wa_id, modalidad, oferta_id, total, moneda, datos_envio, es_prueba, shopify_order_name)
          VALUES ($1, $2, 'contraentrega', $3, $4, 'COP', $5::jsonb, true, 'SIM-PENDING')
          RETURNING id;
        `,
        queryParameters: '={{ $json.conversacion_id }}, {{ $json.wa_id }}, {{ $json.oferta_id }}, {{ $json.db.precio_total }}, {{ JSON.stringify($json.input) }}'
      },
      name: 'DB Insert Simulado',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [1400, -300],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `UPDATE pedidos SET shopify_order_name = 'SIM-' || id WHERE id = $1 RETURNING id, shopify_order_name;`,
        queryParameters: '={{ $json.id }}'
      },
      name: 'DB Update Simulado Name',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [1600, -300],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: {
        jsCode: `
        const data = $('Construir Payload').first().json;
        const dbId = $json.shopify_order_name;
        return [{ json: { ok: true, numero_pedido: dbId, total: data.db.precio_total, moneda: 'COP', dias_entrega: data.db.dias_entrega_min + ' a ' + data.db.dias_entrega_max + ' días hábiles' } }];
        `
      },
      name: 'Result Simulado',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1800, -300]
    },
    // Output 1: prueba / real (HTTP Request to Shopify)
    {
      parameters: {
        method: 'POST',
        url: '={{ "https://" + $env["SHOPIFY_STORE_DOMAIN"] + "/admin/api/2026-07/graphql.json" }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'X-Shopify-Access-Token', value: '={{ $json.db.shopify_access_token }}' },
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: 'query', value: '={{ $json.payload.query }}' },
            { name: 'variables', value: '={{ JSON.stringify($json.payload.variables) }}' }
          ]
        }
      },
      name: 'Shopify API',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [1400, -100]
    },
    {
      parameters: {
        jsCode: `
        const res = $input.first().json;
        const orderData = res.data?.orderCreate;
        if (orderData?.userErrors && orderData.userErrors.length > 0) {
          return [{ json: { ok: false, error: 'Shopify error: ' + orderData.userErrors.map(e => e.message).join(', ') } }];
        }
        if (!orderData?.order?.id) {
          return [{ json: { ok: false, error: 'Shopify API no retornó ID' } }];
        }
        return [{ json: { ok: true, shopify_order_gid: orderData.order.id, shopify_order_name: orderData.order.name } }];
        `
      },
      name: 'Parse Shopify Res',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1600, -100]
    },
    {
      parameters: {
        conditions: { boolean: [{ value1: '={{ $json.ok }}', value2: true }] }
      },
      name: 'Shopify OK?',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [1800, -100]
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          INSERT INTO pedidos (conversacion_id, wa_id, modalidad, oferta_id, total, moneda, datos_envio, es_prueba, shopify_order_gid, shopify_order_name)
          VALUES ($1, $2, 'contraentrega', $3, $4, 'COP', $5::jsonb, $6, $7, $8)
          RETURNING id;
        `,
        queryParameters: '={{ $(\'Construir Payload\').first().json.conversacion_id }}, {{ $(\'Construir Payload\').first().json.wa_id }}, {{ $(\'Construir Payload\').first().json.oferta_id }}, {{ $(\'Construir Payload\').first().json.db.precio_total }}, {{ JSON.stringify($(\'Construir Payload\').first().json.input) }}, {{ $(\'Construir Payload\').first().json.action === \'prueba\' }}, {{ $json.shopify_order_gid }}, {{ $json.shopify_order_name }}'
      },
      name: 'DB Insert Real',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [2000, -100],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: {
        jsCode: `
        const data = $('Construir Payload').first().json;
        const shopifyRes = $('Parse Shopify Res').first().json;
        return [{ json: { ok: true, numero_pedido: shopifyRes.shopify_order_name, total: data.db.precio_total, moneda: 'COP', dias_entrega: data.db.dias_entrega_min + ' a ' + data.db.dias_entrega_max + ' días hábiles' } }];
        `
      },
      name: 'Result Real',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2200, -100]
    }
  ],
  connections: {
    'Execute Workflow Trigger': {
      main: [[{ node: 'Validar Entrada', type: 'main', index: 0 }]]
    },
    'Validar Entrada': {
      main: [[{ node: 'Check Valid?', type: 'main', index: 0 }]]
    },
    'Check Valid?': {
      main: [
        [{ node: 'DB Fetch', type: 'main', index: 0 }],
        []
      ]
    },
    'DB Fetch': {
      main: [[{ node: 'Merge DB and Input', type: 'main', index: 0 }]]
    },
    'Merge DB and Input': {
      main: [[{ node: 'Construir Payload', type: 'main', index: 0 }]]
    },
    'Construir Payload': {
      main: [[{ node: 'Switch Modo', type: 'main', index: 0 }]]
    },
    'Switch Modo': {
      main: [
        [{ node: 'DB Insert Simulado', type: 'main', index: 0 }],
        [{ node: 'Shopify API', type: 'main', index: 0 }],
        []
      ]
    },
    'DB Insert Simulado': {
      main: [[{ node: 'DB Update Simulado Name', type: 'main', index: 0 }]]
    },
    'DB Update Simulado Name': {
      main: [[{ node: 'Result Simulado', type: 'main', index: 0 }]]
    },
    'Shopify API': {
      main: [[{ node: 'Parse Shopify Res', type: 'main', index: 0 }]]
    },
    'Parse Shopify Res': {
      main: [[{ node: 'Shopify OK?', type: 'main', index: 0 }]]
    },
    'Shopify OK?': {
      main: [
        [{ node: 'DB Insert Real', type: 'main', index: 0 }],
        []
      ]
    },
    'DB Insert Real': {
      main: [[{ node: 'Result Real', type: 'main', index: 0 }]]
    }
  },
  settings: {
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'none',
    errorWorkflow: 'DS-00_Manejador_Errores'
  }
};

fs.writeFileSync(new URL('./DS-T2_crear_pedido_contraentrega.json', import.meta.url), JSON.stringify(workflow, null, 2));
console.log('Generado DS-T2_crear_pedido_contraentrega.json');
