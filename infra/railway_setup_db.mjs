import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.PG_URL;
  if (!connectionString) {
    console.error('ERROR: Debes definir DATABASE_URL o PG_URL para conectar con Postgres en Railway.');
    console.error('Ejemplo: DATABASE_URL=postgresql://postgres:password@monorail.proxy.rlwy.net:PORT/railway node railway_setup_db.mjs');
    process.exit(1);
  }

  console.log('Conectando a PostgreSQL en Railway...');
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('rlwy.net') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  console.log('¡Conexión establecida con éxito!');

  // 1. Ejecutar schema.sql
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('Ejecutando db/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('db/schema.sql aplicado.');
  }

  // 2. Ejecutar migraciones si existen
  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      console.log(`Aplicando migración: ${f}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      try {
        await client.query(sql);
        console.log(`Migración ${f} aplicada.`);
      } catch (err) {
        console.warn(`Aviso en ${f}:`, err.message);
      }
    }
  }

  console.log('=== Base de datos configurada correctamente para Railway ===');
  await client.end();
}

main().catch(err => {
  console.error('Error fatal al configurar la base de datos:', err);
  process.exit(1);
});
