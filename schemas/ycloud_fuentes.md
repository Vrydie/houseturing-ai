# Ejemplos YCloud de OT-05

Consultados el 29-sep-2026. Los objetos de `schemas/` conservan los valores de los
fragmentos oficiales; los fixtures de `tests/whatsapp/` derivan de ellos y usan
identificadores sintéticos locales. Nunca enviar estos fixtures a YCloud.

- [Entrada: texto y CTWA](https://docs.ycloud.com/reference/whatsapp-inbound-message-webhook-examples): `entrada_ycloud_mensaje.example.json` es un arreglo de los dos cuerpos literales.
- [Estados: Message Sent](https://docs.ycloud.com/reference/whatsapp-message-updated-webhook-examples): `entrada_ycloud_estado.example.json`.
- [Ecos](https://docs.ycloud.com/reference/whatsapp-business-app-sent-message-sync-webhook-examples): `entrada_ycloud_eco.example.json`. La sección “Outbound Text” contiene `type=image`; se conserva así y no se inventa un ejemplo textual oficial.
- [Envío](https://docs.ycloud.com/reference/whatsapp-messaging-examples): cuerpos literales de Text message y Authentication template en `salida_ycloud.example.json`. El contenedor con claves `texto` y `plantilla` es organización local, no un payload de API. Los ejemplos usan `sendDirectly`, pero la página indica que los cuerpos sirven también para enqueue; DS-03 usa `/v2/whatsapp/messages` según la OT.
- [Marcar leído](https://docs.ycloud.com/reference/whatsapp_inbound_message-mark-as-read) y [escribiendo](https://docs.ycloud.com/v2.0.1/reference/whatsapp_inbound_message-typing-indicator): método/ruta sin cuerpo. Las claves de organización `method` y `url` no son campos enviados a YCloud.
- [Firma](https://docs.ycloud.com/reference/webhook-integration-guide): HMAC-SHA256 de `t.rawBody`, secreto sin decodificar, comparación de buffers con `timingSafeEqual`. Se añade validación de formato/longitud y tolerancia de 300 s en ambas direcciones. La guía genérica menciona otro nombre de evento en su switch; se usa `whatsapp.inbound_message.received` de la página específica.

El contrato interno se conserva: `proveedor_id` y `waba_id` viajan como contexto
hacia DS-03, no como propiedades extra de la entrada normalizada de DS-02.
Las URLs de medios son solo datos: estas pruebas no las descargan.
