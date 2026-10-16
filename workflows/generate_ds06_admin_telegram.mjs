import fs from 'fs';

const workflow = {
  id: "ds06-admin-telegram-uuid",
  name: "DS-06 Gestión de Pedidos por Telegram",
  active: true,
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "telegram-operador",
        responseMode: "onReceived",
        options: {}
      },
      id: "webhook-telegram",
      name: "Webhook Telegram",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, 0],
      webhookId: "telegram-operador-post"
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT valor FROM config WHERE clave = 'groq_api_key' LIMIT 1;",
        options: {}
      },
      id: "get-groq-key",
      name: "Obtener Groq Key",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [240, 0],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    {
      parameters: {
        jsCode: `
const botToken = '8657757427:AAEQEDZAR9RAuJvqCKhH_7eb_7JYOlVnSi8';
const operadorChatId = '5926139023';
const groqKey = $json.valor || '';

const body = $('Webhook Telegram').first().json.body || $('Webhook Telegram').first().json;

// 1. Filtrar si no es del operador autorizado
const fromChat = String(body.message?.chat?.id || body.callback_query?.message?.chat?.id || body.callback_query?.from?.id || '');
if (fromChat !== operadorChatId) {
  return [];
}

// 2. Manejo de Callback Queries (Botones Inline)
if (body.callback_query) {
  const cb = body.callback_query;
  const cbId = cb.id;
  const data = String(cb.data || '');

  // Agradecer/quitar reloj de arena en Telegram de inmediato
  try {
    await fetch(\`https://api.telegram.org/bot\${botToken}/answerCallbackQuery\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId })
    });
  } catch (e) {}

  if (data === 'pedidos_pendientes' || data === 'listar') {
    return [{ json: { accion: 'listar', chat_id: fromChat } }];
  }
  if (data === 'ayuda') {
    return [{ json: { accion: 'ayuda', chat_id: fromChat } }];
  }
  if (data.startsWith('ver_')) {
    const pid = parseInt(data.replace('ver_', ''), 10);
    return [{ json: { accion: 'ver', pedido_id: pid, chat_id: fromChat } }];
  }
  if (data.startsWith('estado_')) {
    const parts = data.split('_'); // estado_ID_nuevo
    const pid = parseInt(parts[1], 10);
    const nuevo = parts[2] || 'despachado';
    return [{ json: { accion: 'cambiar_estado', pedido_id: pid, nuevo_estado: nuevo, chat_id: fromChat } }];
  }
  if (data.startsWith('cancelar_')) {
    const pid = parseInt(data.replace('cancelar_', ''), 10);
    return [{ json: { accion: 'cambiar_estado', pedido_id: pid, nuevo_estado: 'cancelado', chat_id: fromChat } }];
  }
  if (data.startsWith('borrar_')) {
    const pid = parseInt(data.replace('borrar_', ''), 10);
    return [{ json: { accion: 'borrar', pedido_id: pid, chat_id: fromChat } }];
  }
  return [{ json: { accion: 'listar', chat_id: fromChat } }];
}

// 3. Manejo de Nota de Voz (Audio)
let textoMensaje = '';
if (body.message?.voice) {
  const voice = body.message.voice;
  const fileId = voice.file_id;
  try {
    const fileRes = await fetch(\`https://api.telegram.org/bot\${botToken}/getFile?file_id=\${fileId}\`);
    const fileData = await fileRes.json();
    if (fileData.ok && fileData.result?.file_path) {
      const audioUrl = \`https://api.telegram.org/file/bot\${botToken}/\${fileData.result.file_path}\`;
      const audioBufferRes = await fetch(audioUrl);
      const audioBlob = await audioBufferRes.blob();

      const form = new FormData();
      form.append('file', audioBlob, 'voice.oga');
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'es');
      form.append('prompt', 'Colombiano, pedidos dropshipping, taladro, despacho, cancelar, enviar, direccion');

      const groqWhisper = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey },
        body: form
      });
      const whisperData = await groqWhisper.json();
      textoMensaje = String(whisperData.text || '').trim();
    }
  } catch (err) {
    textoMensaje = '';
  }
} else if (body.message?.text) {
  textoMensaje = String(body.message.text).trim();
}

if (!textoMensaje) {
  return [{ json: { accion: 'ayuda', chat_id: fromChat } }];
}

// 4. Comandos rápidos por texto
if (textoMensaje.startsWith('/')) {
  const t = textoMensaje.toLowerCase();
  if (t === '/pedidos' || t === '/pendientes' || t === '/start') {
    return [{ json: { accion: 'listar', chat_id: fromChat } }];
  }
  if (t.startsWith('/ver ')) {
    const pid = parseInt(t.replace('/ver ', '').trim(), 10);
    return [{ json: { accion: 'ver', pedido_id: pid, chat_id: fromChat } }];
  }
  if (t.startsWith('/despachar ') || t.startsWith('/enviar ')) {
    const pid = parseInt(t.split(' ')[1], 10);
    return [{ json: { accion: 'cambiar_estado', pedido_id: pid, nuevo_estado: 'despachado', chat_id: fromChat } }];
  }
  if (t.startsWith('/cancelar ')) {
    const pid = parseInt(t.replace('/cancelar ', '').trim(), 10);
    return [{ json: { accion: 'cambiar_estado', pedido_id: pid, nuevo_estado: 'cancelado', chat_id: fromChat } }];
  }
  if (t.startsWith('/borrar ')) {
    const pid = parseInt(t.replace('/borrar ', '').trim(), 10);
    return [{ json: { accion: 'borrar', pedido_id: pid, chat_id: fromChat } }];
  }
  return [{ json: { accion: 'ayuda', chat_id: fromChat } }];
}

// 5. Lenguaje Hablado / Natural (Procesado con Groq Qwen)
const promptNLP = \`Eres el asistente administrativo de HouseTuring para el operador. Extrae la intención sobre la base de datos de pedidos:
Mensaje u orden hablada: "\${textoMensaje}"

Responde ÚNICAMENTE un JSON con:
{
  "accion": "listar" | "ver" | "cambiar_estado" | "cambiar_direccion" | "cancelar" | "borrar" | "ayuda",
  "pedido_id": número_entero o null,
  "nuevo_estado": "creado" | "despachado" | "entregado" | "cancelado" | null,
  "nueva_direccion": string o null
}\`;

try {
  const nlpRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + groqKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: promptNLP }],
      temperature: 0.1
    })
  });
  const nlpData = await nlpRes.json();
  const rawContent = nlpData.choices?.[0]?.message?.content || '{}';
  const cleanJson = rawContent.substring(rawContent.indexOf('{'), rawContent.lastIndexOf('}') + 1);
  const parsed = JSON.parse(cleanJson);

  let accion = parsed.accion || 'listar';
  let pid = parsed.pedido_id ? parseInt(parsed.pedido_id, 10) : null;
  let estado = parsed.nuevo_estado || null;
  if (accion === 'cancelar') {
    accion = 'cambiar_estado';
    estado = 'cancelado';
  } else if (accion === 'cambiar_estado' && (!estado || estado === 'enviado')) {
    estado = 'despachado';
  }

  return [{
    json: {
      accion,
      pedido_id: pid,
      nuevo_estado: estado,
      nueva_direccion: parsed.nueva_direccion || null,
      texto_origen: textoMensaje,
      chat_id: fromChat
    }
  }];
} catch (err) {
  return [{ json: { accion: 'listar', chat_id: fromChat, texto_origen: textoMensaje } }];
}
`
      },
      id: "parse-input",
      name: "Interpretar Input y Audio",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [480, 0]
    },
    {
      parameters: {
        dataType: "string",
        value1: "={{ $json.accion }}",
        rules: {
          rules: [
            { value2: "listar", output: 0 },
            { value2: "ver", output: 1 },
            { value2: "cambiar_estado", output: 2 },
            { value2: "cambiar_direccion", output: 3 },
            { value2: "borrar", output: 4 },
            { value2: "ayuda", output: 5 }
          ]
        },
        fallbackOutput: 0
      },
      id: "switch-accion",
      name: "Enrutar Acción",
      type: "n8n-nodes-base.switch",
      typeVersion: 3,
      position: [720, 0]
    },
    // Rama 0: Listar
    {
      parameters: {
        operation: "executeQuery",
        query: `
          SELECT id, shopify_order_name, total, estado,
                 datos_envio->>'nombre' AS cliente,
                 datos_envio->>'ciudad' AS ciudad,
                 creado_en
          FROM pedidos
          ORDER BY id DESC
          LIMIT 6;
        `,
        options: {}
      },
      id: "db-listar",
      name: "DB Listar",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [960, -200],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    // Rama 1: Ver Detalle
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT * FROM pedidos WHERE id = $1 LIMIT 1;",
        options: {
          queryReplacement: "={{ [$json.pedido_id] }}"
        }
      },
      id: "db-ver",
      name: "DB Ver",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [960, -80],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    // Rama 2: Cambiar Estado
    {
      parameters: {
        operation: "executeQuery",
        query: "UPDATE pedidos SET estado = $2, actualizado_en = NOW() WHERE id = $1 RETURNING *;",
        options: {
          queryReplacement: "={{ [$json.pedido_id, $json.nuevo_estado] }}"
        }
      },
      id: "db-estado",
      name: "DB Cambiar Estado",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [960, 40],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    // Rama 3: Cambiar Dirección
    {
      parameters: {
        operation: "executeQuery",
        query: "UPDATE pedidos SET datos_envio = jsonb_set(datos_envio, '{direccion}', to_jsonb($2::text)), actualizado_en = NOW() WHERE id = $1 RETURNING *;",
        options: {
          queryReplacement: "={{ [$json.pedido_id, $json.nueva_direccion] }}"
        }
      },
      id: "db-direccion",
      name: "DB Cambiar Dirección",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [960, 160],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    // Rama 4: Borrar
    {
      parameters: {
        operation: "executeQuery",
        query: "DELETE FROM pedidos WHERE id = $1 RETURNING id, shopify_order_name;",
        options: {
          queryReplacement: "={{ [$json.pedido_id] }}"
        }
      },
      id: "db-borrar",
      name: "DB Borrar",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.6,
      position: [960, 280],
      credentials: {
        postgres: {
          id: "VqgP7Z77oaN8muQ2",
          name: "Postgres dropship"
        }
      }
    },
    // Nodo Formateador Final
    {
      parameters: {
        jsCode: `
const accion = $('Interpretar Input y Audio').first().json.accion;
const chatId = '5926139023';
const textoOrigen = $('Interpretar Input y Audio').first().json.texto_origen;

let msg = '';
let keyboard = [];

if (textoOrigen) {
  msg += '🗣️ _Entendido: "' + textoOrigen + '"_\\n\\n';
}

if (accion === 'listar') {
  const rows = $input.all().map(i => i.json).filter(r => r.id);
  if (rows.length === 0) {
    msg += '📭 *No hay pedidos registrados en la base de datos todavía.*';
    keyboard = [[{ text: '🔄 Actualizar Lista', callback_data: 'pedidos_pendientes' }]];
  } else {
    msg += '📋 *ÚLTIMOS PEDIDOS REGISTRADOS:*\\n\\n';
    let rowBtns = [];
    for (const p of rows) {
      const estadoIcon = p.estado === 'despachado' ? '🚚' : p.estado === 'cancelado' ? '❌' : p.estado === 'entregado' ? '✅' : '⏳';
      const fecha = new Date(p.creado_en).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
      msg += '🔹 *ID #' + p.id + '* (' + (p.shopify_order_name || 'SIM-' + p.id) + ')\\n';
      msg += '   👤 ' + (p.cliente || 'Sin nombre') + ' · 📍 ' + (p.ciudad || 'Colombia') + '\\n';
      msg += '   💰 $' + Number(p.total).toLocaleString('es-CO') + ' COP · ' + estadoIcon + ' \`' + (p.estado || 'creado') + '\`\\n';
      msg += '   🕒 ' + fecha + '\\n\\n';

      rowBtns.push({ text: '📦 Ver #' + p.id, callback_data: 'ver_' + p.id });
      if (rowBtns.length === 2) {
        keyboard.push(rowBtns);
        rowBtns = [];
      }
    }
    if (rowBtns.length > 0) keyboard.push(rowBtns);
    keyboard.push([{ text: '🔄 Actualizar Lista', callback_data: 'pedidos_pendientes' }]);
  }
} else if (accion === 'ver') {
  const p = $input.first()?.json;
  if (!p || !p.id) {
    msg += '❌ *No se encontró el pedido solicitado en Postgres.*';
    keyboard = [[{ text: '⬅️ Volver a Lista', callback_data: 'pedidos_pendientes' }]];
  } else {
    const env = p.datos_envio || {};
    const estadoIcon = p.estado === 'despachado' ? '🚚' : p.estado === 'cancelado' ? '❌' : p.estado === 'entregado' ? '✅' : '⏳';
    const fecha = new Date(p.creado_en).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    msg += '📦 *DETALLE DEL PEDIDO #' + p.id + '*\\n';
    msg += '🆔 *Código:* \`' + (p.shopify_order_name || 'SIM-' + p.id) + '\`\\n';
    msg += '📊 *Estado:* ' + estadoIcon + ' *' + (p.estado || 'creado').toUpperCase() + '*\\n';
    msg += '══════════════════════\\n';
    msg += '👤 *Cliente:* ' + (env.nombre || '') + ' ' + (env.apellido || '') + '\\n';
    msg += '📱 *Celular:* [' + (env.celular || p.wa_id) + '](https://wa.me/' + (env.celular || p.wa_id) + ')\\n';
    msg += '📍 *Ciudad:* ' + (env.ciudad || '') + ' (' + (env.departamento || '') + ')\\n';
    msg += '🏠 *Dirección:* ' + (env.direccion || 'Sin dirección') + '\\n';
    if (env.barrio) msg += '🏘️ *Barrio:* ' + env.barrio + (env.complemento ? ' · ' + env.complemento : '') + '\\n';
    msg += '💰 *Total:* $' + Number(p.total).toLocaleString('es-CO') + ' COP\\n';
    msg += '🕒 *Creado:* ' + fecha + '\\n';

    keyboard = [
      [
        { text: '🚚 Marcar Despachado', callback_data: 'estado_' + p.id + '_despachado' },
        { text: '⏳ Marcar Creado', callback_data: 'estado_' + p.id + '_creado' }
      ],
      [
        { text: '❌ Cancelar Pedido', callback_data: 'cancelar_' + p.id },
        { text: '🗑️ Borrar de DB', callback_data: 'borrar_' + p.id }
      ],
      [
        { text: '⬅️ Volver a Lista', callback_data: 'pedidos_pendientes' }
      ]
    ];
  }
} else if (accion === 'cambiar_estado') {
  const p = $input.first()?.json;
  if (!p || !p.id) {
    msg += '❌ *No se pudo actualizar el estado (pedido no encontrado).*';
  } else {
    const icon = p.estado === 'despachado' ? '🚚' : p.estado === 'cancelado' ? '❌' : '✅';
    msg += icon + ' *¡Estado del pedido #' + p.id + ' actualizado a:* \`' + (p.estado || '').toUpperCase() + '\`*!*';
    keyboard = [
      [{ text: '📦 Ver Ficha Pedido #' + p.id, callback_data: 'ver_' + p.id }],
      [{ text: '📋 Ver Todos los Pedidos', callback_data: 'pedidos_pendientes' }]
    ];
  }
} else if (accion === 'cambiar_direccion') {
  const p = $input.first()?.json;
  if (!p || !p.id) {
    msg += '❌ *No se pudo actualizar la dirección.*';
  } else {
    msg += '✅ *Dirección del pedido #' + p.id + ' actualizada a:*\\n🏠 \`' + (p.datos_envio?.direccion || '') + '\`';
    keyboard = [
      [{ text: '📦 Ver Ficha Pedido #' + p.id, callback_data: 'ver_' + p.id }],
      [{ text: '📋 Ver Todos los Pedidos', callback_data: 'pedidos_pendientes' }]
    ];
  }
} else if (accion === 'borrar') {
  const p = $input.first()?.json;
  msg += '🗑️ *El pedido ha sido eliminado definitivamente de PostgreSQL.*';
  keyboard = [[{ text: '📋 Ver Lista de Pedidos', callback_data: 'pedidos_pendientes' }]];
} else {
  // Ayuda
  msg += '🤖 *GUÍA DEL ASISTENTE DE PEDIDOS (HouseTuring)*\\n\\n';
  msg += 'Puedes tocar los botones o escribirme/hablarme por nota de voz:\\n\\n';
  msg += '🎙️ *Ejemplos por voz o texto natural:*\\n';
  msg += '• "Muéstrame los pedidos pendientes"\\n';
  msg += '• "Ver pedido 3"\\n';
  msg += '• "Marca el pedido 2 como despachado"\\n';
  msg += '• "Cancela el pedido 5"\\n';
  msg += '• "Cambia la dirección del pedido 2 a Carrera 15 # 40-10"\\n';
  msg += '• "Borra el pedido 1 de prueba"\\n\\n';
  msg += '⌨️ *Comandos rápidos:*\\n';
  msg += '• \`/pedidos\` - Ver lista reciente\\n';
  msg += '• \`/ver <id>\` - Ver ficha completa\\n';
  msg += '• \`/despachar <id>\` - Marcar despachado\\n';
  msg += '• \`/cancelar <id>\` - Cancelar pedido\\n';
  msg += '• \`/borrar <id>\` - Borrar registro de DB';
  keyboard = [[{ text: '📋 Ver Pedidos Actuales', callback_data: 'pedidos_pendientes' }]];
}

return [{
  json: {
    chat_id: chatId,
    text: msg,
    reply_markup: { inline_keyboard: keyboard }
  }
}];
`
      },
      id: "armar-respuesta",
      name: "Armar Respuesta",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1260, 0]
    },
    // Enviar a Telegram
    {
      parameters: {
        method: "POST",
        url: "https://api.telegram.org/bot8657757427:AAEQEDZAR9RAuJvqCKhH_7eb_7JYOlVnSi8/sendMessage",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={\n  \"chat_id\": \"{{ $json.chat_id }}\",\n  \"text\": \"{{ $json.text }}\",\n  \"parse_mode\": \"Markdown\",\n  \"reply_markup\": {{ JSON.stringify($json.reply_markup) }}\n}",
        options: {
          timeout: 10000
        }
      },
      id: "send-telegram",
      name: "Enviar Telegram",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1500, 0],
      onError: "continueRegularOutput"
    }
  ],
  connections: {
    "Webhook Telegram": {
      main: [[{ node: "Obtener Groq Key", type: "main", index: 0 }]]
    },
    "Obtener Groq Key": {
      main: [[{ node: "Interpretar Input y Audio", type: "main", index: 0 }]]
    },
    "Interpretar Input y Audio": {
      main: [[{ node: "Enrutar Acción", type: "main", index: 0 }]]
    },
    "Enrutar Acción": {
      main: [
        [{ node: "DB Listar", type: "main", index: 0 }],
        [{ node: "DB Ver", type: "main", index: 0 }],
        [{ node: "DB Cambiar Estado", type: "main", index: 0 }],
        [{ node: "DB Cambiar Dirección", type: "main", index: 0 }],
        [{ node: "DB Borrar", type: "main", index: 0 }],
        [{ node: "Armar Respuesta", type: "main", index: 0 }]
      ]
    },
    "DB Listar": {
      main: [[{ node: "Armar Respuesta", type: "main", index: 0 }]]
    },
    "DB Ver": {
      main: [[{ node: "Armar Respuesta", type: "main", index: 0 }]]
    },
    "DB Cambiar Estado": {
      main: [[{ node: "Armar Respuesta", type: "main", index: 0 }]]
    },
    "DB Cambiar Dirección": {
      main: [[{ node: "Armar Respuesta", type: "main", index: 0 }]]
    },
    "DB Borrar": {
      main: [[{ node: "Armar Respuesta", type: "main", index: 0 }]]
    },
    "Armar Respuesta": {
      main: [[{ node: "Enviar Telegram", type: "main", index: 0 }]]
    }
  },
  settings: {
    executionOrder: "v1",
    saveDataSuccessExecution: "all",
    saveDataErrorExecution: "all"
  }
};

fs.writeFileSync('workflows/DS-06_Admin_Telegram.json', JSON.stringify(workflow, null, 2));
console.log('Workflow DS-06_Admin_Telegram.json generado exitosamente.');
