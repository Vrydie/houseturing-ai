# OT-09: Mejoras técnicas para arranque orgánico

**Estado:** lista · **Frente:** B (Automatización) · **Responsable:** Vrydie

## 1. Contexto y Objetivo
De acuerdo con el **Plan de arranque sin capital**, el negocio empezará recibiendo leads orgánicos (sin anuncios) de diferentes fuentes (TikTok, Reels, Grupos, Estados de WhatsApp). 
Además, se requiere poder configurar fácilmente el modelo de IA a utilizar (para usar la capa gratuita mientras se prueba) y proveer al dueño una manera rápida y confiable de encender el servidor y el túnel en Windows.

**Objetivos:**
1. Rastrear correctamente la procedencia del cliente en WhatsApp (canal y producto).
2. Hacer configurable el modelo de IA a nivel de entorno (`.env`).
3. Facilitar el inicio del entorno local en Windows.

## 2. Tareas (Criterios de Aceptación)

### 2.1. Rastreo en DS-01 (Canales Orgánicos)
- **Problema actual:** El flujo `DS-01_Entrada_WhatsApp` y su script generador asumen que todo viene de `(web-...)`. Si el cliente escribe otra cosa, se clasifica como `organico` sin identificar el producto.
- **Acción:** Actualizar la expresión regular y la lógica en `workflows/generate_workflows.mjs` (o en su defecto el código del nodo en n8n) para reconocer también los prefijos:
  - `tt-` (TikTok)
  - `ig-` (Instagram)
  - `fb-` (Facebook)
  - `st-` (Estados de WhatsApp)
  - `gr-` (Grupos)
- **Resultado esperado:** Que la base de datos (Postgres) guarde correctamente la etiqueta del canal y el SKU del producto sin importar de qué red social venga.

### 2.2. Modelo de IA Configurable
- **Problema actual:** El modelo de Gemini está quemado (hardcoded) o requiere abrir n8n para cambiarlo.
- **Acción:** 
  - Agregar la variable `LLM_MODEL_AGENTE=gemini-1.5-flash` (u otro gratuito) al archivo `.env.example` y a la documentación.
  - Modificar el flujo `DS-02_Agente_Ventas` (específicamente la configuración del nodo de Inteligencia Artificial) para que lea dinámicamente esta variable del sistema operativo en lugar de usar un valor estático.
- **Resultado esperado:** Cambiando una línea en el archivo `infra/.env` y reiniciando n8n, el bot usa un modelo distinto.

### 2.3. Script de Arranque para Windows
- **Problema actual:** Encender la infraestructura (Docker + base de datos + túnel Cloudflare/ngrok) implica ejecutar comandos manuales, lo cual es propenso a errores.
- **Acción:**
  - Crear un script `.bat` o `.ps1` (ej: `start_server.ps1` o `start_server.bat` en la raíz) que:
    1. Verifique si Docker está corriendo.
    2. Ejecute `docker compose up -d` en la carpeta `infra/`.
    3. Inicie el túnel (o indique si ya está fijo en docker-compose).
    4. Haga un chequeo (ping/healthcheck) a n8n en el puerto `5690` para confirmar que ya levantó.
- **Resultado esperado:** El dueño hace doble clic en un archivo y en segundos sabe si el sistema está listo para recibir ventas.

## 3. Pruebas
- Simular entradas de texto por webhook con prefijos `(ig-1917934)` y comprobar que la BD registra el canal `ig` y el SKU `1917934`.
- Ejecutar el script de arranque en Windows (o verificar su código en powershell).

## Observaciones de Claude (5-oct-2026), para resolver antes de ejecutar

- [ ] **O1. El workflow no usa Gemini.** El DS-02 exportado en `main` usa `deepseek-chat` (ver OT-07, C5). Esta OT debe partir de lo que realmente corre y dejar definidos proveedor y `LLM_MODEL_AGENTE`, no suponer Gemini. Si se elige Gemini gratis: `gemini-1.5-flash` es de una generación anterior; las fuentes consultadas el 4-oct-2026 listan como gratis 2.5 Flash, 2.5 Flash-Lite, 3 Flash y 3.1 Flash-Lite (por confirmar en la documentación de Google). Probar el nombre exacto con una llamada antes de dejarlo por defecto.
- [ ] **O2. `$env` no funciona hoy en n8n** (ver OT-07, C2). La tarea 2.2 ("leer la variable del sistema operativo") fallará: n8n 2.x bloquea por defecto las variables de entorno en los nodos y `LLM_MODEL_AGENTE` no está en el `environment` del compose. Alternativa que sí cumple "cambiar una línea y reiniciar": que el script de arranque (2.3) lea `infra/.env` y escriba `config.llm_model_agente` en Postgres, y que el nodo lea ese valor de `config`. Probar el cambio de modelo de punta a punta.
- [ ] **O3. El túnel rápido cambia de URL en cada reinicio.** `cloudflared-quick` genera una URL nueva cada vez (`infra/README.md`), así que tras cada encendido los webhooks dejan de llegar hasta pegar la URL nueva en el panel de YCloud y en `WEBHOOK_URL`. El script de la 2.3 no basta con "iniciar el túnel": debe leer la URL de los registros del contenedor, mostrarla en pantalla, escribirla en `WEBHOOK_URL` y avisar que hay que pegarla en YCloud (lo hace el dueño; el agente no registra webhooks, AGENTS.md §4). Con dominio propio y túnel con nombre (`--profile tunnel`) este paso desaparece: documentarlo.
- [ ] **O4. "Doble clic".** Un `.ps1` no se ejecuta con doble clic en Windows (se abre en el Bloc de notas y la política de ejecución lo bloquea). Entregar un `.bat` que llame a `powershell -ExecutionPolicy Bypass -File ...`. Ubicación: `infra/`, no la raíz (AGENTS.md §10). El script solo usa `docker compose` y una consulta HTTP al puerto 5690; sin `down -v` ni tocar `infra/data/`; y debe fallar con un mensaje claro si Docker Desktop no está encendido.
- [ ] **O5. Código de producto en los enlaces.** La prueba usa `(ig-1917934)`, pero 1917934 es el ID de Dropi; el SKU del producto en Dropi (y el que debe llevar `productos.sku`) es `93`. El código del enlace lleva el SKU: probar con `(ig-93)`. Además, `conversaciones.sku` es clave foránea de `productos.sku` (`db/schema.sql`): si DS-01 guarda un SKU que no existe en `productos`, el INSERT puede fallar y perder el mensaje del cliente. Un código desconocido debe guardarse como nulo.
- [ ] **O6. La expresión regular, con pruebas.** Reconocer solo `(web|tt|ig|fb|st|gr)-<SKU>` entre paréntesis; que `(3 días)` o `(urgente)` sigan siendo `organico`; probar mayúsculas (`(WEB-…)`) y el código en medio y al final del mensaje. Añadir estos casos a `node --test` en lugar de probar solo a mano.

## 4. Reporte de Ejecución
- **Estado final:** 
- **Qué se hizo:** 
- **Evidencia (salidas de pruebas):** 
- **Qué NO se probó:** 
- **Desvíos del plan y por qué:** 
- **Decisiones que necesito del dueño o de Claude:** 
