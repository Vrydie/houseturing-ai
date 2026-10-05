import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const base = process.argv[2] || 'https://example.com';
const url = base.replace(/\/$/, '') + '/webhook/whatsapp';
const run = Date.now();
const wa = '573' + String(run).slice(-9); // valid celular for Colombia starts with 3
const secret = fs.readFileSync('infra/.env', 'utf8').split(/\r?\n/).find(s => s.startsWith('YCLOUD_WEBHOOK_SECRET=')).split('=').slice(1).join('=').trim().replace(/^(['"])(.*)\1$/, '$2');

async function sendMsg(textMsg, seq) {
  const e = JSON.parse(fs.readFileSync(new URL('../whatsapp/fixtures/texto.json', import.meta.url)));
  Object.assign(e.whatsappInboundMessage, {
    id: 'sim-' + run + '-' + seq,
    wamid: 'wamid.sim-' + run + '-' + seq,
    from: wa,
    sendTime: new Date().toISOString(),
    text: { body: textMsg }
  });
  const raw = JSON.stringify(e);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(t + '.' + raw).digest('hex');
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'YCloud-Signature': `t=${t},s=${sig}` },
    body: raw
  });
  assert.equal(res.status, 200);
  console.log(`Sent: ${textMsg}`);
}

async function getReply(seq) {
  const query = `SELECT texto FROM mensajes WHERE wa_id='${wa}' AND direccion='out' ORDER BY creado_en DESC LIMIT 1;`;
  for(let i = 0; i < 30; i++) {
    const r = spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'sh', '-c', 'psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'], {input: query, encoding: 'utf8'});
    const out = r.stdout.trim();
    if (out && out !== '[]' && out.length > 0) {
       // Just wait a bit more for n8n to finish processing
       await new Promise(r => setTimeout(r, 2000));
       const rFinal = spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'sh', '-c', 'psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'], {input: query, encoding: 'utf8'});
       return rFinal.stdout.trim();
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

async function runTest() {
  try {
    console.log("Iniciando conversacion simulada...");
    await sendMsg("Hola, quiero 1 unidad del CM-135", 1);
    await getReply(1); // Wait for bot reply
    
    await sendMsg("Juan Perez, Celular " + wa + ", Calle 45 # 13-20, Barrio San Carlos, Cali. Valle del Cauca", 2);
    const reply2 = await getReply(2);
    console.log("Bot reply to data:", reply2);
    
    await sendMsg("Sí, confirmo el pedido", 3);
    const reply3 = await getReply(3);
    console.log("Bot reply to confirm:", reply3);

    // Check if order was created in DB
    const query = `SELECT shopify_order_name, total, es_prueba FROM pedidos WHERE wa_id='${wa}' ORDER BY creado_en DESC LIMIT 1;`;
    const r = spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'sh', '-c', 'psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'], {input: query, encoding: 'utf8'});
    const out = r.stdout.trim();
    console.log("Pedido en DB:", out);
    if (!out.includes("SIM-") && !out.includes("true")) {
      throw new Error("No se creó el pedido simulado correctamente");
    }

    // Idempotency check: send confirm again
    console.log("Test idempotencia: reenviando confirmacion...");
    await sendMsg("Sí, confirmo el pedido de nuevo", 4);
    await getReply(4);

    const queryCount = `SELECT count(*) FROM pedidos WHERE wa_id='${wa}';`;
    const rCount = spawnSync('docker', ['exec', '-i', 'houseturing_postgres', 'sh', '-c', 'psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'], {input: queryCount, encoding: 'utf8'});
    const count = parseInt(rCount.stdout.trim());
    console.log("Cantidad de pedidos:", count);
    if (count !== 1) {
      throw new Error("Idempotencia falló: Se crearon " + count + " pedidos.");
    }
    
    console.log("TEST PASS");
    const evidence = {
      resultado: 'PASS',
      pedido: out,
      cantidad_pedidos: count
    };
    fs.mkdirSync('../../planes/evidencia/OT-07', { recursive: true });
    fs.writeFileSync(new URL('../../planes/evidencia/OT-07/simulado.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\\n');
  } catch (err) {
    console.error("TEST FAIL", err);
  }
}

runTest();
