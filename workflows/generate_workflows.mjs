import fs from 'fs';
import { randomUUID } from 'crypto';

const stubWorkflow = {
  name: "DS-02 Agente (stub)",
  nodes: [
    {
      parameters: {},
      id: "trigger",
      name: "Execute Workflow Trigger",
      type: "n8n-nodes-base.executeWorkflowTrigger",
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {
        keepOnlySet: true,
        values: {
          string: [
            {
              name: "texto_respuesta",
              value: "Hola, recibimos tu mensaje: {{$json.texto}}"
            }
          ]
        },
        options: {}
      },
      id: "set",
      name: "Set Response",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [220, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": {
      "main": [
        [
          {
            "node": "Set Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
};

const consultarCoberturaWorkflow = {
  name: "DS-T1 consultar_cobertura",
  nodes: [
    {
      parameters: {},
      id: "trigger",
      name: "Execute Workflow Trigger",
      type: "n8n-nodes-base.executeWorkflowTrigger",
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT ciudad, departamento, acepta_contraentrega, dias_entrega_min, dias_entrega_max FROM cobertura WHERE ciudad_norm = unaccent(LOWER('{{ $json.ciudad }}'))" +
               "{{ $json.departamento ? ' AND departamento = ' + $json.departamento : '' }}"
      },
      id: "pg",
      name: "Postgres",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: {
        postgres: {
          id: "b1b2JJ18qDVF2dWp",
          name: "Postgres"
        }
      },
      position: [220, 0]
    },
    {
      parameters: {
        jsCode: "if ($input.all().length === 0) return [{ json: { cubierto: false } }];\nif ($input.all().length === 1) {\n  const row = $input.first().json;\n  return [{ json: { cubierto: true, ciudad_oficial: row.ciudad, acepta_contraentrega: row.acepta_contraentrega } }];\n}\nreturn [{ json: { opciones: $input.all().map(i => i.json) } }];"
      },
      id: "code",
      name: "Code",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [440, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": {
      "main": [ [ { "node": "Postgres", "type": "main", "index": 0 } ] ]
    },
    "Postgres": {
      "main": [ [ { "node": "Code", "type": "main", "index": 0 } ] ]
    }
  }
};

const enviarWhatsappWorkflow = {
  name: "DS-03 Enviar WhatsApp",
  nodes: [
    {
      parameters: {},
      id: "trigger",
      name: "Execute Workflow Trigger",
      type: "n8n-nodes-base.executeWorkflowTrigger",
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT valor FROM config WHERE clave = 'whatsapp_modo_simulado'"
      },
      id: "check_simulado",
      name: "Postgres Check Modo",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: {
        postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" }
      },
      position: [200, 0]
    },
    {
      parameters: {
        jsCode: "const wa_id = $('Execute Workflow Trigger').first().json.wa_id;\nconst texto = $('Execute Workflow Trigger').first().json.texto;\nreturn [{ json: { wa_id, texto, simulado: $input.first().json.valor === 'true' } }];"
      },
      id: "code",
      name: "Code",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "INSERT INTO mensajes (wamid, wa_id, direccion, tipo, texto) VALUES (gen_random_uuid()::text, '{{ $json.wa_id }}', 'out', 'text', '{{ $json.texto }}')"
      },
      id: "pg_insert",
      name: "Postgres Insert",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: {
        postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" }
      },
      position: [600, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": {
      "main": [ [ { "node": "Postgres Check Modo", "type": "main", "index": 0 } ] ]
    },
    "Postgres Check Modo": {
      "main": [ [ { "node": "Code", "type": "main", "index": 0 } ] ]
    },
    "Code": {
      "main": [ [ { "node": "Postgres Insert", "type": "main", "index": 0 } ] ]
    }
  }
};

const entradaWhatsappWorkflow = {
  name: "DS-01 Entrada WhatsApp",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "whatsapp",
        responseMode: "lastNode",
        options: { rawBody: true }
      },
      id: "webhook",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1.1,
      position: [0, 0],
      webhookId: "whatsapp-in"
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "{\"status\":\"ok\"}",
        options: {}
      },
      id: "respond200",
      name: "Respond 200",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [200, -100]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT valor FROM config WHERE clave = 'whatsapp_app_secret_prueba'"
      },
      id: "get_secret",
      name: "Get Secret",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [200, 100]
    },
    {
      parameters: {
        action: "hmac",
        type: "SHA256",
        value: "={{ JSON.stringify($('Webhook').first().json.body) }}",
        dataPropertyName: "hmac",
        secret: "={{ $json.valor }}"
      },
      id: "crypto",
      name: "Crypto",
      type: "n8n-nodes-base.crypto",
      typeVersion: 1,
      position: [400, 100]
    },
    {
      parameters: {
        jsCode: "const sig = $('Webhook').first().json.headers['x-hub-signature-256'];\nif (sig !== 'sha256=' + $json.hmac) throw new Error('Invalid signature. sig=' + sig + ' | expected=sha256=' + $json.hmac);\nreturn [{json: $('Webhook').first().json.body}];"
      },
      id: "verify",
      name: "Verify Signature",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 100]
    },
    {
      parameters: {
        jsCode: "const entry = $json.entry[0].changes[0].value;\nif (entry.messages) return [{json: entry}];\nreturn [];"
      },
      id: "router",
      name: "Router",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [800, 100]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "INSERT INTO mensajes (wamid, wa_id, direccion, tipo) VALUES ('{{ $json.messages[0].id }}', '{{ $json.contacts[0].wa_id }}', 'in', 'text') ON CONFLICT DO NOTHING RETURNING wamid"
      },
      id: "dedupe",
      name: "Dedupe Postgres",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [1000, 200]
    },
    {
      parameters: {
        workflowId: "DS-02 Agente (stub)",
        options: {}
      },
      id: "call_stub",
      name: "Call Stub",
      type: "n8n-nodes-base.executeWorkflow",
      typeVersion: 1,
      position: [1200, 200]
    },
    {
      parameters: {
        workflowId: "DS-03 Enviar WhatsApp",
        options: {}
      },
      id: "call_send",
      name: "Call Send",
      type: "n8n-nodes-base.executeWorkflow",
      typeVersion: 1,
      position: [1400, 200]
    }
  ],
  connections: {
    "Webhook": {
      "main": [ [ { "node": "Get Secret", "type": "main", "index": 0 }, { "node": "Respond 200", "type": "main", "index": 0 } ] ]
    },
    "Get Secret": {
      "main": [ [ { "node": "Crypto", "type": "main", "index": 0 } ] ]
    },
    "Crypto": {
      "main": [ [ { "node": "Verify Signature", "type": "main", "index": 0 } ] ]
    },
    "Verify Signature": {
      "main": [ [ { "node": "Router", "type": "main", "index": 0 } ] ]
    },
    "Router": {
      "main": [ [ { "node": "Dedupe Postgres", "type": "main", "index": 0 } ] ]
    },
    "Dedupe Postgres": {
      "main": [ [ { "node": "Call Stub", "type": "main", "index": 0 } ] ]
    },
    "Call Stub": {
      "main": [ [ { "node": "Call Send", "type": "main", "index": 0 } ] ]
    }
  }
};

stubWorkflow.id = randomUUID();
consultarCoberturaWorkflow.id = randomUUID();
enviarWhatsappWorkflow.id = randomUUID();
entradaWhatsappWorkflow.id = randomUUID();

const callStubNode = entradaWhatsappWorkflow.nodes.find(n => n.name === "Call Stub");
if (callStubNode) callStubNode.parameters.workflowId = stubWorkflow.id;

const callSendNode = entradaWhatsappWorkflow.nodes.find(n => n.name === "Call Send");
if (callSendNode) callSendNode.parameters.workflowId = enviarWhatsappWorkflow.id;

fs.writeFileSync('DS-02_stub.json', JSON.stringify(stubWorkflow, null, 2));
fs.writeFileSync('DS-T1_consultar_cobertura.json', JSON.stringify(consultarCoberturaWorkflow, null, 2));
fs.writeFileSync('DS-03_Enviar_WhatsApp.json', JSON.stringify(enviarWhatsappWorkflow, null, 2));
fs.writeFileSync('DS-01_Entrada_WhatsApp.json', JSON.stringify(entradaWhatsappWorkflow, null, 2));
console.log('Workflows generated.');
