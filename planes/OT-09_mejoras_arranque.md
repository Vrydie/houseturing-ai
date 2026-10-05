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

## 4. Reporte de Ejecución
- **Estado final:** 
- **Qué se hizo:** 
- **Evidencia (salidas de pruebas):** 
- **Qué NO se probó:** 
- **Desvíos del plan y por qué:** 
- **Decisiones que necesito del dueño o de Claude:** 
