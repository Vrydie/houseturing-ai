-- Migración 004: Modo feria empresarial - Latencia mínima (<2s)
-- Establece el debounce en 0 segundos para respuestas instantáneas

INSERT INTO config (clave, valor) VALUES ('debounce_segundos', '0')
ON CONFLICT (clave) DO UPDATE SET valor = '0';

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
  INSERT INTO conversaciones(wa_id,origen,ctwa_clid,ad_id,ad_headline,sku)
  VALUES(cliente,p#>>'{origen,tipo}',p#>>'{origen,ctwa_clid}',p#>>'{origen,ad_id}',p#>>'{origen,ad_headline}',p#>>'{origen,sku}') RETURNING * INTO c;
 ELSIF p#>>'{origen,tipo}'='ctwa' THEN
  UPDATE conversaciones SET origen='ctwa',ctwa_clid=p#>>'{origen,ctwa_clid}',
   ad_id=p#>>'{origen,ad_id}',ad_headline=p#>>'{origen,ad_headline}',sku=COALESCE(p#>>'{origen,sku}',sku) WHERE id=c.id RETURNING * INTO c;
 ELSIF p#>>'{origen,sku}' IS NOT NULL AND c.sku IS NULL THEN
  UPDATE conversaciones SET sku=p#>>'{origen,sku}' WHERE id=c.id RETURNING * INTO c;
 END IF;
 n=jsonb_build_object('wa_id',cliente,'nombre_perfil',p->'nombre_perfil','conversacion_id',c.id,
   'wamids',jsonb_build_array(p->>'wamid'),'texto',p->>'texto','tipos',jsonb_build_array(p->>'tipo'),
   'origen',jsonb_build_object('tipo',c.origen,'ctwa_clid',c.ctwa_clid,'ad_id',c.ad_id,'ad_headline',c.ad_headline,'sku',c.sku),
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
 'debounce',COALESCE((SELECT valor::numeric FROM config WHERE clave='debounce_segundos'),0));
END $$;
