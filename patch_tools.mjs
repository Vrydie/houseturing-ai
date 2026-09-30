import fs from 'fs';

const filePath = './workflows/generate_workflows.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const t4t5Code = `
// DS-T4: Consultar Estado Pedido
const consultarEstadoWorkflow = {
  id: "d8c21a4f-9a1c-4f77-9b2f-1a2b3c4d5e6f",
  name: "DS-T4 consultar_estado_pedido",
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
        query: "SELECT estado, transportadora, guia, url_rastreo FROM pedidos WHERE wa_id = $1 ORDER BY creado_en DESC LIMIT 1",
        options: {
          queryReplacement: "={{ $input.first().json.sessionId }}"
        }
      },
      id: "pg_estado",
      name: "Postgres Estado",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [200, 0]
    },
    {
      parameters: {
        jsCode: \`
const items = $input.all().map(i => i.json);
if (items.length === 0) return [{ json: { error: "No se encontró ningún pedido reciente." } }];
return [{ json: items[0] }];
        \`
      },
      id: "code_format",
      name: "Format Output",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Postgres Estado", type: "main", index: 0 } ] ] },
    "Postgres Estado": { main: [ [ { node: "Format Output", type: "main", index: 0 } ] ] }
  }
};

// DS-T5: Escalar a Humano
const escalarHumanoWorkflow = {
  id: "e9d32b5g-1b2d-5f88-8c3g-2b3c4d5e6f7g",
  name: "DS-T5 escalar_a_humano",
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
        query: "UPDATE conversaciones SET bot_activo = false WHERE wa_id = $1",
        options: {
          queryReplacement: "={{ $input.first().json.sessionId }}"
        }
      },
      id: "pg_escalar",
      name: "Disable Bot",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [200, 0]
    },
    {
      parameters: {
        jsCode: \`
return [{ json: { status: "Escalado correctamente. Bot pausado para este wa_id." } }];
        \`
      },
      id: "code_resp",
      name: "Format Output",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Disable Bot", type: "main", index: 0 } ] ] },
    "Disable Bot": { main: [ [ { node: "Format Output", type: "main", index: 0 } ] ] }
  }
};
`;

// Insert workflows before DS-01
content = content.replace('// DS-01: Entrada WhatsApp', t4t5Code + '\n// DS-01: Entrada WhatsApp');

// Add tools to DS-02 nodes
const toolNodes = `
    {
      parameters: {
        workflowId: "d8c21a4f-9a1c-4f77-9b2f-1a2b3c4d5e6f",
        name: "consultar_estado_pedido",
        description: "Devuelve los pedidos del cliente actual (estado, transportadora, guía)."
      },
      id: "tool_estado",
      name: "Call Tool Estado",
      type: "@n8n/n8n-nodes-langchain.toolWorkflow",
      typeVersion: 1.1,
      position: [1000, 450]
    },
    {
      parameters: {
        workflowId: "e9d32b5g-1b2d-5f88-8c3g-2b3c4d5e6f7g",
        name: "escalar_a_humano",
        description: "Pausa el bot en esta conversación y avisa al operador. Llama si el cliente está molesto, pide humano, u otras razones de la ficha."
      },
      id: "tool_escalar",
      name: "Call Tool Escalar",
      type: "@n8n/n8n-nodes-langchain.toolWorkflow",
      typeVersion: 1.1,
      position: [1000, 600]
    },`;

content = content.replace('id: "tool_cobertura",\n      name: "Call Workflow Tool",\n      type: "@n8n/n8n-nodes-langchain.toolWorkflow",\n      typeVersion: 1.1,\n      position: [1000, 300]\n    },', 
  'id: "tool_cobertura",\n      name: "Call Workflow Tool",\n      type: "@n8n/n8n-nodes-langchain.toolWorkflow",\n      typeVersion: 1.1,\n      position: [1000, 300]\n    },' + toolNodes);

// Add tools to DS-02 connections
const toolConnections = `
    "Call Workflow Tool": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] },
    "Call Tool Estado": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] },
    "Call Tool Escalar": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] }`;

content = content.replace('"Call Workflow Tool": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] }', toolConnections);

// Add writeFileSync calls for T4 and T5
const fsWrites = `
fs.writeFileSync('DS-T4_consultar_estado.json', JSON.stringify(consultarEstadoWorkflow, null, 2));
fs.writeFileSync('DS-T5_escalar_a_humano.json', JSON.stringify(escalarHumanoWorkflow, null, 2));
`;
content = content.replace("fs.writeFileSync('DS-01_Entrada_WhatsApp.json'", fsWrites + "fs.writeFileSync('DS-01_Entrada_WhatsApp.json'");

fs.writeFileSync(filePath, content);
console.log("workflows/generate_workflows.mjs patched successfully!");
