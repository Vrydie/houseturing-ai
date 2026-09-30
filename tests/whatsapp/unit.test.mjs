import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {verifySignature,normalizeYcloud,bubbles,generated} from '../../workflows/generate_workflows.mjs';
const ajv=new Ajv({strict:false});addFormats(ajv);
const schema=JSON.parse(fs.readFileSync(new URL('../../schemas/interno_mensaje_normalizado.schema.json',import.meta.url)));
const validate=ajv.compile(schema);
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/texto_referral.json',import.meta.url)));
const raw=Buffer.from(JSON.stringify(fixture,null,2));
// Secreto efímero, solo en memoria del proceso de prueba.
const secret=crypto.randomBytes(32).toString('hex'),now=Date.now(),t=Math.floor(now/1000);
const sign=(body,time)=>`t=${time},s=${crypto.createHmac('sha256',secret).update(`${time}.`).update(body).digest('hex')}`;
test('C7: coincide con HMAC documentado y usa comparación constante',()=>{
 assert(verifySignature(raw,sign(raw,t),secret,crypto,now));
 assert(!verifySignature(Buffer.from(JSON.stringify(fixture)),sign(raw,t),secret,crypto,now));
 for(const h of ['',`t=${t},s=00`,`t=${t},s=${'z'.repeat(64)}`,sign(raw,t-301),sign(raw,t+301),sign(raw,t)+`,t=${t}`])
  assert(!verifySignature(raw,h,secret,crypto,now));
});
test('C6: todos los tipos validan contra el contrato sin propiedades de transporte',()=>{
 const cases={text:{text:{body:'hola, "sí"\nsegunda línea'}},audio:{audio:{}},image:{image:{caption:'foto'}},button:{button:{text:'Sí'}},interactive:{interactive:{button_reply:{title:'Comprar'}}},location:{location:{latitude:4.7,longitude:-74,address:'Bogotá'}},sticker:{sticker:{}},document:{document:{}}};
 for(const [type,payload] of Object.entries(cases)){
  const e=structuredClone(fixture);Object.assign(e.whatsappInboundMessage,{type},payload);
  const n=normalizeYcloud(e)[0].json;
  const normalized={wa_id:n.wa_id,nombre_perfil:n.nombre_perfil,conversacion_id:1,wamids:[n.wamid],texto:n.texto,tipos:[n.tipo],origen:n.origen,recibido_en:n.recibido_en,...(n.ubicacion?{ubicacion:n.ubicacion}:{})};
  assert(validate(normalized),JSON.stringify(validate.errors));assert(n.texto.length>0);
 }
});
test('C3: CTWA conserva atribución; origen web y orgánico',()=>{
 const n=normalizeYcloud(fixture)[0].json;assert.equal(n.origen.ad_id,'MEDIA-ID');assert(n.origen.ctwa_clid);assert.equal(n.origen.ad_headline,'Chat with us');
 const e=structuredClone(fixture);delete e.whatsappInboundMessage.referral;assert.equal(normalizeYcloud(e)[0].json.origen.tipo,'organico');
 e.whatsappInboundMessage.text.body='(web-TEST)';assert.equal(normalizeYcloud(e)[0].json.origen.tipo,'web');
});
test('Estados y ecos nunca se confunden con entrada de cliente',()=>{
 const e=JSON.parse(fs.readFileSync(new URL('fixtures/eco.json',import.meta.url)));assert.equal(normalizeYcloud(e)[0].json.autor,'humano');
 const s=JSON.parse(fs.readFileSync(new URL('fixtures/estado.json',import.meta.url)));assert.equal(normalizeYcloud(s)[0].json.accion,'estado');
 assert.deepEqual(normalizeYcloud({type:'otro'}),[]);
});
test('C8: componente aleatorio 0.5–1.5, límites y máximo tres burbujas sin truncar texto',()=>{
 const input={wa_id:'573000050001',texto:'x'.repeat(80)};
 assert(Math.abs(bubbles(input,'',()=>0)[0].waitTime-3.3)<1e-12);
 assert(Math.abs(bubbles(input,'',()=>1)[0].waitTime-4.3)<1e-12);
 assert.equal(bubbles({...input,texto:'a'},'',()=>0)[0].waitTime,1.5);
 assert.equal(bubbles({...input,texto:'a'.repeat(1000)},'',()=>1)[0].waitTime,7);
 const b=bubbles({...input,texto:'a\n\nb\n\nc\n\nd'},'');assert.equal(b.length,3);assert.equal(b[2].texto,'c\n\nd');
});
test('C1: transporte de texto/plantilla como objeto y leído/escribiendo separados',()=>{
 const texto='hola, "sí"\nsegunda línea';assert.equal(bubbles({wa_id:'573000050001',texto},'')[0].body.text.body,texto);
 const plantilla={name:'prueba',language:{code:'es'}};assert.deepEqual(bubbles({wa_id:'573000050001',plantilla},'')[0].body.template,plantilla);
 const nodes=generated['DS-03_Enviar_WhatsApp.json'].nodes;
 assert.equal(nodes.filter(n=>n.type.endsWith('.httpRequest')&&n.parameters.url.includes('/typingIndicator')).length,3);
 assert.equal(nodes.filter(n=>n.type.endsWith('.httpRequest')&&n.parameters.url.includes('/markAsRead')).length,1);
 for(const n of nodes.filter(n=>n.name.startsWith('HTTP enviar'))) {assert.equal(n.parameters.url,'https://api.ycloud.com/v2/whatsapp/messages');assert(n.parameters.jsonBody.startsWith('={{'));assert.equal(n.parameters.genericAuthType,'httpHeaderAuth');}
});
test('C2/C4: parámetros SQL en arreglos, sin secretos ni pinData en exportaciones',()=>{
 for(const w of Object.values(generated)){
  assert(!w.pinData);
  for(const n of w.nodes){if(n.parameters.options?.queryReplacement)assert.match(n.parameters.options.queryReplacement,/^=\{\{ \[/);}
  assert(!JSON.stringify(w).includes(secret));
 }
 const ds=generated['DS-01_Entrada_WhatsApp.json'];assert.equal(ds.settings.saveDataSuccessExecution,'none');assert.equal(ds.settings.saveDataErrorExecution,'none');
 assert.equal(ds.nodes.filter(n=>n.type.endsWith('.webhook')).length,1);assert.equal(ds.nodes.find(n=>n.type.endsWith('.webhook')).parameters.responseMode,'onReceived');
});
