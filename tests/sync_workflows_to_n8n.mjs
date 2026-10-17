import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workflowsDir = path.resolve(__dirname, '../workflows');

async function sync() {
  console.log('--- Sincronizando flujos optimizados de latencia minima (<2s) a n8n ---');

  // 1. Actualizar base de datos de configuracion dropship
  const dropshipClient = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgres://dropship:super_secret_db_pass@127.0.0.1:5433/dropship'
  });

  try {
    await dropshipClient.connect();
    await dropshipClient.query(`
      INSERT INTO config (clave, valor) VALUES ('debounce_segundos', '0')
      ON CONFLICT (clave) DO UPDATE SET valor = '0';
    `);
    console.log('✔ Base de datos dropship: debounce_segundos configurado a 0.');
    await dropshipClient.end();
  } catch (err) {
    console.warn('⚠ No se pudo conectar a la BD dropship (¿Docker no está corriendo?):', err.message);
  }

  // 2. Actualizar workflows en n8n
  const n8nClient = new pg.Client({
    connectionString: process.env.N8N_DATABASE_URL || 'postgres://dropship:super_secret_db_pass@127.0.0.1:5433/n8n'
  });

  try {
    await n8nClient.connect();

    const filesToSync = [
      { id: '8c5216d4-f62a-47c8-8658-96164bebdf4b', file: 'DS-01_Entrada_WhatsApp.json' },
      { id: 'ae42ab9a-9d5c-40fb-b18b-b8626c78b51b', file: 'DS-02_Agente_Ventas.json' },
      { id: 'a0c7abce-0081-4c80-aa6a-72f4200ec489', file: 'DS-03_Enviar_WhatsApp.json' }
    ];

    for (const item of filesToSync) {
      const fullPath = path.join(workflowsDir, item.file);
      if (fs.existsSync(fullPath)) {
        const wf = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const res = await n8nClient.query(
          'UPDATE workflow_entity SET nodes=$1, connections=$2 WHERE id=$3',
          [JSON.stringify(wf.nodes), JSON.stringify(wf.connections), item.id]
        );
        if (res.rowCount > 0) {
          console.log(`✔ Workflow ${item.file} sincronizado en n8n exitosamente.`);
        } else {
          console.log(`ℹ Workflow ${item.file} (ID: ${item.id}) no encontrado en n8n, omitido.`);
        }
      }
    }

    await n8nClient.end();
    console.log('🎉 Flujos sincronizados exitosamente con n8n.');
  } catch (err) {
    console.warn('⚠ No se pudo conectar a la BD n8n (¿Docker no está corriendo?):', err.message);
  }
}

sync();
