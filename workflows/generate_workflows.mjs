import fs from 'fs';
import { randomUUID } from 'crypto';

// R7: Consultar Cobertura (JS Normalization + Safe Query)
const consultarCoberturaWorkflow = {
  id: "c6918d23-a831-42b2-b67a-493b9b1c07cf",
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
        jsCode: `
const input = $input.first().json;
const normalize = (str) => {
  if (!str) return null;
  return str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
};
return [{ json: {
  ciudad_norm: normalize(input.ciudad),
  departamento_norm: normalize(input.departamento)
}}];
        `
      },
      id: "code_normalize",
      name: "Normalizar Ciudad",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [200, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT ciudad, departamento, acepta_contraentrega, dias_entrega_min, dias_entrega_max FROM cobertura WHERE ciudad_norm = $1",
        options: {
          queryReplacement: "={{ [$json.ciudad_norm] }}"
        }
      },
      id: "pg",
      name: "Postgres Cobertura",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [400, 0]
    },
    {
      parameters: {
        jsCode: `
const items = $input.all().map(i => i.json);
if (items.length === 0) return [{ json: { cubierto: false } }];
if (items.length === 1) {
  const row = items[0];
  const dias = row.dias_entrega_min === row.dias_entrega_max 
    ? row.dias_entrega_min + " días hábiles"
    : row.dias_entrega_min + " a " + row.dias_entrega_max + " días hábiles";
  
  return [{ json: { 
    cubierto: true, 
    ciudad_oficial: row.ciudad, 
    departamento_oficial: row.departamento,
    acepta_contraentrega: row.acepta_contraentrega,
    dias_entrega: dias
  } }];
}
return [{ json: { opciones: items } }];
        `
      },
      id: "code_format",
      name: "Code Format",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Normalizar Ciudad", type: "main", index: 0 } ] ] },
    "Normalizar Ciudad": { main: [ [ { node: "Postgres Cobertura", type: "main", index: 0 } ] ] },
    "Postgres Cobertura": { main: [ [ { node: "Code Format", type: "main", index: 0 } ] ] }
  }
};

// DS-02: Agente de Ventas
const stubWorkflow = {
  id: "ae42ab9a-9d5c-40fb-b18b-b8626c78b51b",
  name: "DS-02 Agente de Ventas",
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
        jsCode: `
const wa_id = $('Execute Workflow Trigger').first().json.wa_id;
return [{ json: { wa_id } }];
        `
      },
      id: "code_count",
      name: "Get wa_id",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [150, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT COUNT(*) as turnos FROM mensajes WHERE wa_id = $1",
        options: { queryReplacement: "={{ [$json.wa_id] }}" }
      },
      id: "pg_count",
      name: "Count Turns",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [300, 0]
    },
    {
      parameters: {
        conditions: {
          number: [
            {
              value1: "={{ $json.turnos }}",
              operation: "larger",
              value2: 60
            }
          ]
        }
      },
      id: "if_limite",
      name: "IF > 60 Turnos",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [500, 0]
    },
    {
      parameters: {
        jsCode: "return [{ json: { texto: 'Escalado por límite de turnos', bot_activo: false } }];"
      },
      id: "code_escalar",
      name: "Escalar a Humano",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [700, -200]
    },
    {
      parameters: {
        jsCode: `
const wa_id = $('Execute Workflow Trigger').first().json.wa_id;
const texto = $('Execute Workflow Trigger').first().json.texto;
return [{ json: { sessionId: wa_id, chatInput: texto } }];
        `
      },
      id: "code_format",
      name: "Format Agent Input",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 100]
    },
    {
      parameters: {
        promptType: "define",
        text: "={{ $('Execute Workflow Trigger').first().json.texto }}",
        options: {
          systemMessage: "Eres un asesor de ventas de una tienda virtual."
        }
      },
      id: "agent",
      name: "AI Agent",
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 1.6,
      position: [800, 100],
      retryOnFail: true,
      maxTries: 5,
      waitBetweenTries: 5000
    },
    {
      parameters: {
        modelName: "models/gemini-3.8-flash",
        options: {}
      },
      id: "llm",
      name: "Google Gemini Chat Model",
      type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      typeVersion: 1,
      position: [800, 300],
      credentials: {
        googlePalmApi: {
          id: "VFVMXHhgUKNRkFnE",
          name: "Google Gemini(PaLM) Api account"
        }
      }
    },
    {
      parameters: {
        windowSize: 20,
        sessionKey: "={{ $('Execute Workflow Trigger').first().json.wa_id }}"
      },
      id: "memory",
      name: "Postgres Chat Memory",
      type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
      typeVersion: 1.2,
      position: [950, 300],
      credentials: {
        postgres: {
          id: "b1b2JJ18qDVF2dWp",
          name: "Postgres"
        }
      }
    },
    {
      parameters: {
        workflowId: "c6918d23-a831-42b2-b67a-493b9b1c07cf",
        name: "consultar_cobertura",
        description: "Llama a esta herramienta para consultar si hay envíos a una ciudad específica."
      },
      id: "tool_cobertura",
      name: "Call Workflow Tool",
      type: "@n8n/n8n-nodes-langchain.toolWorkflow",
      typeVersion: 1.1,
      position: [1000, 300]
    },
    {
      parameters: {
        jsCode: `
const output = $input.first().json.output || "";
const prohibidas = ["soy una ia", "soy un modelo", "openai", "precio de 10000"];
const isBlocked = prohibidas.some(p => output.toLowerCase().includes(p));

return [{
  json: {
    wa_id: $('Execute Workflow Trigger').first().json.wa_id,
    texto: isBlocked ? "Hubo un error de estilo. Regenerando..." : output
  }
}];
        `
      },
      id: "code_filter",
      name: "Filtro de Estilo",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1200, 100]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Get wa_id", type: "main", index: 0 } ] ] },
    "Get wa_id": { main: [ [ { node: "Count Turns", type: "main", index: 0 } ] ] },
    "Count Turns": { main: [ [ { node: "IF > 60 Turnos", type: "main", index: 0 } ] ] },
    "IF > 60 Turnos": {
      main: [
        [ { node: "Escalar a Humano", type: "main", index: 0 } ],
        [ { node: "Format Agent Input", type: "main", index: 0 } ]
      ]
    },
    "Format Agent Input": { main: [ [ { node: "AI Agent", type: "main", index: 0 } ] ] },
    "AI Agent": { main: [ [ { node: "Filtro de Estilo", type: "main", index: 0 } ] ] },
    "Google Gemini Chat Model": { ai_languageModel: [ [ { node: "AI Agent", type: "ai_languageModel", index: 0 } ] ] },
    "Postgres Chat Memory": { ai_memory: [ [ { node: "AI Agent", type: "ai_memory", index: 0 } ] ] },
    "Call Workflow Tool": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] }
  }
};

// DS-03: Enviar WhatsApp (Simulado + Burbujas)
const enviarWhatsappWorkflow = {
  id: "a0c7abce-0081-4c80-aa6a-72f4200ec489",
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
      id: "pg_simulado",
      name: "Check Simulado",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [200, 0]
    },
    {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: "={{ $json.valor === 'true' }}",
              value2: true
            }
          ]
        }
      },
      id: "if_simulado",
      name: "IF Simulado",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [400, 0]
    },
    // RAMA TRUE: Simulado
    {
      parameters: {
        operation: "executeQuery",
        query: "INSERT INTO mensajes (wamid, wa_id, direccion, tipo, texto) VALUES (gen_random_uuid()::text, $1, 'out', 'text', $2)",
        options: {
          queryReplacement: "{{ $('Execute Workflow Trigger').first().json.wa_id }},{{ $('Execute Workflow Trigger').first().json.texto }}"
        }
      },
      id: "pg_insert_simulado",
      name: "Insert Simulado",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [600, -100]
    },
    // RAMA FALSE: Real (Split + Typing + Send)
    {
      parameters: {
        jsCode: `
const wa_id = $('Execute Workflow Trigger').first().json.wa_id;
const texto = $('Execute Workflow Trigger').first().json.texto;
const wamid_resp = $('Execute Workflow Trigger').first().json.responder_a_wamid;
const partes = texto.split('\\n\\n').filter(p => p.trim() !== '').slice(0,3);
return partes.map(p => ({ json: { wa_id, texto: p, wamid_resp } }));
        `
      },
      id: "code_split",
      name: "Split Burbujas",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 100]
    },
    {
      parameters: {
        jsCode: `
// Mock for typing / sleep in n8n code node using a loop or we use Wait node
// Wait node is better for non-blocking sleep.
const waitTime = Math.min(7, Math.max(1.5, 0.5 + ($json.texto.length * 0.035)));
return [{ json: { ...$json, waitTime } }];
        `
      },
      id: "code_timing",
      name: "Calc Timing",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [800, 100]
    },
    {
      parameters: {
        amount: "={{ $json.waitTime }}",
        unit: "seconds"
      },
      id: "wait",
      name: "Wait Typing",
      type: "n8n-nodes-base.wait",
      typeVersion: 1,
      webhookId: "wait-webhook",
      position: [1000, 100]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "INSERT INTO mensajes (wamid, wa_id, direccion, tipo, texto) VALUES (gen_random_uuid()::text, $1, 'out', 'text', $2)",
        options: {
          queryReplacement: "{{ $json.wa_id }},{{ $json.texto }}"
        }
      },
      id: "pg_insert_real",
      name: "Insert Real",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [1200, 100]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Check Simulado", type: "main", index: 0 } ] ] },
    "Check Simulado": { main: [ [ { node: "IF Simulado", type: "main", index: 0 } ] ] },
    "IF Simulado": {
      main: [
        [ { node: "Insert Simulado", type: "main", index: 0 } ],
        [ { node: "Split Burbujas", type: "main", index: 0 } ]
      ]
    },
    "Split Burbujas": { main: [ [ { node: "Calc Timing", type: "main", index: 0 } ] ] },
    "Calc Timing": { main: [ [ { node: "Wait Typing", type: "main", index: 0 } ] ] },
    "Wait Typing": { main: [ [ { node: "Insert Real", type: "main", index: 0 } ] ] }
  }
};

// DS-01: Entrada WhatsApp
const entradaWhatsappWorkflow = {
  id: "8c5216d4-f62a-47c8-8658-96164bebdf4b",
  name: "DS-01 Entrada WhatsApp",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "whatsapp",
        responseMode: "responseNode",
        options: { rawBody: true }
      },
      id: "webhook_post",
      name: "Webhook POST",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1.1,
      position: [0, 0],
      webhookId: "whatsapp-in-post"
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
      position: [200, -200]
    },
    {
      parameters: {
        httpMethod: "GET",
        path: "whatsapp",
        responseMode: "lastNode",
        options: {}
      },
      id: "webhook_get",
      name: "Webhook GET",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1.1,
      position: [0, -400],
      webhookId: "whatsapp-in-get"
    },
    {
      parameters: {
        jsCode: `
const q = $input.first().json.query || {};
if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === 'mi_token_secreto_123') {
  return [{ json: { "hub.challenge": q['hub.challenge'] } }];
}
throw new Error("Invalid GET");
        `
      },
      id: "code_get_verify",
      name: "Verify GET",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [200, -400]
    },
    // Auth and HMAC for POST
    {
      parameters: {
        jsCode: `
// Try to get from credentials or config
// R9: n8n uses credentials for secrets in prod, config table for dev.
return [{ json: { secret: 'secret_local_test_12345' } }]; // Match enviar.ps1 for testing
        `
      },
      id: "get_secret",
      name: "Get Secret (Mock)",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [200, 0]
    },
    {
      parameters: {
        jsCode: `
const crypto = require('crypto');
const secret = $json.secret;
const sigHeader = $('Webhook POST').first().json.headers['x-hub-signature-256'] || '';
const binaryData = $('Webhook POST').first().binary.data;

if (!binaryData) throw new Error("No raw body found");

const rawBuffer = Buffer.from(binaryData.data, 'base64');
const hmac = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');
const expectedSig = 'sha256=' + hmac;

if (sigHeader !== expectedSig) {
  // Use timingSafeEqual in a real app, here we just do string compare for simplicity, or we can use timingSafeEqual if lengths match
  if (sigHeader.length !== expectedSig.length) throw new Error('Invalid signature length');
  if (!crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expectedSig))) {
    throw new Error('Invalid signature');
  }
}

return [{ json: $('Webhook POST').first().json.body }];
        `
      },
      id: "code_auth",
      name: "Auth/Parse POST",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 0]
    },
    {
      parameters: {
        jsCode: `
const entry = $json.entry[0].changes[0].value;
if (entry.statuses) return [{ json: { type: 'status', data: entry.statuses[0] } }];
if (entry.messages) return [{ json: { type: 'message', data: entry.messages[0], contact: entry.contacts[0] } }];
return [];
        `
      },
      id: "code_router",
      name: "Router",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 0]
    },
    {
      parameters: {
        conditions: { string: [ { value1: "={{ $json.type }}", value2: "status" } ] }
      },
      id: "if_status",
      name: "IF Status",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [800, 0]
    },
    // TRUE -> Status update
    {
      parameters: {
        operation: "executeQuery",
        query: "UPDATE mensajes SET estado = $1 WHERE wamid = $2",
        options: { queryReplacement: "{{ $json.data.status }},{{ $json.data.id }}" }
      },
      id: "pg_status",
      name: "Update Status",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [1000, -100]
    },
    // FALSE -> Message Insert (Dedupe)
    {
      parameters: {
        operation: "executeQuery",
        query: "INSERT INTO mensajes (wamid, wa_id, direccion, tipo, texto) VALUES ($1, $2, 'in', $3, $4) ON CONFLICT (wamid) DO NOTHING RETURNING wamid",
        options: { 
          queryReplacement: "{{ $json.data.id }},{{ $json.contact.wa_id }},{{ $json.data.type }},{{ $json.data.text ? $json.data.text.body : '' }}" 
        }
      },
      id: "pg_dedupe",
      name: "Dedupe Postgres",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [1000, 100]
    },
    {
      parameters: {
        conditions: {
          boolean: [ { value1: "={{ $json.wamid ? true : false }}", value2: true } ]
        }
      },
      id: "if_dedupe",
      name: "IF Inserted",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [1200, 100]
    },
    {
      parameters: {
        jsCode: `
const msg = $('Router').first().json.data;
const contact = $('Router').first().json.contact;
return [{
  json: {
    wa_id: contact.wa_id,
    nombre_perfil: contact.profile.name,
    conversacion_id: 1,
    wamids: [msg.id],
    texto: msg.text ? msg.text.body : '',
    tipos: [msg.type],
    recibido_en: new Date().toISOString()
  }
}];
        `
      },
      id: "code_normalize_msg",
      name: "Normalize Message",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1400, 100]
    },
    {
      parameters: {
        workflowId: "DS-02 Agente (stub)",
      },
      id: "call_stub",
      name: "Call Stub",
      type: "n8n-nodes-base.executeWorkflow",
      typeVersion: 1,
      position: [1600, 100]
    },
    {
      parameters: {
        workflowId: "DS-03 Enviar WhatsApp",
      },
      id: "call_send",
      name: "Call Send",
      type: "n8n-nodes-base.executeWorkflow",
      typeVersion: 1,
      position: [1800, 100]
    }
  ],
  connections: {
    "Webhook POST": {
      main: [ [ { node: "Respond 200", type: "main", index: 0 }, { node: "Get Secret (Mock)", type: "main", index: 0 } ] ]
    },
    "Webhook GET": {
      main: [ [ { node: "Verify GET", type: "main", index: 0 } ] ]
    },
    "Get Secret (Mock)": {
      main: [ [ { node: "Auth/Parse POST", type: "main", index: 0 } ] ]
    },
    "Auth/Parse POST": {
      main: [ [ { node: "Router", type: "main", index: 0 } ] ]
    },
    "Router": {
      main: [ [ { node: "IF Status", type: "main", index: 0 } ] ]
    },
    "IF Status": {
      main: [
        [ { node: "Update Status", type: "main", index: 0 } ],
        [ { node: "Dedupe Postgres", type: "main", index: 0 } ]
      ]
    },
    "Dedupe Postgres": {
      main: [ [ { node: "IF Inserted", type: "main", index: 0 } ] ]
    },
    "IF Inserted": {
      main: [ [ { node: "Normalize Message", type: "main", index: 0 } ] ]
    },
    "Normalize Message": {
      main: [ [ { node: "Call Stub", type: "main", index: 0 } ] ]
    },
    "Call Stub": {
      main: [ [ { node: "Call Send", type: "main", index: 0 } ] ]
    }
  }
};

const callStubNode = entradaWhatsappWorkflow.nodes.find(n => n.name === "Call Stub");
if (callStubNode) callStubNode.parameters.workflowId = stubWorkflow.id;

const callSendNode = entradaWhatsappWorkflow.nodes.find(n => n.name === "Call Send");
if (callSendNode) callSendNode.parameters.workflowId = enviarWhatsappWorkflow.id;

fs.writeFileSync('DS-02_stub.json', JSON.stringify(stubWorkflow, null, 2));
fs.writeFileSync('DS-T1_consultar_cobertura.json', JSON.stringify(consultarCoberturaWorkflow, null, 2));
fs.writeFileSync('DS-03_Enviar_WhatsApp.json', JSON.stringify(enviarWhatsappWorkflow, null, 2));
fs.writeFileSync('DS-01_Entrada_WhatsApp.json', JSON.stringify(entradaWhatsappWorkflow, null, 2));
console.log('Workflows generated.');
