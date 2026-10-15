import pg from 'pg';

const token = 'EAI8DSv2jZCOwBSoanJcOFRuPRBW0Xu9IwFwp8cJCnAQQQch4OuMS7E9rARlc3nZAEhaRvF6QJ6Kl0jlJfS03FGnDnDdQrfZC7O1dr7WGGNw5XNuPYVRlOHAqqC2JpyNcECIR05s7KQcfu965gJOOhZAaiuPDZBRJDT2BWUs7VlA9foMXZBgvodwIzq659htxZASb24eZCIWHIqTZBuTVVyXql6qdNMolXc3wQCC2lsKVX5HiDbYZCGtzyubVvfutlaiSphrsP1i8ZBDy9qNTGMATu6uTDwKbgZDZD';
const phoneId = '1419311231255449';
const verifyToken = 'whatsapp_n8n_verify_2026';

const client = new pg.Client({
  connectionString: 'postgres://dropship:super_secret_db_pass@127.0.0.1:5433/dropship'
});

async function run() {
  await client.connect();
  const queries = [
    { k: 'whatsapp_proveedor', v: 'meta' },
    { k: 'meta_access_token', v: token },
    { k: 'meta_phone_number_id', v: phoneId },
    { k: 'meta_verify_token', v: verifyToken },
    { k: 'whatsapp_modo_simulado', v: 'false' }
  ];

  for (const q of queries) {
    await client.query(
      `INSERT INTO config (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
      [q.k, q.v]
    );
  }

  console.log('Postgres config table updated successfully with Meta settings');
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
