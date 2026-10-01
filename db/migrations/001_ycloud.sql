BEGIN;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS proveedor_id TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS waba_id TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS autor TEXT CHECK (autor IN ('cliente','bot','humano'));
-- Persistencia del mensaje normalizado para no perder ubicación/origen en ráfagas.
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS normalizado JSONB;
CREATE INDEX IF NOT EXISTS mensajes_proveedor_id_idx ON mensajes(proveedor_id);
INSERT INTO config(clave,valor) VALUES
 ('whatsapp_proveedor','ycloud'),('ycloud_numero_empresa',''),
 ('ycloud_webhook_secret',''),('whatsapp_modo_simulado','true')
ON CONFLICT (clave) DO NOTHING;

-- Cada llamada es una transacción. El bloqueo por wa_id serializa incluso la
-- creación de la primera conversación; el wamid mantiene la idempotencia global.
CREATE OR REPLACE FUNCTION ycloud_ingresar(p JSONB) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE c conversaciones%ROWTYPE; n JSONB; cliente TEXT:=p->>'wa_id'; ultimo TIMESTAMPTZ;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(cliente,5));
 IF EXISTS(SELECT 1 FROM mensajes WHERE wamid=p->>'wamid') THEN
  RETURN jsonb_build_object('accion','duplicado');
 END IF;
 INSERT INTO contactos(wa_id,nombre_perfil) VALUES(cliente,p->>'nombre_perfil')
 ON CONFLICT(wa_id) DO UPDATE SET nombre_perfil=COALESCE(EXCLUDED.nombre_perfil,contactos.nombre_perfil);
 SELECT * INTO c FROM conversaciones WHERE wa_id=cliente ORDER BY creada_en DESC,id DESC LIMIT 1 FOR UPDATE;
 SELECT max(creado_en) INTO ultimo FROM mensajes WHERE conversacion_id=c.id;
 IF c.id IS NULL OR c.estado IN ('pedido','perdida') OR COALESCE(ultimo,c.creada_en)<now()-interval '7 days' THEN
  INSERT INTO conversaciones(wa_id,origen,ctwa_clid,ad_id,ad_headline)
  VALUES(cliente,p#>>'{origen,tipo}',p#>>'{origen,ctwa_clid}',p#>>'{origen,ad_id}',p#>>'{origen,ad_headline}') RETURNING * INTO c;
 ELSIF p#>>'{origen,tipo}'='ctwa' THEN
  UPDATE conversaciones SET origen='ctwa',ctwa_clid=p#>>'{origen,ctwa_clid}',
   ad_id=p#>>'{origen,ad_id}',ad_headline=p#>>'{origen,ad_headline}' WHERE id=c.id RETURNING * INTO c;
 END IF;
 n=jsonb_build_object('wa_id',cliente,'nombre_perfil',p->'nombre_perfil','conversacion_id',c.id,
   'wamids',jsonb_build_array(p->>'wamid'),'texto',p->>'texto','tipos',jsonb_build_array(p->>'tipo'),
   'origen',jsonb_build_object('tipo',c.origen,'ctwa_clid',c.ctwa_clid,'ad_id',c.ad_id,'ad_headline',c.ad_headline),
   'recibido_en',p->>'recibido_en');
 IF p ? 'ubicacion' THEN n=n||jsonb_build_object('ubicacion',p->'ubicacion'); END IF;
 INSERT INTO mensajes(wamid,wa_id,conversacion_id,direccion,tipo,texto,estado,proveedor_id,waba_id,autor,normalizado,procesado)
 VALUES(p->>'wamid',cliente,c.id,CASE WHEN p->>'autor'='humano' THEN 'out' ELSE 'in' END,
 p->>'tipo',p->>'texto',p->>'estado',p->>'proveedor_id',p->>'waba_id',p->>'autor',n,p->>'autor'='humano')
 ON CONFLICT(wamid) DO NOTHING;
 IF NOT FOUND THEN RETURN jsonb_build_object('accion','duplicado'); END IF;
 IF p->>'autor'='humano' THEN
  UPDATE conversaciones SET bot_activo=false,motivo_escalamiento='humano_respondio_desde_app' WHERE id=c.id;
  RETURN jsonb_build_object('accion','eco','conversacion_id',c.id);
 END IF;
 UPDATE conversaciones SET ultimo_mensaje_cliente_en=(p->>'recibido_en')::timestamptz WHERE id=c.id;
 RETURN jsonb_build_object('accion',CASE WHEN c.bot_activo THEN 'entrada' ELSE 'solo_leer' END,
 'conversacion_id',c.id,'wa_id',cliente,'wamid',p->>'wamid','proveedor_id',p->>'proveedor_id',
 'debounce',COALESCE((SELECT valor::numeric FROM config WHERE clave='debounce_segundos'),8));
END $$;

CREATE OR REPLACE FUNCTION ycloud_reclamar(p_id BIGINT,p_wamid TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE c conversaciones%ROWTYPE; m mensajes%ROWTYPE; n JSONB; ids JSONB; txt TEXT; tipos JSONB; lease TIMESTAMPTZ;
BEGIN
 SELECT * INTO c FROM conversaciones WHERE id=p_id FOR UPDATE;
 IF c.id IS NULL OR NOT c.bot_activo THEN RETURN jsonb_build_object('accion','terminar'); END IF;
 SELECT * INTO m FROM mensajes WHERE conversacion_id=p_id AND direccion='in' ORDER BY creado_en DESC,wamid DESC LIMIT 1;
 IF m.wamid IS DISTINCT FROM p_wamid OR m.procesado THEN RETURN jsonb_build_object('accion','terminar'); END IF;
 IF c.agente_ocupado_hasta>clock_timestamp() THEN RETURN jsonb_build_object('accion','reintentar'); END IF;
 SELECT jsonb_agg(wamid ORDER BY creado_en,wamid),string_agg(texto,E'\n' ORDER BY creado_en,wamid),
 jsonb_agg(tipo ORDER BY creado_en,wamid) INTO ids,txt,tipos FROM mensajes
 WHERE conversacion_id=p_id AND direccion='in' AND NOT procesado;
 n=m.normalizado||jsonb_build_object('wamids',ids,'texto',txt,'tipos',tipos);
 -- La última ubicación de la ráfaga se conserva aunque luego llegue un texto.
 n=n||COALESCE((SELECT jsonb_build_object('ubicacion',normalizado->'ubicacion') FROM mensajes
 WHERE conversacion_id=p_id AND NOT procesado AND normalizado ? 'ubicacion' ORDER BY creado_en DESC,wamid DESC LIMIT 1),'{}'::jsonb);
 lease=clock_timestamp()+interval '60 seconds';
 UPDATE conversaciones SET agente_ocupado_hasta=lease WHERE id=p_id;
 RETURN jsonb_build_object('accion','responder','normalizado',n,'lease',lease,'proveedor_id',m.proveedor_id,'waba_id',m.waba_id);
END $$;
COMMIT;
