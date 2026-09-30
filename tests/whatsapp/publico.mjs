import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base=process.argv[2];assert(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/?$/.test(base),'URL de túnel inválida');
const url=base.replace(/\/$/,'')+'/webhook/whatsapp',run=Date.now(),wa='575'+String(run).slice(-10);
const e=JSON.parse(fs.readFileSync(new URL('fixtures/texto.json',import.meta.url)));
Object.assign(e.whatsappInboundMessage,{id:'publico-'+run,wamid:'wamid.publico-'+run,from:wa,sendTime:new Date().toISOString(),text:{body:'Prueba pública OT-05, modo simulado'}});
const secret=fs.readFileSync(process.env.OT05_ENV_FILE,'utf8').split(/\r?\n/).find(s=>s.startsWith('YCLOUD_WEBHOOK_SECRET=')).split('=').slice(1).join('=').trim().replace(/^(['"])(.*)\1$/,'$2');
const evidence={comando:'OT05_ENV_FILE=<infra/.env principal> node tests/whatsapp/publico.mjs '+base,url,fixture:e,sql:[]};
try{
 const raw=JSON.stringify(e),t=Math.floor(Date.now()/1000),sig=crypto.createHmac('sha256',secret).update(t+'.'+raw).digest('hex'),start=Date.now();
 const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${t},s=${sig}`},body:raw,signal:AbortSignal.timeout(15000)});
 evidence.http={status:res.status,ms:Date.now()-start,body:await res.text()};assert.equal(res.status,200);
 const query=`SELECT COALESCE(json_agg(m),'[]'::json) FROM (SELECT wamid,wa_id,direccion,texto,estado,autor,proveedor_id,waba_id,creado_en FROM mensajes WHERE wa_id='${wa}' ORDER BY creado_en) m;`;
 let rows=[];for(let i=0;i<30;i++){
  const r=spawnSync('docker',['exec','-i','houseturing_postgres','sh','-c','psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'],{input:query,encoding:'utf8'});assert.equal(r.status,0);
  evidence.sql.push({comando:query,salida:r.stdout.trim()});rows=JSON.parse(r.stdout);if(rows.length===2)break;await new Promise(r=>setTimeout(r,1000));
 }
 assert.equal(rows.length,2);assert.equal(rows[1].estado,'simulado');evidence.resultado='PASS';
}catch(e){evidence.resultado='FAIL';evidence.error=e.message;process.exitCode=1;}
fs.writeFileSync(new URL('../../planes/evidencia/OT-05/webhook-publico.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({url,resultado:evidence.resultado,http:evidence.http,error:evidence.error}));
