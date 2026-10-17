# OT-10: Optimización Tiempo de Respuesta (< 2s) y Restauración de Servicio (Modo Feria)

**Estado:** en curso · **Frente:** B (Automatización) · **Responsable:** Vrydie / Antigravity

---

## 1. Contexto y Diagnóstico

Para la presentación en la feria empresarial, el bot debe responder de manera constante e inmediata (tiempo total de respuesta **menor a 2 segundos**). Actualmente, tras el último despliegue en Railway, el bot dejó de responder ("Ya el bot no me contesta") y anteriormente presentaba demoras de hasta 15 segundos.

### 1.1. ¿Por qué el bot dejó de contestar por completo?
1. **Desactivación silenciosa por importación CLI en Railway:**
   En el commit `c2a2572`, el script de arranque en Railway ejecutó:
   `n8n import:workflow --separate --input=/workflows`
   Por defecto, el CLI de n8n importa todos los flujos en estado **inactivo** (`active: false`) a menos que se especifique `--activeState=fromJson` y los archivos JSON contengan explícitamente `"active": true`.
   Al desactivarse `DS-01_Entrada_WhatsApp`, el endpoint del Webhook `/webhook/whatsapp` fue desmontado por n8n en Railway, haciendo que todo mensaje entrante de YCloud/Meta devolviera error 404.
2. **Modelo inválido en el nodo de Inteligencia Artificial:**
   En `DS-02_Agente_Ventas.json` se había configurado `"model": "deepseek-flash"`. Este modelo **no existe** en la API de DeepSeek (los modelos oficiales son `deepseek-chat` y `deepseek-reasoner`). La API rechazaba las solicitudes con error 400 Bad Request.
3. **Bloqueo persistente de concurrencia (`agente_ocupado_hasta`):**
   Al fallar el modelo en `DS-02`, el flujo nunca llegaba a `DS-03` para ejecutar el nodo `Liberar turno`. Como resultado, la conversación quedaba bloqueada durante 60 segundos (`agente_ocupado_hasta = lease`), rechazando y mandando a reintento cualquier mensaje posterior del mismo cliente.

### 1.2. ¿Por qué se demoraba 15 segundos anteriormente?
1. **Debounce en base de datos (8 segundos):** La función `ycloud_ingresar()` en Postgres y el nodo `Debounce` en `DS-01` tenían por defecto una espera de 8 segundos para agrupar mensajes.
2. **Simulación de tipeo artificial en DS-03 (2.5 a 4 segundos por burbuja):** En `DS-03`, los nodos `Ritmo 0`, `Ritmo 1` y `Ritmo 2` agregaban pausas calculadas para simular velocidad humana de escritura. Con 2-3 burbujas, esto sumaba entre 5 y 8 segundos extras.
3. **Reintentos y esperas de fallo (9 segundos):** El nodo `Agente` en `DS-02` tenía activado `retryOnFail: true`, con 3 intentos y 3 segundos de espera entre intentos.
4. **Persistencia de ejecuciones:** n8n guardaba el progreso paso a paso en base de datos en cada nodo de espera, añadiendo sobrecosto de I/O en Railway.

---

## 2. Plan de Acción y Tareas

### Tarea 1: Restauración de Disponibilidad y Activación de Webhooks en Railway
- [x] Configurar `"active": true` en el encabezado de todos los archivos JSON de workflows (`DS-01`, `DS-02`, `DS-03`, `DS-04`, `DS-05`, `DS-06`, `DS-10`, `DS-11`, `DS-T1`, `DS-T2`, `DS-T4`, `DS-T5`).
- [x] Actualizar `Dockerfile` para importar con la bandera `--activeState=fromJson`.
- [x] En `infra/railway_sync.mjs`, forzar la activación directa en base de datos (`UPDATE workflow_entity SET active = true;`) al arrancar el contenedor para garantizar 100% que n8n inicie con los webhooks activos.
- [x] Liberar cualquier bloqueo residual en base de datos (`UPDATE conversaciones SET agente_ocupado_hasta = NULL WHERE agente_ocupado_hasta > now();`).

### Tarea 2: Corrección del Modelo LLM y Resiliencia en DS-02
- [x] Corregir el nombre del modelo a **`deepseek-chat`** (modelo oficial de DeepSeek V3 de alta velocidad) y compatibilidad con **Google Gemini Flash Lite** (`models/gemini-flash-lite-latest`).
- [x] Desactivar reintentos lentos en el nodo Agente (`retryOnFail: false`, `maxTries: 1`) para evitar pausas de 9 segundos en caso de micro-cortes.
- [x] Asegurar que el filtro de estilo mantenga `reescribir: false` para no hacer una segunda llamada LLM (ahorrando de 2 a 4 segundos por turno).

### Tarea 3: Configuración de "Modo Feria" (< 2s de respuesta)
- [x] Mantener `debounce_segundos = 0` en la tabla `config` y en el nodo `Debounce` de `DS-01`.
- [x] Configurar los nodos de pausa de tipeo (`Ritmo 0`, `Ritmo 1`, `Ritmo 2`) en `amount: 0` en `DS-03` para envío inmediato.
- [x] Ajustar el System Prompt del agente a modo conciso (1 a 2 frases directas, respuestas de una sola burbuja cuando sea posible).

---

## 3. Matriz de Tiempos: Antes vs. Modo Feria

| Etapa | Flujo Anterior | Modo Feria Optimizado |
|---|---|---|
| **Recepción & Webhook (DS-01)** | Inactivo (404) o 8s debounce | **~0.1s** (Debounce 0s) |
| **Generación de Respuesta LLM (DS-02)** | Error 400 + 3 reintentos (9s+) | **~0.8s - 1.2s** (deepseek-chat / gemini-flash) |
| **Filtro de Estilo / Reescritura** | 2-4s (segunda pasada LLM) | **0s** (normalización JS en memoria) |
| **Simulación de Tipeo (DS-03)** | 2.5s - 5s (esperas artificiales) | **0s** (pausa desactivada) |
| **Envío a WhatsApp API** | ~0.5s | **~0.3s** |
| **TOTAL ESTIMADO** | **15 - 20 segundos (o falla)** | **< 1.8 segundos** ⚡ |

---

## 4. Procedimiento de Verificación en Railway

1. Realizar commit y push a `main`.
2. Verificar en el panel de Railway que el build termine con éxito.
3. En los logs de Railway, verificar:
   - `✔ debounce_segundos configurado a 0 en la BD.`
   - `✔ Todos los flujos principales activados en workflow_entity.`
   - `=== Iniciando HouseTuring n8n en Railway ===`
4. Enviar mensaje de WhatsApp al número del bot y medir el tiempo de respuesta. Debe ser inmediato (< 2 segundos).
