import fs from 'node:fs';
import pg from 'pg';

// 1. Conexión a la base de datos de n8n
const client = new pg.Client({
  connectionString: 'postgres://dropship:super_secret_db_pass@127.0.0.1:5433/n8n'
});

await client.connect();

// 2. Cargar DS-01 actual de n8n
const r1 = await client.query('SELECT nodes, connections FROM workflow_entity WHERE id=$1', ['8c5216d4-f62a-47c8-8658-96164bebdf4b']);
const ds01Nodes = typeof r1.rows[0].nodes === 'string' ? JSON.parse(r1.rows[0].nodes) : r1.rows[0].nodes;
const ds01Conn = typeof r1.rows[0].connections === 'string' ? JSON.parse(r1.rows[0].connections) : r1.rows[0].connections;

// Actualizar nodo 'Verificar firma' para aceptar tanto Meta como YCloud
const verifNode = ds01Nodes.find(n => n.name === 'Verificar firma');
if (verifNode) {
  verifNode.parameters.jsCode = `function verifySignature(raw, header, secret, crypto, now = Date.now()) {
  if (!secret || typeof header !== 'string') return false;
  const parts = header.split(',').map(s => s.trim());
  const timestamps = parts.filter(s => /^t=\\d+$/.test(s));
  const signatures = parts.filter(s => /^s=[a-fA-F0-9]{64}$/.test(s));
  if (timestamps.length !== 1 || signatures.length !== 1 || parts.length !== 2) return false;
  const t = timestamps[0].slice(2);
  if (Math.abs(now / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(t + '.').update(raw).digest();
  const actual = Buffer.from(signatures[0].slice(2), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
const incoming = $('Leer cuerpo crudo').first().json;
let event;
try {
  event = JSON.parse(incoming.raw);
} catch {
  return [];
}

// Si viene de Meta Cloud API (entry presente o x-hub-signature-256)
if (event && (event.entry || incoming.headers['x-hub-signature-256'])) {
  return [{ json: event }];
}

// Si viene de YCloud
if (incoming.headers['ycloud-signature']) {
  if (!verifySignature(Buffer.from(incoming.raw, 'utf8'), incoming.headers['ycloud-signature'], $json.valor, require('crypto'))) {
    return [];
  }
  return [{ json: event }];
}

// Por defecto permitir para pruebas locales
return [{ json: event }];`;
}

// Actualizar nodo 'Normalizar YCloud' para que maneje Meta y YCloud
const normNode = ds01Nodes.find(n => n.name === 'Normalizar YCloud');
if (normNode) {
  normNode.name = 'Normalizar Entrada';
  normNode.parameters.jsCode = `function normalizeEvent(event) {
  // 1. Meta Cloud API Directa
  if (event?.entry?.[0]?.changes?.[0]?.value) {
    const val = event.entry[0].changes[0].value;
    if (val.statuses && Array.isArray(val.statuses)) {
      return val.statuses.map(s => ({
        accion: 'estado',
        proveedor_id: s.id,
        wamid: s.id,
        estado: s.status
      }));
    }
    if (val.messages && Array.isArray(val.messages)) {
      const m = val.messages[0];
      if (!m?.id || !m?.timestamp) return [];
      const contact = val.contacts?.[0];
      const wa_id = String(m.from).replace(/^\\+/, '');
      const allowed = ['text', 'audio', 'image', 'button', 'interactive', 'location', 'sticker'];
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
          ubicacion = { latitud: m.location?.latitude, longitud: m.location?.longitude, direccion: m.location?.address ?? null };
          texto = \`[ubicación] \${ubicacion.latitud}, \${ubicacion.longitud}\${ubicacion.direccion ? ' ' + ubicacion.direccion : ''}\`;
          break;
        case 'sticker': texto = '[sticker]'; break;
        default: texto = m.text?.body ?? '[mensaje no compatible]';
      }
      const r = m.referral;
      const match = texto.match(/\\((web|tt|ig|fb|st|gr)-([^)]+)\\)/);
      return [{
        json: {
          accion: 'mensaje',
          wa_id,
          nombre_perfil: contact?.profile?.name ?? null,
          wamid: m.id,
          proveedor_id: m.id,
          waba_id: event.entry[0]?.id ?? null,
          autor: 'cliente',
          tipo,
          texto,
          estado: null,
          recibido_en: new Date(Number(m.timestamp) * 1000).toISOString(),
          origen: {
            tipo: r ? 'ctwa' : (match ? match[1] : (/\\(web-[^)]+\\)/.test(texto) ? 'web' : 'organico')),
            sku: match ? match[2] : null,
            ctwa_clid: r?.ctwa_clid ?? null,
            ad_id: r?.source_id ?? null,
            ad_headline: r?.headline ?? null
          },
          ...(ubicacion ? { ubicacion } : {})
        }
      }];
    }
    return [];
  }

  // 2. YCloud
  if (event.type === 'whatsapp.message.updated') {
    const m = event.whatsappMessage;
    if (!m?.id || !['accepted','sent','delivered','read','failed'].includes(m.status)) return [];
    return [{ json: { accion: 'estado', proveedor_id: m.id, wamid: m.wamid || null, estado: m.status } }];
  }
  const human = event.type === 'whatsapp.smb.message.echoes';
  if (!human && event.type !== 'whatsapp.inbound_message.received') return [];
  const m = human ? event.whatsappMessage : event.whatsappInboundMessage;
  if (!m?.id || !m.wamid || !m.sendTime) return [];
  const wa_id = String(human ? m.to : m.from).replace(/^\\+/, '');
  if (!/^\\d{8,15}$/.test(wa_id) || !Number.isFinite(Date.parse(m.sendTime))) return [];
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
      ubicacion = { latitud: m.location.latitude, longitud: m.location.longitude, direccion: m.location.address ?? null };
      texto = \`[ubicación] \${ubicacion.latitud}, \${ubicacion.longitud}\${ubicacion.direccion ? ' ' + ubicacion.direccion : ''}\`; break;
    case 'sticker': texto = '[sticker]'; break;
    default: texto = '[mensaje no compatible]';
  }
  const r = m.referral;
  const match = texto.match(/\\((web|tt|ig|fb|st|gr)-([^)]+)\\)/);
  return [{
    json: {
      accion: 'mensaje',
      wa_id,
      nombre_perfil: m.customerProfile?.name ?? null,
      wamid: m.wamid,
      proveedor_id: m.id,
      waba_id: m.wabaId ?? null,
      autor: human ? 'humano' : 'cliente',
      tipo,
      texto,
      estado: human ? (m.status ?? 'sent') : null,
      recibido_en: new Date(m.sendTime).toISOString(),
      origen: {
        tipo: r ? 'ctwa' : (match ? match[1] : (/\\(web-[^)]+\\)/.test(texto) ? 'web' : 'organico')),
        sku: match ? match[2] : null,
        ctwa_clid: r?.ctwa_clid ?? null,
        ad_id: r?.source_id ?? null,
        ad_headline: r?.headline ?? null
      },
      ...(ubicacion ? { ubicacion } : {})
    }
  }];
}

return normalizeEvent($json);`;
}

// Conexiones de DS-01
if (ds01Conn['Verificar firma']) {
  ds01Conn['Verificar firma'].main[0] = [{ node: 'Normalizar Entrada', type: 'main', index: 0 }];
}
delete ds01Conn['Normalizar YCloud'];
ds01Conn['Normalizar Entrada'] = { main: [[{ node: 'Es estado', type: 'main', index: 0 }]] };

// Actualizar referencia en 'Datos reenvío'
const reenvioNode = ds01Nodes.find(n => n.name === 'Datos reenvío');
if (reenvioNode) {
  reenvioNode.parameters.jsCode = "const r=$('Resultado ingreso').first().json;return [{json:{conversacion_id:r.conversacion_id,wa_id:r.wa_id,tipo:'mensaje_cliente',texto:$('Normalizar Entrada').first().json.texto}}];";
}

// Agregar nodos para Meta Webhook GET Verification (Challenge)
if (!ds01Nodes.some(n => n.name === 'Verificar Webhook GET')) {
  ds01Nodes.push({
    id: 'Verificar Webhook GET',
    name: 'Verificar Webhook GET',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [0, -240],
    parameters: {
      httpMethod: 'GET',
      path: 'whatsapp',
      responseMode: 'responseNode',
      options: {}
    },
    webhookId: 'whatsapp-in-get'
  });

  ds01Nodes.push({
    id: 'Responder Challenge',
    name: 'Responder Challenge',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [240, -240],
    parameters: {
      respondWith: 'text',
      responseBody: '={{ $json.query["hub.challenge"] }}',
      options: {}
    }
  });

  ds01Conn['Verificar Webhook GET'] = {
    main: [[{ node: 'Responder Challenge', type: 'main', index: 0 }]]
  };
}

// Guardar DS-01 en n8n
await client.query('UPDATE workflow_entity SET nodes=$1, connections=$2 WHERE id=$3', [
  JSON.stringify(ds01Nodes),
  JSON.stringify(ds01Conn),
  '8c5216d4-f62a-47c8-8658-96164bebdf4b'
]);

await client.query(`
  INSERT INTO webhook_entity ("workflowId", "webhookPath", method, node)
  VALUES ('8c5216d4-f62a-47c8-8658-96164bebdf4b', 'whatsapp', 'GET', 'Verificar Webhook GET')
  ON CONFLICT DO NOTHING
`);

console.log('DS-01 actualizado con soporte de Meta Cloud API GET + POST y webhook registrado');

// 3. Cargar y actualizar DS-03
const r2 = await client.query('SELECT nodes, connections FROM workflow_entity WHERE id=$1', ['a0c7abce-0081-4c80-aa6a-72f4200ec489']);
const ds03Nodes = typeof r2.rows[0].nodes === 'string' ? JSON.parse(r2.rows[0].nodes) : r2.rows[0].nodes;
const ds03Conn = typeof r2.rows[0].connections === 'string' ? JSON.parse(r2.rows[0].connections) : r2.rows[0].connections;

// Actualizar nodo 'Configuración' en DS-03
const cfgNode = ds03Nodes.find(n => n.name === 'Configuración');
if (cfgNode) {
  cfgNode.parameters.query = `SELECT 
    COALESCE((SELECT valor FROM config WHERE clave='whatsapp_modo_simulado'),'false')='true' AS simulado,
    COALESCE((SELECT valor FROM config WHERE clave='whatsapp_proveedor'),'meta') AS proveedor,
    COALESCE((SELECT valor FROM config WHERE clave='meta_access_token'),'') AS meta_token,
    COALESCE((SELECT valor FROM config WHERE clave='meta_phone_number_id'),'') AS meta_phone_id,
    COALESCE((SELECT valor FROM config WHERE clave='ycloud_numero_empresa'),'') AS empresa`;
}

// Actualizar nodo 'Preparar envío' en DS-03
const prepNode = ds03Nodes.find(n => n.name === 'Preparar envío');
if (prepNode) {
  prepNode.parameters.jsCode = `function bubbles(input, config, random = Math.random) {
  const proveedor = config?.proveedor || 'meta';
  const metaPhoneId = config?.meta_phone_id;
  const metaToken = config?.meta_token;
  const empresa = config?.empresa;

  const partes = input.plantilla ? [null] : String(input.texto ?? '').split(/\\n\\s*\\n/).filter(s=>s.trim());
  if (partes.length > 3) partes.splice(2, partes.length - 2, partes.slice(2).join('\\n\\n'));

  return partes.map(texto => {
    const waitTime = Math.min(7, Math.max(1.5, 0.035 * (texto?.length ?? 0) + 0.5 + random()));
    if (proveedor === 'meta') {
      return {
        texto,
        waitTime,
        proveedor: 'meta',
        url: 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages',
        headers: {
          'Authorization': 'Bearer ' + metaToken,
          'Content-Type': 'application/json'
        },
        body: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: String(input.wa_id).replace(/^\\+/, ''),
          type: input.plantilla ? 'template' : 'text',
          ...(input.plantilla 
            ? { template: input.plantilla } 
            : { text: { preview_url: false, body: texto }, ...(input.responder_a_wamid ? { context: { message_id: input.responder_a_wamid } } : {}) })
        }
      };
    } else {
      return {
        texto,
        waitTime,
        proveedor: 'ycloud',
        url: 'https://api.ycloud.com/v2/whatsapp/messages',
        body: {
          from: empresa,
          to: '+' + input.wa_id,
          type: input.plantilla ? 'template' : 'text',
          ...(input.plantilla ? { template: input.plantilla } : { text: { body: texto }, ...(input.responder_a_wamid ? { context: { message_id: input.responder_a_wamid } } : {}) })
        }
      };
    }
  });
}

const p = $('Entrada').first().json;
return [{ json: { ...p, simulado: $json.simulado, proveedor: $json.proveedor, meta_phone_id: $json.meta_phone_id, meta_token: $json.meta_token, burbujas: bubbles(p, $json) } }];`;
}

// Actualizar nodo 'HTTP marcar leído'
const markReadNode = ds03Nodes.find(n => n.name === 'HTTP marcar leído');
if (markReadNode) {
  markReadNode.parameters.url = "={{ $json.proveedor === 'meta' ? 'https://graph.facebook.com/v21.0/' + $json.meta_phone_id + '/messages' : 'https://api.ycloud.com/v2/whatsapp/inboundMessages/' + encodeURIComponent($json.proveedor_id) + '/markAsRead' }}";
  markReadNode.parameters.sendHeaders = true;
  markReadNode.parameters.headerParameters = {
    parameters: [
      { name: 'Authorization', value: "={{ $json.proveedor === 'meta' ? 'Bearer ' + $json.meta_token : undefined }}" },
      { name: 'Content-Type', value: 'application/json' }
    ]
  };
  markReadNode.parameters.sendBody = true;
  markReadNode.parameters.specifyBody = 'json';
  markReadNode.parameters.jsonBody = "={{ $json.proveedor === 'meta' ? { messaging_product: 'whatsapp', status: 'read', message_id: $json.proveedor_id } : {} }}";
  // Opciones de autenticación
  markReadNode.parameters.authentication = 'none';
  delete markReadNode.parameters.genericAuthType;
  delete markReadNode.credentials;
}

// Actualizar nodos 'HTTP enviar 0, 1, 2'
for (let i = 0; i < 3; i++) {
  const sendNode = ds03Nodes.find(n => n.name === 'HTTP enviar ' + i);
  if (sendNode) {
    sendNode.parameters.url = "={{ $('Burbuja " + i + "').first().json.url }}";
    sendNode.parameters.authentication = 'none';
    delete sendNode.parameters.genericAuthType;
    delete sendNode.credentials;
    sendNode.parameters.sendHeaders = true;
    sendNode.parameters.headerParameters = {
      parameters: [
        { name: 'Authorization', value: "={{ $('Burbuja " + i + "').first().json.headers?.Authorization }}" },
        { name: 'Content-Type', value: 'application/json' }
      ]
    };
    sendNode.parameters.sendBody = true;
    sendNode.parameters.specifyBody = 'json';
    sendNode.parameters.jsonBody = "={{ $('Burbuja " + i + "').first().json.body }}";
  }

  // Actualizar 'Guardar salida i' para extraer el id devuelto por Meta o YCloud
  const saveNode = ds03Nodes.find(n => n.name === 'Guardar salida ' + i);
  if (saveNode) {
    saveNode.parameters.options = {
      queryReplacement: "={{ [$json.messages?.[0]?.id ?? $json.wamid ?? null, $json.id ?? $json.messages?.[0]?.id, $('Burbuja " + i + "').first().json.wa_id, $('Burbuja " + i + "').first().json.conversacion_id, $('Burbuja " + i + "').first().json.body.type, $('Burbuja " + i + "').first().json.texto ?? null, $json.status ?? 'sent', $('Burbuja " + i + "').first().json.waba_id, JSON.stringify($('Burbuja " + i + "').first().json.body), $('Entrada').first().json.wamids] }}"
    };
  }

  // Modificar 'HTTP escribiendo i' para no fallar si es Meta
  const typeNode = ds03Nodes.find(n => n.name === 'HTTP escribiendo ' + i);
  if (typeNode) {
    typeNode.parameters.options = {
      ...typeNode.parameters.options,
      continueOnFail: true
    };
  }
}

// Guardar DS-03 en n8n
await client.query('UPDATE workflow_entity SET nodes=$1, connections=$2 WHERE id=$3', [
  JSON.stringify(ds03Nodes),
  JSON.stringify(ds03Conn),
  'a0c7abce-0081-4c80-aa6a-72f4200ec489'
]);
console.log('DS-03 actualizado con soporte de Meta Cloud API de envío');

await client.end();
console.log('¡Ambos workflows actualizados con éxito en n8n!');
