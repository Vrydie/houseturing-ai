import fs from 'fs';

const filePath = './workflows/generate_workflows.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const t2t3Code = `
// DS-T2: Crear Pedido Contraentrega
const crearPedidoWorkflow = {
  id: "f1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
  name: "DS-T2 crear_pedido_contraentrega",
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
        query: "SELECT precio_total, cantidad FROM ofertas WHERE id = $1",
        options: {
          queryReplacement: "={{ $input.first().json.oferta_id }}"
        }
      },
      id: "pg_oferta",
      name: "Get Price",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [200, 0]
    },
    {
      parameters: {
        jsCode: \`
// Aquí armamos el cuerpo de la mutación GraphQL usando los datos del cliente
const inputData = $('Execute Workflow Trigger').first().json;
const priceData = $input.first().json;
const sessionId = inputData.sessionId;
const envio = inputData.datos_envio;

// Se asume que el token y dominio se sacan de config, aquí se deja preparado.
return [{
  json: {
    query: \`mutation CrearPedidoContraentrega($order: OrderCreateOrderInput!) {
      orderCreate(order: $order) { order { id name } userErrors { message } }
    }\`,
    variables: {
      order: {
        currency: "COP",
        financialStatus: "PENDING",
        phone: "+57" + envio.celular,
        shippingAddress: {
          firstName: envio.nombre,
          lastName: envio.apellido,
          address1: envio.direccion,
          city: envio.ciudad,
          phone: "+57" + envio.celular
        },
        tags: ["canal:whatsapp", "wa:" + sessionId]
      }
    }
  }
}];
        \`
      },
      id: "code_format_gql",
      name: "Build GraphQL",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [400, 0]
    },
    {
      parameters: {
        method: "POST",
        url: "https://{{$json.shopify_domain}}/admin/api/2026-07/graphql.json",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "X-Shopify-Access-Token", value: "AQUÍ_VA_TU_TOKEN" },
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "query", value: "={{ $json.query }}" },
            { name: "variables", value: "={{ JSON.stringify($json.variables) }}" }
          ]
        }
      },
      id: "http_shopify",
      name: "Shopify API (Mock)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1,
      position: [600, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Get Price", type: "main", index: 0 } ] ] },
    "Get Price": { main: [ [ { node: "Build GraphQL", type: "main", index: 0 } ] ] },
    "Build GraphQL": { main: [ [ { node: "Shopify API (Mock)", type: "main", index: 0 } ] ] }
  }
};

// DS-T3: Generar Link de Pago
const generarLinkWorkflow = {
  id: "a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p",
  name: "DS-T3 generar_link_pago",
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
        jsCode: "return [{ json: { url: 'https://tu-tienda.com/checkout/test' } }];"
      },
      id: "code_link",
      name: "Mock Link",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [200, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Mock Link", type: "main", index: 0 } ] ] }
  }
};
`;

content = content.replace('// DS-T4: Consultar Estado Pedido', t2t3Code + '\n// DS-T4: Consultar Estado Pedido');

const toolNodes = `
    {
      parameters: {
        workflowId: "f1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
        name: "crear_pedido_contraentrega",
        description: "Crea el pedido con pago contra entrega. SOLO después de que el cliente respondió 'sí' al resumen completo."
      },
      id: "tool_pedido",
      name: "Call Tool Pedido",
      type: "@n8n/n8n-nodes-langchain.toolWorkflow",
      typeVersion: 1.1,
      position: [1000, 750]
    },
    {
      parameters: {
        workflowId: "a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p",
        name: "generar_link_pago",
        description: "Genera un enlace de pago en línea para quien prefiere pagar por adelantado."
      },
      id: "tool_link",
      name: "Call Tool Link",
      type: "@n8n/n8n-nodes-langchain.toolWorkflow",
      typeVersion: 1.1,
      position: [1000, 900]
    },`;

content = content.replace('id: "tool_escalar",\n      name: "Call Tool Escalar",\n      type: "@n8n/n8n-nodes-langchain.toolWorkflow",\n      typeVersion: 1.1,\n      position: [1000, 600]\n    },', 
  'id: "tool_escalar",\n      name: "Call Tool Escalar",\n      type: "@n8n/n8n-nodes-langchain.toolWorkflow",\n      typeVersion: 1.1,\n      position: [1000, 600]\n    },' + toolNodes);

const toolConnections = `
    "Call Tool Escalar": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] },
    "Call Tool Pedido": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] },
    "Call Tool Link": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] }`;

content = content.replace('"Call Tool Escalar": { ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ] }', toolConnections);

const fsWrites = `
fs.writeFileSync('DS-T2_crear_pedido.json', JSON.stringify(crearPedidoWorkflow, null, 2));
fs.writeFileSync('DS-T3_generar_link_pago.json', JSON.stringify(generarLinkWorkflow, null, 2));
`;
content = content.replace("fs.writeFileSync('DS-T4_consultar_estado.json'", fsWrites + "fs.writeFileSync('DS-T4_consultar_estado.json'");

fs.writeFileSync(filePath, content);
console.log("T2 and T3 tools added to generate_workflows.mjs!");
