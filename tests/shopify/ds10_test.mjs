import fs from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';

// 1. Resetear base de datos para la prueba
const sql = `
  DELETE FROM eventos_webhook WHERE evento_id IN ('test-evt-1', 'test-evt-2', 'test-evt-3');
  DELETE FROM pedidos WHERE shopify_order_gid = 'gid://shopify/Order/777';
  INSERT INTO pedidos (wa_id, modalidad, total, moneda, datos_envio, shopify_order_gid, estado) 
  VALUES ('573000000000', 'contraentrega', 10000, 'COP', '{}', 'gid://shopify/Order/777', 'creado');
`;
spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'psql', '-U', 'dropship', '-d', 'dropship'], { input: sql });

// 2. Importar workflow DS-10
const ds10Json = fs.readFileSync(new URL('../../workflows/DS-10_Eventos_Shopify.json', import.meta.url), 'utf8');
const w = JSON.parse(ds10Json);
w.id = 'ds10-test';

// Cambiar el Webhook node a un Manual Trigger que reciba el mock
w.nodes[0] = {
  id: 'start',
  name: 'Webhook',
  type: 'n8n-nodes-base.manualTrigger',
  typeVersion: 1,
  position: [0, 0],
  parameters: {}
};

// Insertar un Code node para inyectar el payload en vez de que venga de HTTP
w.nodes.push({
  id: 'mock',
  name: 'Mock Payload',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [100, 0],
  parameters: {
    jsCode: `
      return [
        {
          json: {
            headers: {
              "x-shopify-webhook-id": "test-evt-1",
              "x-shopify-topic": "orders/create",
              "x-shopify-hmac-sha256": "mock-hmac"
            },
            body: { id: "777" }
          }
        },
        {
          json: {
            headers: {
              "x-shopify-webhook-id": "test-evt-2",
              "x-shopify-topic": "fulfillments/create",
              "x-shopify-hmac-sha256": "mock-hmac"
            },
            body: {
              order_id: "777",
              tracking_company: "Servientrega",
              tracking_number: "GUIA123",
              tracking_url: "https://rastreo"
            }
          }
        }
      ];
    `
  }
});

// Remove HMAC validation nodes for testing, or bypass them
const hmacNodeIndex = w.nodes.findIndex(n => n.name === 'Validar HMAC');
w.nodes[hmacNodeIndex].parameters.conditions.string[0].value1 = 'mock-hmac'; // bypass
w.nodes[hmacNodeIndex].parameters.conditions.string[0].value2 = 'mock-hmac';

w.connections['Webhook'] = { main: [[{ node: 'Mock Payload', type: 'main', index: 0 }]] };
w.connections['Mock Payload'] = { main: [[{ node: 'Dedupe Postgres', type: 'main', index: 0 }, { node: '200 OK temprano', type: 'main', index: 0 }]] };

spawnSync('docker', ['exec', '-i', 'houseturing_n8n', 'n8n', 'import:workflow', '--input=/dev/stdin'], { input: JSON.stringify([w]) });

console.log('Ejecutando DS-10 test...');

const child = spawnSync('docker', [
  'exec', '-i',
  '-e', 'SHOPIFY_API_SECRET=secret',
  '-e', 'N8N_RUNNERS_BROKER_PORT=5682',
  '-e', 'N8N_BLOCK_ENV_ACCESS_IN_NODE=false',
  'houseturing_n8n', 'n8n', 'execute', '--id=' + w.id, '--rawOutput'
]);

console.log('n8n execute completado');
console.log('STDOUT:', child.stdout.toString());
console.log('STDERR:', child.stderr.toString());

// Verificar BD
const sqlCheck = "SELECT estado, transportadora, guia FROM pedidos WHERE shopify_order_gid = 'gid://shopify/Order/777'";
const checkRun = spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'psql', '-U', 'dropship', '-d', 'dropship', '-t', '-c', sqlCheck], { encoding: 'utf8' });

const dbOut = checkRun.stdout.trim();
console.log('DB State:', dbOut);

if (dbOut.includes('despachado') && dbOut.includes('Servientrega') && dbOut.includes('GUIA123')) {
  console.log('✅ TEST PASSED: DS-10 procesó fulfillment');
  process.exit(0);
} else {
  console.error('❌ TEST FAILED: DS-10 no procesó fulfillment', dbOut);
  process.exit(1);
}
