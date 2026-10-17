import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.PG_URL) return process.env.PG_URL;

  const host = process.env.DB_POSTGRESDB_HOST || process.env.PGHOST;
  const user = process.env.DB_POSTGRESDB_USER || process.env.PGUSER || 'postgres';
  const pass = process.env.DB_POSTGRESDB_PASSWORD || process.env.PGPASSWORD || '';
  const port = process.env.DB_POSTGRESDB_PORT || process.env.PGPORT || 5432;
  const db = process.env.DB_POSTGRESDB_DATABASE || process.env.PGDATABASE || 'railway';

  if (host) {
    return `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }
  return null;
}

async function run() {
  console.log('=== [Railway HouseTuring] Iniciando sincronización de flujos y DB ===');

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.warn('⚠ No se encontró cadena de conexión a PostgreSQL. Omitiendo sync directo a DB.');
    return;
  }

  const client = new pg.Client({
    connectionString,
    ssl: (connectionString.includes('rlwy.net') || connectionString.includes('railway')) ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('✔ Conectado a PostgreSQL en Railway.');

    // 1. Forzar debounce_segundos = '0' para modo feria y reactivar conversaciones bloqueadas
    await client.query(`
      CREATE TABLE IF NOT EXISTS config (clave TEXT PRIMARY KEY, valor TEXT, actualizado_en TIMESTAMPTZ DEFAULT now());
      INSERT INTO config (clave, valor) VALUES ('debounce_segundos', '0')
      ON CONFLICT (clave) DO UPDATE SET valor = '0';
      UPDATE config SET valor = '0' WHERE clave = 'debounce_segundos';

      -- Liberar cualquier conversación bloqueada por error previo del modelo
      UPDATE conversaciones 
      SET agente_ocupado_hasta = NULL, bot_activo = true 
      WHERE bot_activo = false AND motivo_escalamiento IS DISTINCT FROM 'opt_out';
      
      UPDATE conversaciones 
      SET agente_ocupado_hasta = NULL 
      WHERE agente_ocupado_hasta > now();
    `);
    console.log('✔ debounce_segundos configurado a 0 y conversaciones liberadas.');

    // 2. Aplicar migraciones si existen
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        try {
          const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
          await client.query(sql);
          console.log(`✔ Migración ${f} aplicada.`);
        } catch (e) {
          console.warn(`Aviso en migración ${f}:`, e.message);
        }
      }
    }

    // 3. Inyectar workflows actualizados directamente en workflow_entity (n8n DB) y ACTIVARLOS
    const workflowsDir = path.resolve(__dirname, '../workflows');
    if (fs.existsSync(workflowsDir)) {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
          const wf = JSON.parse(content);
          if (wf.nodes && wf.connections) {
            const res = await client.query(`
              UPDATE workflow_entity 
              SET nodes = $1, connections = $2, active = true 
              WHERE id = $3 OR name = $4
            `, [JSON.stringify(wf.nodes), JSON.stringify(wf.connections), wf.id || 'none', wf.name || 'none']);
            if (res.rowCount > 0) {
              console.log(`✔ Workflow ${file} (${wf.name || wf.id}) actualizado y ACTIVADO en workflow_entity.`);
            }
          }
        } catch (e) {
          console.warn(`Aviso al actualizar workflow ${file}:`, e.message);
        }
      }
    }

    // 4. Asegurar que TODOS los flujos principales queden con active = true
    await client.query(`
      UPDATE workflow_entity 
      SET active = true 
      WHERE name ILIKE '%DS-%';
    `);
    console.log('✔ Activación forzada (active = true) garantizada para todos los flujos DS-*');

    await client.end();
    console.log('=== [Railway HouseTuring] Sincronización DB completada con éxito ===');
  } catch (err) {
    console.warn('⚠ Error durante la sincronización a Postgres en Railway:', err.message);
  }
}

run();
