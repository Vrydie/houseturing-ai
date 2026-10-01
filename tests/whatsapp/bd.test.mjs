import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {normalizeYcloud} from '../../workflows/generate_workflows.mjs';
const prefix='578'+Date.now().toString().slice(-8),log=[];
const escape=s=>"'"+s.replaceAll("'","''")+"'";
function sql(query){const r=spawnSync('docker',['exec','-i','houseturing_postgres','sh','-c','psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'],{input:query,encoding:'utf8'});log.push({comando:query,salida:r.stdout.trim(),error:r.stderr.trim()});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/texto_referral.json',import.meta.url)));
function normalized(suffix,type='text',extra={text:{body:'hola, "dos"\nO\'Brien'}}){const e=structuredClone(fixture);Object.assign(e.whatsappInboundMessage,{from:prefix+'01',id:prefix+suffix,wamid:'wamid.'+prefix+suffix,sendTime:new Date().toISOString(),type},extra);return normalizeYcloud(e)[0].json;}
function ingest(n){return JSON.parse(sql(`SELECT ycloud_ingresar(${escape(JSON.stringify(n))}::jsonb);`));}
const n=normalized('01'),a=ingest(n);assert.equal(a.accion,'entrada');assert.equal(ingest(n).accion,'duplicado');
const loc=normalized('02','location',{location:{latitude:4.7,longitude:-74,address:'Calle, "prueba"'}});ingest(loc);const last=normalized('03');ingest(last);
const claim=JSON.parse(sql(`SELECT ycloud_reclamar(${a.conversacion_id},${escape(last.wamid)});`));assert.equal(claim.accion,'responder');assert.equal(claim.normalizado.wamids.length,3);assert.equal(claim.normalizado.ubicacion.latitud,4.7);assert.equal(claim.normalizado.origen.tipo,'ctwa');
const second=JSON.parse(sql(`SELECT ycloud_reclamar(${a.conversacion_id},${escape(last.wamid)});`));assert.equal(second.accion,'reintentar');
const old=JSON.parse(sql(`SELECT ycloud_reclamar(${a.conversacion_id},${escape(n.wamid)});`));assert.equal(old.accion,'terminar');
const human={...normalized('04'),autor:'humano'};assert.equal(ingest(human).accion,'eco');
assert.equal(JSON.parse(sql(`SELECT ycloud_reclamar(${a.conversacion_id},${escape(last.wamid)});`)).accion,'terminar');
const rows=JSON.parse(sql(`SELECT json_agg(m) FROM (SELECT wamid,wa_id,conversacion_id,direccion,tipo,texto,proveedor_id,waba_id,autor,normalizado FROM mensajes WHERE conversacion_id=${a.conversacion_id} ORDER BY creado_en) m;`));assert.equal(rows.length,4);assert.equal(rows[3].autor,'humano');
const conv=JSON.parse(sql(`SELECT row_to_json(c) FROM conversaciones c WHERE id=${a.conversacion_id};`));assert.equal(conv.bot_activo,false);assert.equal(conv.motivo_escalamiento,'humano_respondio_desde_app');
// No borrar filas: los datos sintéticos permanecen identificables por prefijo.
fs.writeFileSync(new URL('../../planes/evidencia/OT-05/transacciones-bd.json',import.meta.url),JSON.stringify({comando:'node tests/whatsapp/bd.test.mjs',resultado:'PASS',prefix,pruebas:['C2: comas/comillas/saltos','C3: contacto/conversación/CTWA','C5: claim único y último mensaje','C6: ubicación persistida en ráfaga','eco: pausa humana'],log},null,2)+'\n');
console.log('PASS: dedupe, CTWA, SQL especial, ráfaga persistente, bloqueo y pausa humana en dropship');
