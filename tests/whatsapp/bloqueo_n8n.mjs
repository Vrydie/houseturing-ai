import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const evidence={comando:'OT05_ENV_FILE=<infra/.env principal> node tests/whatsapp/bloqueo_n8n.mjs',sql:[],http:[]};
const run=Date.now(),wa='576'+String(run).slice(-10),wamid='wamid.bloqueo-'+run;
function sql(q){const r=spawnSync('docker',['exec','-i','houseturing_postgres','sh','-c','psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'],{input:q,encoding:'utf8'});assert.equal(r.status,0,r.stderr);evidence.sql.push({comando:q,salida:r.stdout.trim()});return r.stdout.trim();}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const e=JSON.parse(fs.readFileSync(new URL('fixtures/texto.json',import.meta.url)));
 Object.assign(e.whatsappInboundMessage,{from:wa,id:'bloqueo-'+run,wamid,sendTime:new Date().toISOString()});
 const secret=fs.readFileSync(process.env.OT05_ENV_FILE,'utf8').split(/\r?\n/).find(s=>s.startsWith('YCLOUD_WEBHOOK_SECRET=')).split('=').slice(1).join('=').trim().replace(/^(['"])(.*)\1$/,'$2');
 const raw=JSON.stringify(e),t=Math.floor(Date.now()/1000),signature=crypto.createHmac('sha256',secret).update(t+'.'+raw).digest('hex');
 const res=await fetch('http://127.0.0.1:5690/webhook/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${t},s=${signature}`},body:raw});
 evidence.http.push({status:res.status,fixture:e});assert.equal(res.status,200);
 let cid='';for(let i=0;i<20&&!cid;i++){cid=sql(`SELECT conversacion_id FROM mensajes WHERE wamid='${wamid}';`);if(!cid)await sleep(200);}assert(cid);
 sql(`UPDATE conversaciones SET agente_ocupado_hasta=now()+interval '12 seconds' WHERE id=${cid};`);
 let out=[];
 for(let i=0;i<30;i++){out=JSON.parse(sql(`SELECT COALESCE(json_agg(m),'[]'::json) FROM (SELECT wamid,texto,estado,creado_en FROM mensajes WHERE conversacion_id=${cid} AND direccion='out') m;`));if(out.length)break;await sleep(1000);}
 assert.equal(out.length,1,'Debe responder una sola vez después de liberar el bloqueo');
 evidence.resultado='PASS';
}catch(e){evidence.resultado='FAIL';evidence.error=e.message;process.exitCode=1;}
fs.writeFileSync(new URL('../../planes/evidencia/OT-05/bloqueo-n8n.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(evidence.resultado,evidence.error??'Reintento de bloqueo y respuesta única verificados');
