# 🚀 GUÍA DE IMPLEMENTACIÓN: FASE LEAN (GOOGLE SHEETS + TELEGRAM)
**Proyecto:** HouseTuring AI  
**Objetivo:** Operar ventas en vivo por WhatsApp, registrando pedidos en Google Sheets y recibiendo notificaciones instantáneas en Telegram, sin depender de Shopify en la etapa inicial.

---

## 1. 📐 Flujo Operativo

```
[ Cliente en WhatsApp ]
        │  Conversa con Valentina y confirma pedido
        ▼
[ DS-02 Agente de Ventas ]
        │  Invoca DS-T2 con datos normalizados y confirmado_por_cliente = true
        ▼
[ DS-T2 Crear Pedido Contraentrega ]
        ├── 1. Valida Cobertura (Cali, Bogotá, etc.) y extrae precio de tabla 'ofertas'
        ├── 2. Registra el pedido en Neon PostgreSQL (tabla 'pedidos', ID: SIM-X)
        ├── 3. Envía fila a Google Sheets (Append Row con continueOnFail: true)
        └── 4. Envía Alerta Instantánea a Telegram del Operador
        ▼
[ DS-03 Despacho WhatsApp ]
        │  Entrega al cliente su confirmación y número de orden
        ▼
[ Operador Humano al final del día ]
        │  Abre Google Sheets o Telegram
        └── Copia y pega los pedidos en Dropi para despacho
```

---

## 2. 📲 Configuración de Telegram (30 Segundos)

Para recibir las alertas instantáneas en tu celular:

### Paso 1: Crear el Bot de Telegram
1. En Telegram, busca el usuario oficial **`@BotFather`**.
2. Escríbele el comando `/newbot`.
3. Asígnale un nombre (ej. `HouseTuring Ventas`) y un usuario (ej. `houseturing_ventas_bot`).
4. **Copia el Token** que te entrega (ej. `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxx`).

### Paso 2: Obtener tu Chat ID Personal
1. En Telegram, busca el usuario **`@userinfobot`** y dale a Iniciar.
2. Te responderá con tu **ID numérico** (ej. `123456789`).
3. Abre un chat con tu nuevo bot y presiona **Iniciar / Start** (para que tenga permiso de escribirte).

### Paso 3: Guardar en Base de Datos Neon
```sql
INSERT INTO config (clave, valor)
VALUES 
  ('telegram_bot_token', 'TU_TOKEN_DE_BOTFATHER'),
  ('telegram_chat_operador', 'TU_CHAT_ID')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
```

---

## 3. 📊 Configuración de Google Sheets (Vía Webhook Ultra-Ligero)

Para evitar configurar proyectos complejos en Google Cloud Console ni lidiar con tokens OAuth que expiran cada semana, usamos el método estándar de **Google Apps Script**:

### Paso 1: Crear la Hoja de Cálculo
1. Crea un nuevo Google Sheet llamado **`HouseTuring - Pedidos WhatsApp`**.
2. En la Fila 1 (encabezados), escribe:
   | A | B | C | D | E | F | G | H |
   | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
   | **Fecha** | **ID Pedido** | **Cliente** | **Celular** | **Ciudad / Dpto** | **Dirección** | **Producto** | **Total COP** |

### Paso 2: Pegar el Script de Recepción
1. En el menú superior de la hoja: **Extensiones &rarr; Apps Script**.
2. Borra lo que haya y pega este código:
```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      data.numero_pedido || '',
      data.nombre || '',
      data.celular || '',
      (data.ciudad || '') + ' - ' + (data.departamento || ''),
      (data.direccion || '') + ' (' + (data.barrio || '') + ') ' + (data.complemento || ''),
      data.producto || '1 Combo Taladro Percutor',
      data.total || 0
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Paso 3: Publicar
1. Clic en el botón azul **Implementar &rarr; Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Descripción: `Receptor Pedidos n8n`.
4. **Quién tiene acceso:** Seleccionar **Cualquiera** (*Anyone*).
5. Clic en **Implementar**, autoriza los permisos y **copia la URL de la aplicación web** (termina en `/exec`).

### Paso 4: Guardar la URL en Neon DB
```sql
INSERT INTO config (clave, valor)
VALUES ('google_sheets_webhook_url', 'https://script.google.com/macros/s/AKfycb.../exec')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
```

---

## 4. 🧩 Nodos a Integrar en `DS-T2_crear_pedido_contraentrega.json`

Posterior al nodo `DB Update Simulado Name`:

```
[ DB Update Simulado Name ]
          │
          ├──► [ HTTP Google Sheets ] (POST al webhook de Apps Script con continueOnFail: true)
          │
          └──► [ HTTP Alerta Telegram ] (POST a https://api.telegram.org/bot<TOKEN>/sendMessage)
```

### Payload de Alerta Telegram:
```json
{
  "chat_id": "={{ $json.telegram_chat }}",
  "text": "🎉 *¡NUEVA VENTA CONCRETADA!*\\n\\n👤 *Cliente:* {{ $json.input.nombre }} {{ $json.input.apellido }}\\n📱 *Celular:* {{ $json.input.celular }}\\n📍 *Ciudad:* {{ $json.db.ciudad_oficial }}\\n🏠 *Dirección:* {{ $json.input.direccion }} ({{ $json.input.barrio }})\\n📦 *Producto:* 1 Combo Taladro Percutor\\n💰 *Total:* ${{ $json.db.precio_total }}\\n🆔 *Pedido:* {{ $json.shopify_order_name }}",
  "parse_mode": "Markdown"
}
```

---

## 5. 🔄 Transición Futura a Shopify (Cero Rehacer)

Cuando tu amigo entregue la tienda:
1. Simplemente cambias en la tabla `config`:
   ```sql
   UPDATE config SET valor = 'real' WHERE clave = 'modo_pedidos';
   UPDATE config SET valor = 'shpat_xxx' WHERE clave = 'shopify_access_token';
   ```
2. La bifurcación `Modo Pedido?` en `DS-T2` enviará la mutación a Shopify GraphQL en lugar de simular, pero **mantendrá el registro en Google Sheets y la alerta de Telegram** intactos para que nunca pierdas el control de tus ventas.
