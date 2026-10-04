import fs from 'node:fs';

const workflow = {
  id: 'ds-05-renovar-token-uuid-1234',
  name: 'DS-05_Renovar_token',
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            {
              field: 'hours',
              hoursInterval: 20
            }
          ]
        }
      },
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [0, 0]
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ "https://" + $env["SHOPIFY_STORE_DOMAIN"] + "/admin/oauth/access_token" }}',
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: 'client_id', value: '={{ $env["SHOPIFY_CLIENT_ID"] }}' },
            { name: 'client_secret', value: '={{ $env["SHOPIFY_CLIENT_SECRET"] }}' },
            { name: 'grant_type', value: 'client_credentials' }
          ]
        }
      },
      name: 'Obtener Token',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [200, 0]
    },
    {
      parameters: {
        operation: 'executeQuery',
        query: `
          UPDATE config SET valor = $1, actualizado_en = now() WHERE clave = 'shopify_access_token';
          UPDATE config SET valor = $2, actualizado_en = now() WHERE clave = 'shopify_token_expira_en';
        `,
        queryParameters: '={{ $json.access_token }},{{ new Date(Date.now() + $json.expires_in * 1000).toISOString() }}'
      },
      name: 'Guardar Token',
      type: 'n8n-nodes-base.postgres',
      typeVersion: 2.3,
      position: [400, 0],
      credentials: {
        postgres: {
          id: 'postgres_dropship',
          name: 'Postgres Dropship'
        }
      }
    }
  ],
  connections: {
    'Schedule Trigger': {
      main: [
        [
          { node: 'Obtener Token', type: 'main', index: 0 }
        ]
      ]
    },
    'Obtener Token': {
      main: [
        [
          { node: 'Guardar Token', type: 'main', index: 0 }
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

fs.writeFileSync(new URL('./DS-05_Renovar_token.json', import.meta.url), JSON.stringify(workflow, null, 2));
console.log('Generado DS-05_Renovar_token.json');
