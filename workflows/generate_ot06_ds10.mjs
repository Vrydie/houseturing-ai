import fs from 'node:fs';

const workflow = {
  name: 'DS-10_Eventos_Shopify',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'shopify/events',
        responseMode: 'lastNode',
        options: {
          rawBody: true
        }
      },
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1.1,
      position: [0, 0],
      webhookId: 'ds-10-shopify-events'
    },
    {
      parameters: {
        action: 'hmac',
        type: 'SHA256',
        value: '={{ typeof $json.body === "string" ? $json.body : JSON.stringify($json.body) }}',
        dataPropertyName: 'hmac_calculated',
        secret: '={{ $env["SHOPIFY_API_SECRET"] }}',
        encoding: 'base64'
      },
      name: 'Crypto HMAC',
      type: 'n8n-nodes-base.crypto',
      typeVersion: 1,
      position: [200, 0]
    },
    {
      parameters: {
        conditions: {
          string: [
            {
              value1: '={{ $json.hmac_calculated }}',
              value2: '={{ $json.headers["x-shopify-hmac-sha256"] }}'
            }
          ]
        }
      },
      name: 'Validar HMAC',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [400, 0]
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '{"error": "Unauthorized"}',
        responseCode: 401
      },
      name: '401',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [600, 200]
    },
    {
      parameters: {
        respondWith: 'text',
        responseBody: 'OK',
        responseCode: 200
      },
      name: '200 OK temprano',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [600, -200]
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          INSERT INTO eventos_webhook (fuente, evento_id, topic)
          VALUES ('shopify', $1, $2)
          ON CONFLICT DO NOTHING
          RETURNING *;
        `,
        options: {
          queryParameters: '={{ [$json.headers["x-shopify-webhook-id"], $json.headers["x-shopify-topic"]] }}'
        }
      },
      name: 'Dedupe Postgres',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [800, 0],
      credentials: {
        postgres: {
          id: 'postgres_dropship',
          name: 'Postgres Dropship'
        }
      }
    },
    {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: '={{ $json.fuente ? true : false }}',
              value2: true
            }
          ]
        }
      },
      name: 'Es nuevo?',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [1000, 0]
    },
    {
      parameters: {
        dataType: 'string',
        value1: '={{ $(\'Webhook\').item.json.headers["x-shopify-topic"] }}',
        rules: {
          rules: [
            { operation: 'equal', value2: 'orders/create', output: 0 },
            { operation: 'equal', value2: 'orders/updated', output: 1 },
            { operation: 'equal', value2: 'orders/cancelled', output: 2 },
            { operation: 'startsWith', value2: 'fulfillments/', output: 3 },
            { operation: 'equal', value2: 'inventory_levels/update', output: 4 }
          ]
        }
      },
      name: 'Router de Tópicos',
      type: 'n8n-nodes-base.switch',
      typeVersion: 1,
      position: [1200, 0]
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          -- Lógica para orders/create (WIP)
          -- Actualizamos la orden si ya existe (por contraentrega), o intentamos mapear por WA
          UPDATE pedidos SET estado = 'creado' WHERE shopify_order_gid = 'gid://shopify/Order/' || $1;
        `,
        options: {
          queryParameters: '={{ [ $(\'Webhook\').item.json.body.id ] }}'
        }
      },
      name: 'Orders Create',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [1500, -200],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          UPDATE pedidos SET estado = 'cancelado' WHERE shopify_order_gid = 'gid://shopify/Order/' || $1;
        `,
        options: {
          queryParameters: '={{ [ $(\'Webhook\').item.json.body.id ] }}'
        }
      },
      name: 'Orders Cancelled',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [1500, 0],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          UPDATE pedidos 
          SET 
            estado = 'despachado', 
            transportadora = $1, 
            guia = $2, 
            url_rastreo = $3 
          WHERE shopify_order_gid = 'gid://shopify/Order/' || $4;
        `,
        options: {
          queryParameters: '={{ [ $(\'Webhook\').item.json.body.tracking_company, $(\'Webhook\').item.json.body.tracking_number, $(\'Webhook\').item.json.body.tracking_url, $(\'Webhook\').item.json.body.order_id ] }}'
        }
      },
      name: 'Fulfillments',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [1500, 200],
      credentials: { postgres: { id: 'postgres_dropship', name: 'Postgres Dropship' } }
    }
  ],
  connections: {
    'Webhook': {
      main: [
        [
          { node: 'Crypto HMAC', type: 'main', index: 0 },
          { node: '200 OK temprano', type: 'main', index: 0 }
        ]
      ]
    },
    'Crypto HMAC': {
      main: [
        [
          { node: 'Validar HMAC', type: 'main', index: 0 }
        ]
      ]
    },
    'Validar HMAC': {
      main: [
        [
          { node: 'Dedupe Postgres', type: 'main', index: 0 }
        ],
        [
          { node: '401', type: 'main', index: 0 }
        ]
      ]
    },
    'Dedupe Postgres': {
      main: [
        [
          { node: 'Es nuevo?', type: 'main', index: 0 }
        ]
      ]
    },
    'Es nuevo?': {
      main: [
        [
          { node: 'Router de Tópicos', type: 'main', index: 0 }
        ]
      ]
    },
    'Router de Tópicos': {
      main: [
        [
          { node: 'Orders Create', type: 'main', index: 0 }
        ],
        [],
        [
          { node: 'Orders Cancelled', type: 'main', index: 0 }
        ],
        [
          { node: 'Fulfillments', type: 'main', index: 0 }
        ]
      ]
    }
  },
  settings: {
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'none',
    errorWorkflow: 'DS-00_Manejador_Errores'
  }
};

fs.writeFileSync(new URL('./DS-10_Eventos_Shopify.json', import.meta.url), JSON.stringify(workflow, null, 2));
console.log('Generado DS-10_Eventos_Shopify.json');
