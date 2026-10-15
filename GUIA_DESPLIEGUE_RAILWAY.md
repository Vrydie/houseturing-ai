# Guía de Despliegue en Railway — HouseTuring

Esta guía detalla paso a paso cómo desplegar todo el ecosistema de **HouseTuring** (n8n, base de datos PostgreSQL, workflows de WhatsApp y Agente de Ventas con IA) en **Railway**.

---

## 🚀 Ventajas de Railway frente al entorno local
1. **Dominio HTTPS fijo y seguro**: Se acabaron los túneles temporales de Cloudflare que cambiaban la URL y rompían la verificación de Meta. Railway proporciona un dominio permanente (ej. `https://houseturing-production.up.railway.app`).
2. **Disponibilidad 24/7**: El bot atiende y cierra ventas en automático incluso con tu computadora apagada.
3. **Escalabilidad y persistencia**: Base de datos Postgres en la nube con backups automáticos y volumen persistente para n8n.

---

## 📋 Pasos para el Despliegue

### Paso 1: Crear Proyecto y Base de Datos en Railway
1. Ingresa a tu cuenta de [Railway](https://railway.app/).
2. Haz clic en **"New Project"** -> Selecciona **"Provision PostgreSQL"**.
3. Railway creará el servicio de base de datos.
4. En la pestaña **"Variables"** de ese PostgreSQL, verás variables como:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`
   - `DATABASE_URL`

### Paso 2: Inicializar las Tablas y Funciones de HouseTuring
Desde tu terminal local (o usando la consola de Railway), ejecuta el script de inicialización apuntando a la URL pública de la base de datos de Railway:
```bash
# En Windows PowerShell o terminal:
$env:DATABASE_URL="tu_DATABASE_URL_de_railway"
node infra/railway_setup_db.mjs
```
Esto creará automáticamente todas las tablas (`productos`, `ofertas`, `conversaciones`, `mensajes`, `contactos`, etc.) y las funciones de base de datos (`ycloud_ingresar`, `ycloud_reclamar`).

---

### Paso 3: Desplegar el Servicio de n8n
1. En el mismo proyecto de Railway, haz clic en **"+ New"** -> **"GitHub Repo"**.
2. Selecciona tu nuevo repositorio personal.
3. Railway detectará automáticamente el archivo `railway.json` y el `Dockerfile`.
4. Ve a la pestaña **"Settings"** del servicio y en **"Networking"** genera un dominio público:
   - Haz clic en **"Generate Domain"** (obtendrás algo como `houseturing-production.up.railway.app`).
5. Ve a la pestaña **"Volumes"** y añade un volumen persistente:
   - Montaje: `/home/node/.n8n` (para asegurar que las credenciales y llaves queden guardadas entre reinicios).

---

### Paso 4: Configurar Variables de Entorno en el servicio n8n
En la pestaña **"Variables"** del servicio de n8n, agrega las siguientes variables (puedes usar el botón "Raw Editor" y pegarlas basadas en `.env.railway.example`):

```env
# Clave de cifrado de n8n (genera un string largo y guárdalo)
N8N_ENCRYPTION_KEY=tu_clave_secreta_super_segura_32_chars

# Dominio público y Webhook
WEBHOOK_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Conexión con el servicio PostgreSQL de Railway
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}

# Ajustes de n8n
GENERIC_TIMEZONE=America/Bogota
NODE_FUNCTION_ALLOW_BUILTIN=crypto
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_PROGRESS=false

# WhatsApp / Meta Cloud API
META_PHONE_NUMBER_ID=tu_phone_number_id
META_ACCESS_TOKEN=tu_meta_access_token
META_VERIFY_TOKEN=whatsapp_n8n_verify_2026
WHATSAPP_PROVEEDOR=meta
WHATSAPP_MODO_SIMULADO=false

# Modelos de Inteligencia Artificial
LLM_MODEL_AGENTE=gemini-1.5-flash
GEMINI_API_KEY=tu_gemini_api_key
OPENAI_API_KEY=tu_openai_key_opcional
DEEPSEEK_API_KEY=tu_deepseek_key_opcional

# Telegram para soporte humano
TELEGRAM_BOT_TOKEN=tu_bot_token
TELEGRAM_CHAT_ID=tu_chat_id
```

---

### Paso 5: Configurar el Webhook en Meta Developers
1. Ve a la consola de [Meta for Developers](https://developers.facebook.com/).
2. En tu app de WhatsApp, ve a **WhatsApp** -> **Configuration** -> **Webhook**.
3. Haz clic en **Edit**:
   - **Callback URL**: `https://tu-servicio.up.railway.app/webhook/whatsapp`
   - **Verify Token**: `whatsapp_n8n_verify_2026` (o el que definiste en `META_VERIFY_TOKEN`)
4. Haz clic en **Verify and Save**. Meta verificará instantáneamente el challenge HTTP GET con n8n.
5. En **Webhook Fields**, asegúrate de suscribirte a:
   - `messages` (fundamental para recibir mensajes entrantes de clientes).

---

### Paso 6: Verificación y Primer Mensaje
Envía un mensaje de prueba desde WhatsApp al número comercial. En n8n:
- El webhook `DS-01 Entrada WhatsApp` recibirá el mensaje de inmediato.
- Se registrará en la base de datos `mensajes`.
- El Agente `DS-02` responderá con los productos y ofertas disponibles.
- `DS-03 Enviar WhatsApp` entregará la respuesta al cliente.
