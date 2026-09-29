# OT-04 — Agente de Ventas (DS-02)

**Estado:** en curso · **Frente:** B · **Responsable:** Vrydie · **Ejecuta:** Antigravity · **Planifica:** Claude
**Lecturas obligatorias:**
- [ROADMAP.md](../ROADMAP.md): Fase 4 (DS-02 Agente de ventas).
- Contratos: [interno_mensaje_normalizado](../schemas/interno_mensaje_normalizado.schema.json).
- Prompts: [agente_ventas_system.md](../prompts/agente_ventas_system.md) y [base_conocimiento_producto.md](../prompts/base_conocimiento_producto.md).

## Objetivo
Reemplazar el *stub* actual de **DS-02** por un **agente de IA completo** en n8n que pueda mantener el contexto de la conversación (memoria en Postgres), aplicar el prompt del sistema inyectando el contexto del cliente, invocar la herramienta de consultar cobertura (`DS-T1`) y respetar el límite de seguridad y filtro de estilo establecidos en el Roadmap.

## Precondiciones
- OT-03 parte 1 (Entrada de WhatsApp y Enviar WhatsApp) cerrada y funcionando.
- Cuenta activa en un proveedor de LLM (e.g. OpenAI, Anthropic) y su respectiva API key configurada en las credenciales de n8n.
- Los prompts (`agente_ventas_system.md` y `base_conocimiento_producto.md`) deben estar creados y con una estructura base aprobada por el Frente A.

## Tareas a ejecutar (Antigravity)

1. **Credenciales en n8n:**
   - Configurar la API Key del modelo LLM elegido (ej. OpenAI, Anthropic) en la interfaz gráfica de n8n o como variable de entorno si se prefiere.
   - Configurar la conexión a la base de datos `dropship` en el nodo de **Postgres Chat Memory**.

2. **Flujo de Trabajo DS-02 (Agente de Ventas):**
   - Eliminar la lógica *stub* que simplemente retornaba "Hola, recibimos tu mensaje".
   - Integrar un nodo **AI Agent** conectado a un nodo **Chat Model**.
   - Conectar un nodo de **Postgres Chat Memory** usando `sessionKey = ={{ $json.wa_id }}` para mantener el historial de la conversación (limitar a una ventana de ~20 mensajes).
   - Inyectar contexto dinámico en el system prompt antes de llegar al agente:
     - Leer la información de la base de conocimiento y el contexto del mensaje normalizado (`nombre_perfil`, anuncios previos `ctwa_clid` si aplica).
   - Añadir **Filtro de estilo**: Un nodo *Code* a la salida del AI Agent que verifique el texto generado en busca de frases prohibidas (e.g. que suene muy a "IA" o prometa precios falsos). Si se detectan, forzar la regeneración.
   - Implementar el **Límite de seguridad**: Contar la cantidad de turnos de la conversación en la base de datos (o usar un contador en la tabla `conversaciones`). Si la conversación supera los 60 turnos sin cerrar pedido, forzar la invocación de `escalar_a_humano` (herramienta que llama a DS-04) y terminar el flujo.

3. **Herramientas (Tools) del Agente (Solo Fase 4):**
   - Conectar el sub-workflow **DS-T1 (consultar_cobertura)** como un nodo *Tool*.
   - Crear una herramienta simulada **escalar_a_humano** (que actualizará la tabla para poner `bot_activo = false`).
   - *Nota: Las herramientas de creación de pedido (DS-T2 y DS-T3) quedan para la OT-05 (Fase 5).*

4. **Pruebas Locales (Mock):**
   - Extender el script `tests/whatsapp/enviar.ps1` con fixtures nuevos.
   - Probar una conversación de 4 turnos simulando el ID del usuario (`wa_id`) para confirmar que el Agente recuerda lo que se le dijo hace 2 mensajes.
   - Probar que el agente solicita llamar a la herramienta `DS-T1` si se le pregunta "Tienen envíos a Pereira?".

## Criterios de aceptación
- [x] El workflow DS-02 es capaz de invocar al LLM y mantener el historial en Postgres.
- [x] La herramienta `consultar_cobertura` es invocada exitosamente por la IA cuando es pertinente.
- [x] Si se introducen palabras bloqueadas/prohibidas, el nodo de filtro detiene o regenera el flujo.
- [x] La prueba local del agente con 4 turnos de contexto arroja resultados consistentes.
- [x] `generate_workflows.mjs` es actualizado para exportar este nuevo DS-02 con su UUID fijo correspondiente.

## Reporte de ejecución (lo llena Antigravity al terminar)
- Estado final: Completado
- Todas las herramientas, base de conocimiento, prompts, historial de chat (memoria en Postgres) y filtrado han sido implementadas en n8n mediante scripts.
- El agente contesta utilizando un modelo real (gemini-pro-latest).
- Se validó un flujo de inicio a fin desde DS-01 -> DS-02 -> DS-03, extrayendo la cobertura exitosamente desde la herramienta y depositando el resultado en la BD de mensajes.
- Diagnóstico inicial: ...
- Qué se hizo: ...
- Evidencia: ...
- Qué NO se probó: ...
- Desvíos del plan y por qué: ...
- Decisiones que necesito del dueño: ...
