import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {generated,normalizeYcloud} from '../../workflows/generate_workflows.mjs';
const log=[];
const mode=process.argv[2]??'texto';
function command(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:20e6});assert.equal(r.status,0,'Falló '+args.join(' '));return r.stdout;}
function sql(q){const r=command(['exec','-i','houseturing_postgres','sh','-c','psql -X -t -A -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'],q).trim();log.push({sql:q,salida:r});return r;}
const quote=s=>"'"+s.replaceAll("'","''")+"'";
assert.equal(sql("SELECT valor FROM config WHERE clave='whatsapp_modo_simulado';"),'true');
const source=JSON.parse(fs.readFileSync(new URL('fixtures/texto_referral.json',import.meta.url))),id='mock-'+Date.now();
Object.assign(source.whatsappInboundMessage,{id,wamid:'wamid.'+id,from:'577'+Date.now().toString().slice(-10),sendTime:new Date().toISOString()});
const n=normalizeYcloud(source)[0].json;
const inserted=JSON.parse(sql(`SELECT ycloud_ingresar(${quote(JSON.stringify(n))}::jsonb);`));
const claim=JSON.parse(sql(`SELECT ycloud_reclamar(${inserted.conversacion_id},${quote(n.wamid)});`));
claim.lease=new Date(Date.now()+180000).toISOString();
const input={...claim.normalizado,lease:claim.lease,proveedor_id:n.proveedor_id,waba_id:n.waba_id,texto:'Primera, "comillas"\n\nSegunda\n\nTercera',responder_a_wamid:n.wamid};
if(mode==='plantilla') input.plantilla={name:'prueba_local',language:{code:'es'}};
if(mode==='solo-leer') input.no_responder=true;
const w=structuredClone(generated['DS-03_Enviar_WhatsApp.json']);w.id='ot05-test-transporte';w.name='OT-05 transporte contra mock LOCAL';
// Solo la copia de prueba cambia el transporte y su configuración de entrada.
// El workflow de producción y whatsapp_modo_simulado=true permanecen intactos.
const entry=w.nodes.find(n=>n.name==='Entrada');entry.type='n8n-nodes-base.code';entry.typeVersion=2;entry.parameters={jsCode:`return [{json:${JSON.stringify(input)}}];`};
w.nodes.unshift({id:'manual',name:'Inicio',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,-200],parameters:{}});w.connections.Inicio={main:[[{node:'Entrada',type:'main',index:0}]]};
const config=w.nodes.find(n=>n.name==='Configuración');config.type='n8n-nodes-base.code';config.typeVersion=2;delete config.credentials;config.parameters={jsCode:"return [{json:{simulado:false,empresa:'+573000050999'}}];"};
for(const node of w.nodes.filter(n=>n.type.endsWith('.httpRequest'))){node.parameters.url=node.parameters.url.replace('https://api.ycloud.com','http://127.0.0.1:18085');node.parameters.authentication='none';delete node.parameters.genericAuthType;delete node.credentials;}
console.log(command(['exec','-i','houseturing_n8n','n8n','import:workflow','--input=/dev/stdin'],JSON.stringify([w])));
// Importar tarda; renovar exclusivamente el lease sintético de esta prueba.
sql(`UPDATE conversaciones SET agente_ocupado_hasta=${quote(claim.lease)}::timestamptz WHERE id=${inserted.conversacion_id};`);
const before=JSON.parse(command(['exec','houseturing_n8n','node','-e',"fetch('http://127.0.0.1:18085/calls').then(r=>r.text()).then(console.log)"])).length;
const raw=command(['exec','-e','N8N_RUNNERS_BROKER_PORT=5681','houseturing_n8n','n8n','execute','--id='+w.id,'--rawOutput']);
let result;try{result=JSON.parse(raw.slice(raw.indexOf('{\n'),raw.lastIndexOf('\n}')+2));}catch{throw new Error('Salida CLI inválida; se omite para evitar información interna');}
const execution={status:result.status,error:result.data.resultData.error?.message,detalle:result.data.resultData.error?.description,nodos:Object.entries(result.data.resultData.runData??{}).map(([name,runs])=>({name,status:runs.map(r=>r.executionStatus)}))};
const rows=JSON.parse(sql(`SELECT COALESCE(json_agg(m),'[]'::json) FROM (SELECT wamid,wa_id,direccion,tipo,texto,estado,proveedor_id,autor,normalizado,creado_en FROM mensajes WHERE conversacion_id=${inserted.conversacion_id} ORDER BY creado_en) m;`));
const calls=JSON.parse(command(['exec','houseturing_n8n','node','-e',"fetch('http://127.0.0.1:18085/calls').then(r=>r.text()).then(console.log)"]));
const evidence={comando:'node tests/whatsapp/transporte_n8n.mjs '+mode,nota:'HTTP Request real de n8n contra mock local; API YCloud no llamada; config global simulada; autenticación real pendiente de parte 3',execution,log,calls};
fs.writeFileSync(new URL('../../planes/evidencia/OT-05/transporte-n8n-'+mode+'.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(execution));
assert.equal(result.status,'success');
const current=calls.slice(before),out=rows.filter(r=>r.direccion==='out');
if(mode==='solo-leer'){
 assert.equal(out.length,0);assert.equal(current.length,1);assert(current[0].path.endsWith('/markAsRead'));
}else{
 assert.equal(out.length,mode==='plantilla'?1:3);assert(out.every(r=>r.estado==='accepted'));
 assert.deepEqual(current.map(c=>c.path.endsWith('typingIndicator')?'typing':'send'),Array.from({length:out.length},()=>['typing','send']).flat());
 for(let i=0;i<current.length;i+=2)assert(current[i+1].time-current[i].time>=1400);
 if(mode==='plantilla')assert.equal(current[1].body.template.name,'prueba_local');
}
console.log('PASS C1/C8: transporte '+mode+' contra mock local y filas verificadas');
