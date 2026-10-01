import fs from 'fs';

const testChatWorkflow = {
  id: "683e3b3e-1111-2222-3333-444455556666",
  name: "TEST Chat Web",
  nodes: [
    {
      parameters: {},
      id: "trigger",
      name: "Chat Trigger",
      type: "@n8n/n8n-nodes-langchain.chatTrigger",
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {
        promptType: "define",
        text: "={{ $json.chatInput }}",
        options: {
          systemMessage: "Eres un asesor de ventas de una tienda virtual. Eres amable, conciso y usas emojis."
        }
      },
      id: "agent",
      name: "AI Agent",
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 1.6,
      position: [300, 0]
    },
    {
      parameters: {
        modelName: "models/gemini-1.5-flash",
        options: {}
      },
      id: "llm",
      name: "Google Gemini Chat Model",
      type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      typeVersion: 1,
      position: [300, 200]
    },
    {
      parameters: {
        windowSize: 20,
        sessionKey: "={{ $('Chat Trigger').first().json.sessionId }}"
      },
      id: "memory",
      name: "Postgres Chat Memory",
      type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
      typeVersion: 1.2,
      position: [450, 200],
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } }
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
      position: [550, 200]
    }
  ],
  connections: {
    "Chat Trigger": {
      main: [ [ { node: "AI Agent", type: "main", index: 0 } ] ]
    },
    "Google Gemini Chat Model": {
      ai_languageModel: [ [ { node: "AI Agent", type: "ai_languageModel", index: 0 } ] ]
    },
    "Postgres Chat Memory": {
      ai_memory: [ [ { node: "AI Agent", type: "ai_memory", index: 0 } ] ]
    },
    "Call Workflow Tool": {
      ai_tool: [ [ { node: "AI Agent", type: "ai_tool", index: 0 } ] ]
    }
  },
  settings: {}
};

fs.writeFileSync('TEST_Chat.json', JSON.stringify(testChatWorkflow, null, 2));
console.log('Test Chat Workflow generated.');
