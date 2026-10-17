import fs from 'fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// R7: Consultar Cobertura (JS Normalization + Safe Query)
const consultarCoberturaWorkflow = {
  id: "c6918d23-a831-42b2-b67a-493b9b1c07cf",
  name: "DS-T1 consultar_cobertura",
  nodes: [
    {
      parameters: {},
      id: "trigger",
      name: "Execute Workflow Trigger",
      type: "n8n-nodes-base.executeWorkflowTrigger",
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {
        jsCode: `
const input = $input.first().json;
const normalize = (str) => {
  if (!str) return null;
  return str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
};
return [{ json: {
  ciudad_norm: normalize(input.ciudad),
  departamento_norm: normalize(input.departamento)
}}];
        `
      },
      id: "code_normalize",
      name: "Normalizar Ciudad",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [200, 0]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT ciudad, departamento, acepta_contraentrega, dias_entrega_min, dias_entrega_max FROM cobertura WHERE ciudad_norm = $1",
        options: {
          queryReplacement: "={{ [$json.ciudad_norm] }}"
        }
      },
      id: "pg",
      name: "Postgres Cobertura",
      alwaysOutputData: true,
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.3,
      credentials: { postgres: { id: "b1b2JJ18qDVF2dWp", name: "Postgres" } },
      position: [400, 0]
    },
    {
      parameters: {
        jsCode: `
const items = $input.all().map(i => i.json).filter(row => row.ciudad);
if (items.length === 0) return [{ json: { cubierto: false } }];
if (items.length === 1) {
  const row = items[0];
  const dias = row.dias_entrega_min === row.dias_entrega_max 
    ? row.dias_entrega_min + " d├¡as h├íbiles"
    : row.dias_entrega_min + " a " + row.dias_entrega_max + " d├¡as h├íbiles";
  
  return [{ json: { 
    cubierto: true, 
    ciudad_oficial: row.ciudad, 
    departamento_oficial: row.departamento,
    acepta_contraentrega: row.acepta_contraentrega,
    dias_entrega: dias
  } }];
}
return [{ json: { opciones: items } }];
        `
      },
      id: "code_format",
      name: "Code Format",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [600, 0]
    }
  ],
  connections: {
    "Execute Workflow Trigger": { main: [ [ { node: "Normalizar Ciudad", type: "main", index: 0 } ] ] },
    "Normalizar Ciudad": { main: [ [ { node: "Postgres Cobertura", type: "main", index: 0 } ] ] },
    "Postgres Cobertura": { main: [ [ { node: "Code Format", type: "main", index: 0 } ] ] }
  }
};

// Funciones compartidas entre el generador y las pruebas; se incrustan en Code.
export function verifySignature(raw, header, secret, crypto, now = Date.now()) {
  if (!secret || typeof header !== 'string') return false;
  const parts = header.split(',').map(s => s.trim());
  const timestamps = parts.filter(s => /^t=\d+$/.test(s));
  const signatures = parts.filter(s => /^s=[a-fA-F0-9]{64}$/.test(s));
  if (timestamps.length !== 1 || signatures.length !== 1 || parts.length !== 2) return false;
  const t = timestamps[0].slice(2);
  if (Math.abs(now / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(t + '.').update(raw).digest();
  const actual = Buffer.from(signatures[0].slice(2), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
export function normalizeYcloud(event) {
  if (event.type === 'whatsapp.message.updated') {
    const m = event.whatsappMessage;
    if (!m?.id || !['accepted','sent','delivered','read','failed'].includes(m.status)) return [];
    return [{json:{accion:'estado',proveedor_id:m.id,wamid:m.wamid || null,estado:m.status}}];
  }
  const human = event.type === 'whatsapp.smb.message.echoes';
  if (!human && event.type !== 'whatsapp.inbound_message.received') return [];
  const m = human ? event.whatsappMessage : event.whatsappInboundMessage;
  if (!m?.id || !m.wamid || !m.sendTime) return [];
  const wa_id = String(human ? m.to : m.from).replace(/^\+/, '');
  if (!/^\d{8,15}$/.test(wa_id) || !Number.isFinite(Date.parse(m.sendTime))) return [];
  const allowed = ['text','audio','image','button','interactive','location','sticker'];
  const tipo = allowed.includes(m.type) ? m.type : 'other';
  let texto = '';
  let ubicacion;
  switch (tipo) {
    case 'text': texto = m.text?.body ?? ''; break;
    case 'audio': texto = '[nota de voz sin transcribir]'; break;
    case 'image': texto = ('[imagen] ' + (m.image?.caption ?? '')).trim(); break;
    case 'button': texto = m.button?.text ?? m.button?.payload ?? ''; break;
    case 'interactive': texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? m.interactive?.nfm_reply?.body ?? '[interactivo]'; break;
    case 'location':
      if (!Number.isFinite(m.location?.latitude) || !Number.isFinite(m.location?.longitude)) return [];
      ubicacion = {latitud:m.location.latitude,longitud:m.location.longitude,direccion:m.location.address ?? null};
      texto = `[ubicaci├│n] ${ubicacion.latitud}, ${ubicacion.longitud}${ubicacion.direccion ? ' '+ubicacion.direccion : ''}`; break;
    case 'sticker': texto = '[sticker]'; break;
    default: texto = '[mensaje no compatible]';
  }
  const r = m.referral;
  const match = texto.match(/\((web|tt|ig|fb|st|gr)-([^)]+)\)/);
  return [{json:{accion:'mensaje',wa_id,nombre_perfil:m.customerProfile?.name ?? null,
    wamid:m.wamid,proveedor_id:m.id,waba_id:m.wabaId ?? null,autor:human?'humano':'cliente',
    tipo,texto,estado:human?(m.status ?? 'sent'):null,recibido_en:new Date(m.sendTime).toISOString(),
    origen:{tipo:r?'ctwa':(match?match[1]:'organico'), sku:match?match[2]:null,
      ctwa_clid:r?.ctwa_clid ?? null,ad_id:r?.source_id ?? null,ad_headline:r?.headline ?? null},
    ...(ubicacion?{ubicacion}:{})}}];
}
export function bubbles(input, empresa, random = Math.random) {
  const partes = input.plantilla ? [null] : String(input.texto ?? '').split(/\n\s*\n/).filter(s=>s.trim());
  // M├íximo tres burbujas, sin perder p├írrafos adicionales.
  if (partes.length > 3) partes.splice(2, partes.length-2, partes.slice(2).join('\n\n'));
  return partes.map(texto=>({
    texto,waitTime:0,
    body:{from:empresa,to:'+'+input.wa_id,type:input.plantilla?'template':'text',
      ...(input.plantilla?{template:input.plantilla}:{text:{body:texto},...(input.responder_a_wamid?{context:{message_id:input.responder_a_wamid}}:{})})}
  }));
}

const ids = {entrada:'8c5216d4-f62a-47c8-8658-96164bebdf4b',stub:'ae42ab9a-9d5c-40fb-b18b-b8626c78b51b',enviar:'a0c7abce-0081-4c80-aa6a-72f4200ec489'};
const credential = {postgres:{id:'ot05-postgres',name:'Postgres dropship'}};
const settings = {executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,saveExecutionProgress:false};
function workflow(id,name) { return {id,name,active:false,nodes:[],connections:{},settings}; }
function node(w,name,type,parameters={},version=1,extras={}) {
  w.nodes.push({id:name,name,type:'n8n-nodes-base.'+type,typeVersion:version,position:[w.nodes.length%7*240,Math.floor(w.nodes.length/7)*240],parameters,...extras});return name;
}
function link(w,a,b,output=0) {
  w.connections[a]??={main:[]};w.connections[a].main[output]??=[];
  w.connections[a].main[output].push({node:b,type:'main',index:0});
}
const code=(w,n,js)=>node(w,n,'code',{jsCode:js},2);
const pg=(w,n,q,params)=>node(w,n,'postgres',{operation:'executeQuery',query:q,options:params?{queryReplacement:params}:{}},2.6,{credentials:credential});
const iff=(w,n,expr)=>node(w,n,'if',{conditions:{boolean:[{value1:expr,value2:true}]}},1);
const wait=(w,n,seconds)=>node(w,n,'wait',{amount:seconds,unit:'seconds'},1.1,{webhookId:'ot05-'+n.replace(/\W/g,'-')});
function request(w,name,url,body) {
  return node(w,name,'httpRequest',{method:'POST',url,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',
    ...(body?{sendBody:true,specifyBody:'json',jsonBody:body}:{}),options:{timeout:15000}},4.2,
    {credentials:{httpHeaderAuth:{id:'ot05-ycloud',name:'YCloud API (parte 3)'}}});
}
const inputTrigger=w=>node(w,'Entrada','executeWorkflowTrigger',{},1);
const unwrap=(w,n)=>code(w,n,'return [{json:$json.data}];');


const stubWorkflow = JSON.parse(fs.readFileSync(new URL('./DS-02_stub.json', import.meta.url)));
const crearPedidoWorkflow = JSON.parse(fs.readFileSync(new URL('./DS-T2_crear_pedido_contraentrega.json', import.meta.url)));
const generarLinkWorkflow = JSON.parse(fs.readFileSync(new URL('./DS-T3_generar_link_pago.json', import.meta.url)));
const consultarEstadoWorkflow = JSON.parse(fs.readFileSync(new URL('./DS-T4_consultar_estado.json', import.meta.url)));
const escalarHumanoWorkflow = JSON.parse(fs.readFileSync(new URL('./DS-T5_escalar_a_humano.json', import.meta.url)));

const entradaWhatsappWorkflow=workflow(ids.entrada,'DS-01 Entrada WhatsApp');
const e=entradaWhatsappWorkflow;
node(e,'Webhook POST','webhook',{httpMethod:'POST',path:'whatsapp',responseMode:'onReceived',options:{rawBody:true}},2,{webhookId:'whatsapp-in-post'});
pg(e,'Leer secreto',"SELECT valor FROM config WHERE clave='ycloud_webhook_secret'");
code(e,'Leer cuerpo crudo',"const raw=await this.helpers.getBinaryDataBuffer(0,'data');return [{json:{raw:raw.toString('utf8'),headers:$json.headers}}];");
code(e,'Verificar firma',`${verifySignature.toString()}
const incoming=$('Leer cuerpo crudo').first().json;
if (!verifySignature(Buffer.from(incoming.raw,'utf8'),incoming.headers['ycloud-signature'],$json.valor,require('crypto'))) return [];
let event;try {event=JSON.parse(incoming.raw);}catch{return [];}
return [{json:event}];`);
code(e,'Normalizar YCloud',`${normalizeYcloud.toString()}\nreturn normalizeYcloud($json);`);
iff(e,'Es estado',"={{ $json.accion === 'estado' }}");
pg(e,'Actualizar estado',`UPDATE mensajes SET estado=$1,wamid=COALESCE($3,wamid)
WHERE direccion='out' AND (proveedor_id=$2 OR wamid=$3) RETURNING wamid,estado`,"={{ [$json.estado,$json.proveedor_id,$json.wamid] }}");
pg(e,'Ingresar mensaje','SELECT ycloud_ingresar($1::jsonb) AS data',"={{ [JSON.stringify($json)] }}");
unwrap(e,'Resultado ingreso');
iff(e,'Es entrada',"={{ $json.accion === 'entrada' }}");
iff(e,'Solo lectura',"={{ $json.accion === 'solo_leer' }}");
code(e,'Preparar le├¡do',"return [{json:{...$json,no_responder:true}}];");
node(e,'Marcar le├¡do','executeWorkflow',{workflowId:ids.enviar,options:{waitForSubWorkflow:true}},1);
wait(e,'Debounce',0);
code(e,'Iniciar intentos',"return [{json:{...$json,intento:0}}];");
pg(e,'Reclamar turno','SELECT ycloud_reclamar($1::bigint,$2) AS data, $3::integer AS intento',"={{ [$json.conversacion_id,$json.wamid,$json.intento] }}");
code(e,'Resultado turno',"return [{json:{...$json.data,intento:$json.intento}}];");
iff(e,'Turno listo',"={{ $json.accion === 'responder' }}");
iff(e,'Reintentar bloqueo',"={{ $json.accion === 'reintentar' && $json.intento < 5 }}");
wait(e,'Esperar bloqueo',3);
code(e,'Siguiente intento',"return [{json:{...$('Resultado ingreso').first().json,intento:$json.intento+1}}];");
code(e,'Contrato DS02',"return [{json:$json.normalizado}];");
node(e,'Call Stub','executeWorkflow',{workflowId:ids.stub,options:{waitForSubWorkflow:true}},1);
code(e,'Contexto transporte',"const t=$('Resultado turno').last().json;return [{json:{...$json,lease:t.lease,proveedor_id:t.proveedor_id,waba_id:t.waba_id,responder_a_wamid:$json.wamids.at(-1)}}];");
node(e,'Call Send','executeWorkflow',{workflowId:ids.enviar,options:{waitForSubWorkflow:true}},1);
for(const [a,b,o] of [
 ['Webhook POST','Leer cuerpo crudo'],['Leer cuerpo crudo','Leer secreto'],['Leer secreto','Verificar firma'],['Verificar firma','Normalizar YCloud'],['Normalizar YCloud','Es estado'],
 ['Es estado','Actualizar estado'],['Es estado','Ingresar mensaje',1],['Ingresar mensaje','Resultado ingreso'],['Resultado ingreso','Es entrada'],
 ['Es entrada','Debounce'],['Es entrada','Solo lectura',1],['Solo lectura','Preparar le├¡do'],['Preparar le├¡do','Marcar le├¡do'],
 ['Debounce','Iniciar intentos'],['Iniciar intentos','Reclamar turno'],['Reclamar turno','Resultado turno'],['Resultado turno','Turno listo'],
 ['Turno listo','Contrato DS02'],['Turno listo','Reintentar bloqueo',1],['Reintentar bloqueo','Esperar bloqueo'],
 ['Esperar bloqueo','Siguiente intento'],['Siguiente intento','Reclamar turno'],['Contrato DS02','Call Stub'],['Call Stub','Contexto transporte'],['Contexto transporte','Call Send']]) link(e,a,b,o);

const enviarWhatsappWorkflow=workflow(ids.enviar,'DS-03 Enviar WhatsApp');const s=enviarWhatsappWorkflow;
inputTrigger(s);
pg(s,'Configuraci├│n',`SELECT COALESCE((SELECT valor FROM config WHERE clave='whatsapp_modo_simulado'),'true')='true' AS simulado,
 COALESCE((SELECT valor FROM config WHERE clave='ycloud_numero_empresa'),'') AS empresa`);
code(s,'Preparar env├¡o',`${bubbles.toString()}
const p=$('Entrada').first().json;
if(!$json.simulado && !/^\\+?\\d{8,15}$/.test($json.empresa)) throw new Error('Configurar el n├║mero de empresa antes de modo real');
return [{json:{...p,simulado:$json.simulado,burbujas:bubbles(p,$json.empresa)}}];`);
iff(s,'Sin respuesta',"={{ $json.no_responder === true || $json.burbujas.length === 0 }}");
iff(s,'Le├¡do simulado',"={{ $json.simulado }}");
request(s,'HTTP marcar le├¡do',"={{ 'https://api.ycloud.com/v2/whatsapp/inboundMessages/'+encodeURIComponent($('Preparar env├¡o').first().json.proveedor_id)+'/markAsRead' }}");
code(s,'Le├¡do sin red',"return [{json:{simulado:true,accion:'markAsRead',proveedor_id:$json.proveedor_id}}];");
pg(s,'Liberar turno',`UPDATE conversaciones SET agente_ocupado_hasta=NULL WHERE id=$1 AND agente_ocupado_hasta=$2::timestamptz RETURNING id`,"={{ [$('Entrada').first().json.conversacion_id,$('Entrada').first().json.lease ?? null] }}");
link(s,'Entrada','Configuraci├│n');link(s,'Configuraci├│n','Preparar env├¡o');link(s,'Preparar env├¡o','Sin respuesta');
link(s,'Sin respuesta','Le├¡do simulado');link(s,'Le├¡do simulado','Le├¡do sin red');link(s,'Le├¡do simulado','HTTP marcar le├¡do',1);
link(s,'Le├¡do sin red','Liberar turno');link(s,'HTTP marcar le├¡do','Liberar turno');
for(let i=0;i<3;i++) {
  const check='Revisar turno '+i, part='Burbuja '+i, allowed='Enviar burbuja '+i, sim='Simulado '+i, typing='HTTP escribiendo '+i,
    delay='Ritmo '+i, mode='Transporte '+i, fake='Respuesta simulada '+i, http='HTTP enviar '+i, save='Guardar salida '+i, recheck='Revisar despu├®s de espera '+i, sendAllowed='Vigente '+i;
  const guard=`SELECT (c.bot_activo AND c.agente_ocupado_hasta=$2::timestamptz AND c.agente_ocupado_hasta>now()
    AND NOT EXISTS(SELECT 1 FROM mensajes WHERE conversacion_id=c.id AND direccion='in' AND NOT (wamid=ANY($3::text[])) AND NOT procesado)) AS permitido
    FROM conversaciones c WHERE c.id=$1`;
  const args="={{ [$('Entrada').first().json.conversacion_id,$('Entrada').first().json.lease,$('Entrada').first().json.wamids] }}";
  pg(s,check,guard,args);
  code(s,part,`const p=$('Preparar env├¡o').first().json;return [{json:{...p,...p.burbujas[${i}],permitido:$json.permitido && p.burbujas.length>${i}}}];`);
  iff(s,allowed,"={{ $json.permitido }}");iff(s,sim,"={{ $json.simulado }}");
  request(s,typing,`={{ 'https://api.ycloud.com/v2/whatsapp/inboundMessages/'+encodeURIComponent($('${part}').first().json.proveedor_id)+'/typingIndicator' }}`);
  wait(s,delay,0);
  pg(s,recheck,guard,args);iff(s,sendAllowed,"={{ $json.permitido }}");
  iff(s,mode,`={{ $('${part}').first().json.simulado }}`);
  code(s,fake,`return [{json:{id:'sim-'+$execution.id+'-${i}',status:'simulado'}}];`);
  request(s,http,'https://api.ycloud.com/v2/whatsapp/messages',`={{ $('${part}').first().json.body }}`);
  pg(s,save,`WITH saved AS (
   INSERT INTO mensajes(wamid,wa_id,conversacion_id,direccion,tipo,texto,estado,proveedor_id,waba_id,autor,procesado,normalizado)
   VALUES(COALESCE($1,'ycloud:'||$2),$3,$4,'out',$5,$6,$7,$2,$8,'bot',true,$9::jsonb)
   ON CONFLICT(wamid) DO NOTHING RETURNING wamid)
   UPDATE mensajes SET procesado=true WHERE direccion='in' AND conversacion_id=$4 AND wamid=ANY($10::text[])
   AND EXISTS(SELECT 1 FROM saved) RETURNING wamid`,
   `={{ [$json.wamid ?? null,$json.id,$('${part}').first().json.wa_id,$('${part}').first().json.conversacion_id,$('${part}').first().json.body.type,$('${part}').first().json.texto ?? null,$json.status,$('${part}').first().json.waba_id,JSON.stringify($('${part}').first().json.body),$('Entrada').first().json.wamids] }}`);
  // Devuelve una fila aunque la r├ífaga ya se haya marcado en la primera burbuja.
  s.nodes.find(n=>n.name===save).alwaysOutputData=true;
  link(s,i===0?'Sin respuesta':'Guardar salida '+(i-1),check,i===0?1:0);
  for(const [a,b,o] of [[check,part],[part,allowed],[allowed,sim],[allowed,'Liberar turno',1],[sim,delay],[sim,typing,1],
    [typing,delay],[delay,recheck],[recheck,sendAllowed],[sendAllowed,mode],[sendAllowed,'Liberar turno',1],
    [mode,fake],[mode,http,1],[fake,save],[http,save]])link(s,a,b,o);
}
link(s,'Guardar salida 2','Liberar turno');

// DS-T1 se conserva de la base indicada; solo referencia local de credencial.
consultarCoberturaWorkflow.nodes.filter(n=>n.type==='n8n-nodes-base.postgres').forEach(n=>n.credentials=credential);

const generated = {
  'DS-01_Entrada_WhatsApp.json': e,
  'DS-02_stub.json': stubWorkflow,
  'DS-03_Enviar_WhatsApp.json': s,
  'DS-T1_consultar_cobertura.json': consultarCoberturaWorkflow,
  'DS-T2_crear_pedido.json': crearPedidoWorkflow,
  'DS-T3_generar_link_pago.json': generarLinkWorkflow,
  'DS-T4_consultar_estado.json': consultarEstadoWorkflow,
  'DS-T5_escalar_a_humano.json': escalarHumanoWorkflow
};
export {generated};
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  for(const [file,w] of Object.entries(generated)) fs.writeFileSync(new URL(file,import.meta.url),JSON.stringify(w,null,2)+'\n');
  console.log('Generados ocho workflows combinando YCloud y Checkout Agent');
}
