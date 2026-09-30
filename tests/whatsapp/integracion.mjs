import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const root=new URL('../../',import.meta.url),out=new URL('planes/evidencia/OT-05/',root);
const ajv=new Ajv({strict:false});addFormats(ajv);
const validate=ajv.compile(JSON.parse(fs.readFileSync(new URL('schemas/interno_mensaje_normalizado.schema.json',root))));
const env=fs.readFileSync(process.env.OT05_ENV_FILE,'utf8');
const secret=env.split(/\r?\n/).find(s=>s.startsWith('YCLOUD_WEBHOOK_SECRET='))?.split('=').slice(1).join('=').trim().replace(/^(['"])(.*)\1$/,'$2');
assert(secret,'Falta secreto local');
const run=Date.now().toString(),prefix='579'+run.slice(-8);let serial=0;
const base=JSON.parse(fs.readFileSync(new URL('schemas/entrada_ycloud_mensaje.example.json',root)))[1];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const logs=[];let evidence;
function sql(query){
 const r=spawnSync('docker',['exec','-i','houseturing_postgres','sh','-c','psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'],{input:query,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const value=r.stdout.trim();if(evidence)evidence.sql.push({comando:query,salida:value});return value;
}
function rows(wa){return JSON.parse(sql(`SELECT COALESCE(json_agg(x),'[]'::json) FROM (SELECT wamid,wa_id,conversacion_id,direccion,tipo,texto,estado,autor,proveedor_id,waba_id,procesado,normalizado,creado_en FROM mensajes WHERE wa_id='${wa}' ORDER BY creado_en,wamid) x;`));}
function event(wa,type='text',payload={text:{body:'Hola'}}){
 const e=structuredClone(base),m=e.whatsappInboundMessage;const id=`ot05-${run}-${++serial}`;
 Object.assign(m,{id,wamid:'wamid.'+id,from:wa,sendTime:new Date().toISOString(),type},payload);delete m.context;
 return e;
}
async function send(e,option){
 const raw=Buffer.from(JSON.stringify(e,null,2));const t=Math.floor(Date.now()/1000)-(option==='vieja'?301:0);
 const signature=option==='mala'?'0'.repeat(64):crypto.createHmac('sha256',secret).update(t+'.').update(raw).digest('hex');
 const start=Date.now();const res=await fetch('http://127.0.0.1:5690/webhook/whatsapp',{method:'POST',headers:{'Content-Type':'application/json','YCloud-Signature':`t=${t},s=${signature}`},body:raw});
 const r={comando:'POST http://127.0.0.1:5690/webhook/whatsapp con firma '+(option??'válida'),status:res.status,ms:Date.now()-start,body:await res.text(),fixture:e};evidence.http.push(r);assert.equal(res.status,200);assert(r.ms<2000,'ACK no inmediato');
}
async function waitRows(wa,predicate,seconds=30){
 for(let i=0;i<seconds;i++){const r=rows(wa);if(predicate(r))return r;await sleep(1000);}throw new Error('No se alcanzó el resultado de BD dentro del plazo');
}
async function check(name,fn){evidence={caso:name,comando:'OT05_ENV_FILE=<infra/.env principal> node tests/whatsapp/integracion.mjs',http:[],sql:[]};try{await fn();evidence.resultado='PASS';}catch(e){evidence.resultado='FAIL';evidence.error=e.message;process.exitCode=1;}logs.push({caso:name,resultado:evidence.resultado});fs.writeFileSync(new URL(name+'.json',out),JSON.stringify(evidence,null,2)+'\n');console.log(name,evidence.resultado,evidence.error??'');}
assert.equal(sql("SELECT valor FROM config WHERE clave='whatsapp_modo_simulado';"),'true','Debe mantenerse modo simulado');
await check('01-ctwa-C1-C2-C3',async()=>{
 const wa=prefix+'01',texto='Hola, quiero "dos", por favor\nSegunda línea con apóstrofo: O\'Brien';const e=event(wa,'text',{text:{body:texto}});
 await send(e);const r=await waitRows(wa,r=>r.some(m=>m.direccion==='out'));assert.equal(r.length,2);assert.equal(r[0].texto,texto);assert.equal(r[1].texto,'Hola, recibimos tu mensaje: '+texto);assert.equal(r[1].estado,'simulado');assert.equal(r[1].autor,'bot');assert.equal(r[0].waba_id,'WABA-ID');assert(validate(r[0].normalizado),JSON.stringify(validate.errors));
 const c=JSON.parse(sql(`SELECT row_to_json(c) FROM conversaciones c WHERE id=${r[0].conversacion_id};`));assert.equal(c.ctwa_clid,e.whatsappInboundMessage.referral.ctwa_clid);assert.equal(c.ad_id,'MEDIA-ID');assert.equal(c.ad_headline,'Chat with us');
 await send(e);await sleep(2e3);assert.equal(rows(wa).length,2);
});
await check('02-rafaga-C5',async()=>{
 const wa=prefix+'02';for(const text of ['uno','dos','tres']){await send(event(wa,'text',{text:{body:text}}));await sleep(900);}
 const r=await waitRows(wa,r=>r.some(m=>m.direccion==='out'));assert.equal(r.filter(m=>m.direccion==='out').length,1);assert.equal(r.at(-1).texto,'Hola, recibimos tu mensaje: uno\ndos\ntres');
});
await check('03-firma-mala',async()=>{const wa=prefix+'03';await send(event(wa),'mala');await sleep(1200);assert.equal(rows(wa).length,0);});
await check('04-firma-vieja',async()=>{const wa=prefix+'04';await send(event(wa),'vieja');await sleep(1200);assert.equal(rows(wa).length,0);});
await check('05-audio-C6',async()=>{const wa=prefix+'05';await send(event(wa,'audio',{audio:{id:'media-local-prueba',mime_type:'audio/mpeg'}}));const r=await waitRows(wa,r=>r.length===2);assert.equal(r[0].texto,'[nota de voz sin transcribir]');assert(validate(r[0].normalizado));});
await check('06-estados-sin-respuesta',async()=>{
 const wa=prefix+'01',before=rows(wa),m=before.find(m=>m.direccion==='out');assert(m);
 const e=JSON.parse(fs.readFileSync(new URL('schemas/entrada_ycloud_estado.example.json',root)));Object.assign(e.whatsappMessage,{id:m.proveedor_id,wamid:m.wamid,status:'delivered'});await send(e);await waitRows(wa,r=>r.some(m=>m.estado==='delivered'),5);assert.equal(rows(wa).length,before.length);
});
await check('07-eco-pausa',async()=>{
 const wa=prefix+'02',before=rows(wa);const e=JSON.parse(fs.readFileSync(new URL('schemas/entrada_ycloud_eco.example.json',root)));Object.assign(e.whatsappMessage,{id:'eco-'+run,wamid:'wamid.eco-'+run,to:wa,sendTime:new Date().toISOString()});await send(e);const r=await waitRows(wa,r=>r.length===before.length+1,5);assert.equal(r.at(-1).autor,'humano');const c=JSON.parse(sql(`SELECT row_to_json(c) FROM conversaciones c WHERE id=${r.at(-1).conversacion_id};`));assert.equal(c.bot_activo,false);assert.equal(c.motivo_escalamiento,'humano_respondio_desde_app');await send(event(wa));await sleep(10e3);assert.equal(rows(wa).filter(m=>m.autor==='bot').length,1);
});
await check('08-get-sin-handshake',async()=>{
 const r=await fetch('http://127.0.0.1:5690/webhook/whatsapp?hub.mode=subscribe&hub.challenge=OT05');const body=await r.text();evidence.http.push({comando:'GET /webhook/whatsapp?hub.mode=subscribe&hub.challenge=OT05',status:r.status,body});assert.equal(r.status,404);assert.notEqual(body,'OT05');
});
await check('09-tipos-C6',async()=>{
 const cases=[['image',{image:{caption:'Imagen de prueba'}}],['button',{button:{text:'Sí, quiero'}}],['interactive',{interactive:{type:'button_reply',button_reply:{id:'comprar',title:'Comprar'}}}],['location',{location:{latitude:4.7,longitude:-74,address:'Dirección, prueba'}}],['sticker',{sticker:{}}],['document',{document:{}}]];
 for(let i=0;i<cases.length;i++)await send(event(prefix+(10+i),...cases[i]));
 for(let i=0;i<cases.length;i++){const r=await waitRows(prefix+(10+i),r=>r.length===2);assert(validate(r[0].normalizado),JSON.stringify(validate.errors));assert(r[0].texto.length>0);}
});
fs.writeFileSync(new URL('integracion-resumen.json',out),JSON.stringify({run,casos:logs},null,2)+'\n');
