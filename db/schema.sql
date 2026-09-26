-- Base de datos de negocio "dropship" (separada de la BD interna de n8n).
-- La tabla de memoria del chat (n8n_chat_histories) la crea sola el nodo
-- "Postgres Chat Memory" de n8n; no se define aquí.

-- ---------------------------------------------------------------- catálogo
-- ============================================ Módulo P: catálogo Dropi
-- (va primero porque productos la referencia)
CREATE TABLE catalogo_dropi (
    dropi_id               TEXT PRIMARY KEY,
    nombre                 TEXT NOT NULL,
    categoria              TEXT,
    proveedor_id           TEXT,
    proveedor_nombre       TEXT,
    proveedor_verificado   BOOLEAN,
    bodega_ciudad          TEXT,
    sku                    TEXT,
    precio_proveedor       NUMERIC(12,2),
    precio_sugerido        NUMERIC(12,2),
    stock                  INTEGER,
    descripcion            TEXT,
    imagenes               JSONB,                     -- URLs
    video_url              TEXT,
    raw                    JSONB,                     -- respuesta completa de la API de Dropi
    visto_primera_vez      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una fila por producto y día: base de la estimación de ventas por rotación de stock.
CREATE TABLE catalogo_snapshots (
    dropi_id          TEXT NOT NULL REFERENCES catalogo_dropi(dropi_id),
    fecha             DATE NOT NULL,
    stock             INTEGER,
    precio_proveedor  NUMERIC(12,2),
    PRIMARY KEY (dropi_id, fecha)
);

-- ---------------------------------------------------------------- catálogo propio
CREATE TABLE productos (
    sku                        TEXT PRIMARY KEY,      -- idéntico en Dropi y Shopify
    dropi_id                   TEXT REFERENCES catalogo_dropi(dropi_id),
    nombre                     TEXT NOT NULL,
    shopify_variant_gid        TEXT,                  -- se llena tras importar con Dropify
    moneda                     CHAR(3) NOT NULL DEFAULT 'COP',
    estado                     TEXT NOT NULL DEFAULT 'preparando'
                               CHECK (estado IN ('preparando', 'prueba', 'activo', 'pausado', 'descartado')),
    cpa_maximo                 NUMERIC(12,2),         -- fórmula de F0.2 con los costos de este producto
    base_conocimiento          TEXT,                  -- ficha que se inyecta en el prompt del agente
    base_conocimiento_estado   TEXT NOT NULL DEFAULT 'borrador'
                               CHECK (base_conocimiento_estado IN ('borrador', 'aprobada')),
    disponible                 BOOLEAN NOT NULL DEFAULT TRUE,   -- lo apaga el guardián de stock
    stock_ultimo               INTEGER,
    stock_actualizado_en       TIMESTAMPTZ
);

-- Única fuente de precios. El agente solo elige un oferta_id; nunca un monto.
CREATE TABLE ofertas (
    id            TEXT PRIMARY KEY,                   -- 'x1', 'x2', 'x3'
    sku           TEXT NOT NULL REFERENCES productos(sku),
    descripcion   TEXT NOT NULL,                      -- '2 unidades + envío gratis'
    cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
    precio_total  NUMERIC(12,2) NOT NULL,
    activa        BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ciudades con cobertura según el listado de Dropi.
CREATE TABLE cobertura (
    departamento           TEXT NOT NULL,
    ciudad                 TEXT NOT NULL,
    ciudad_norm            TEXT NOT NULL,             -- minúsculas, sin tildes
    shopify_province_code  TEXT,                      -- código de departamento en Shopify
    acepta_contraentrega   BOOLEAN NOT NULL DEFAULT TRUE,
    dias_entrega_min       INTEGER,
    dias_entrega_max       INTEGER,
    PRIMARY KEY (departamento, ciudad)
);
CREATE INDEX cobertura_ciudad_norm_idx ON cobertura (ciudad_norm);

-- ------------------------------------------------------------ conversación
CREATE TABLE contactos (
    wa_id          TEXT PRIMARY KEY,                  -- 573001112233
    nombre_perfil  TEXT,
    opt_out        BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversación activa = la más reciente del wa_id. Se abre una nueva si la
-- anterior terminó (pedido/perdida) o lleva más de 7 días sin mensajes.
CREATE TABLE conversaciones (
    id                         BIGSERIAL PRIMARY KEY,
    wa_id                      TEXT NOT NULL REFERENCES contactos(wa_id),
    sku                        TEXT REFERENCES productos(sku),   -- producto del anuncio de origen
    origen                     TEXT NOT NULL CHECK (origen IN ('ctwa', 'lead_ad', 'web', 'organico')),  -- web = botón de la tienda con código (web-SKU)
    ctwa_clid                  TEXT,                  -- referral.ctwa_clid (para CAPI)
    ad_id                      TEXT,                  -- referral.source_id
    ad_headline                TEXT,
    lead_id                    TEXT,
    estado                     TEXT NOT NULL DEFAULT 'abierta'
                               CHECK (estado IN ('abierta', 'pedido', 'perdida', 'escalada')),
    bot_activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    motivo_escalamiento        TEXT,
    agente_ocupado_hasta       TIMESTAMPTZ,           -- bloqueo anti-respuestas dobles
    turnos_agente              INTEGER NOT NULL DEFAULT 0,
    ultimo_mensaje_cliente_en  TIMESTAMPTZ,           -- controla la ventana de 24 h
    creada_en                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversaciones_wa_idx ON conversaciones (wa_id, creada_en DESC);

CREATE TABLE mensajes (
    wamid            TEXT PRIMARY KEY,                -- id de WhatsApp: deduplica webhooks
    wa_id            TEXT NOT NULL,
    conversacion_id  BIGINT REFERENCES conversaciones(id),
    direccion        TEXT NOT NULL CHECK (direccion IN ('in', 'out')),
    tipo             TEXT NOT NULL,                   -- text | audio | image | template ...
    texto            TEXT,                            -- en audio: la transcripción
    estado           TEXT,                            -- out: sent | delivered | read | failed
    procesado        BOOLEAN NOT NULL DEFAULT FALSE,  -- in: ya lo leyó el agente (debounce)
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mensajes_wa_idx ON mensajes (wa_id, creado_en DESC);

-- ------------------------------------------------------------------ pedidos
CREATE TABLE pedidos (
    id                    BIGSERIAL PRIMARY KEY,
    conversacion_id       BIGINT REFERENCES conversaciones(id),
    wa_id                 TEXT,
    modalidad             TEXT NOT NULL CHECK (modalidad IN ('contraentrega', 'link_pago')),
    oferta_id             TEXT REFERENCES ofertas(id),
    total                 NUMERIC(12,2) NOT NULL,
    moneda                CHAR(3) NOT NULL,
    datos_envio           JSONB NOT NULL,             -- lo que validó tool_crear_pedido
    shopify_order_gid     TEXT UNIQUE,
    shopify_order_name    TEXT,                       -- '#1023'
    shopify_draft_gid     TEXT,
    invoice_url           TEXT,
    estado                TEXT NOT NULL DEFAULT 'creado'
                          CHECK (estado IN ('link_enviado', 'creado', 'despachado', 'en_reparto',
                                            'novedad', 'entregado', 'devuelto', 'cancelado')),
    transportadora        TEXT,
    guia                  TEXT,
    url_rastreo           TEXT,
    es_prueba             BOOLEAN NOT NULL DEFAULT FALSE,
    capi_purchase_en      TIMESTAMPTZ,                -- evita reenviar el evento
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedidos_wa_idx ON pedidos (wa_id, creado_en DESC);
CREATE INDEX pedidos_estado_idx ON pedidos (estado) WHERE es_prueba = FALSE;

-- Una plantilla de postventa por pedido, una sola vez.
CREATE TABLE notificaciones_postventa (
    pedido_id   BIGINT NOT NULL REFERENCES pedidos(id),
    plantilla   TEXT NOT NULL,
    enviado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (pedido_id, plantilla)
);

-- ---------------------------------------------------- campañas y anuncios
CREATE TABLE campanas (
    campaign_id  TEXT PRIMARY KEY,
    sku          TEXT NOT NULL REFERENCES productos(sku),
    tipo         TEXT NOT NULL DEFAULT 'prueba' CHECK (tipo IN ('prueba', 'escala')),
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Caché ad_id (referral.source_id) → campaña, para saber de qué producto habla cada conversación.
CREATE TABLE anuncios (
    ad_id        TEXT PRIMARY KEY,
    campaign_id  TEXT NOT NULL REFERENCES campanas(campaign_id)
);

-- ================================== Módulo P: señales, evaluación y pruebas
CREATE TABLE candidatos (
    dropi_id                TEXT PRIMARY KEY REFERENCES catalogo_dropi(dropi_id),
    ventas_7d_est           INTEGER,
    ventas_7d_prev_est      INTEGER,
    aceleracion             NUMERIC(6,2),
    dias_de_stock           NUMERIC(8,1),
    precio_venta_propuesto  NUMERIC(12,2),
    flete_cotizado          NUMERIC(12,2),
    margen_por_entrega      NUMERIC(12,2),
    utilidad_esperada       NUMERIC(12,2),
    saturacion              NUMERIC(5,1),             -- 0-100
    ml_precio_p50           NUMERIC(12,2),
    ml_en_mas_vendidos      BOOLEAN,
    -- comparador de mercado (DS-48); resumen de comparativo_mercado
    keywords_es             TEXT[],
    keywords_en             TEXT[],
    precio_local_min        NUMERIC(12,2),
    fuente_local_min        TEXT,                     -- 'exito' | 'falabella' | ...
    en_tienda_fisica_local  BOOLEAN,                  -- vendido por Éxito/Falabella (no marketplace)
    precio_intl_efectivo_min NUMERIC(12,2),           -- con envío + IVA si aplica, en COP
    fuente_intl_min         TEXT,                     -- 'aliexpress' | 'temu' | 'shein'
    ratio_local             NUMERIC(6,2),
    ratio_intl              NUMERIC(6,2),
    volumen_aliexpress      INTEGER,
    puntaje_mercado         NUMERIC(5,1),             -- 0-100
    comparado_en            TIMESTAMPTZ,
    pasa_filtros            BOOLEAN,
    motivo_descarte         TEXT,
    evaluacion_ia           JSONB,                    -- schemas/interno_evaluacion_producto.schema.json
    puntaje_ia              NUMERIC(5,1),             -- 0-100, calculado por n8n (no por el LLM)
    score_total             NUMERIC(5,1),
    estado                  TEXT NOT NULL DEFAULT 'nuevo'
                            CHECK (estado IN ('nuevo', 'filtrado', 'evaluado', 'en_shortlist',
                                              'aprobado', 'descartado', 'pospuesto')),
    evaluado_en             TIMESTAMPTZ,
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX candidatos_score_idx ON candidatos (score_total DESC) WHERE pasa_filtros;

-- Qué tiendas se consultan por categoría de Dropi (DS-48). '*' = categoría no mapeada.
CREATE TABLE fuentes_categoria (
    categoria        TEXT PRIMARY KEY,                -- nombre o id de categoría en Dropi
    fuentes_locales  TEXT[] NOT NULL,                 -- exito (catálogo VTEX directo) | falabella (Google Shopping filtrado
                                                      -- por tienda) | google_shopping_co (todas las tiendas) | mercadolibre (API ML)
    fuentes_intl     TEXT[] NOT NULL                  -- aliexpress | temu | shein
);

-- Cada resultado encontrado en otra tienda para un candidato.
CREATE TABLE comparativo_mercado (
    id               BIGSERIAL PRIMARY KEY,
    dropi_id         TEXT NOT NULL REFERENCES catalogo_dropi(dropi_id),
    fuente           TEXT NOT NULL,                   -- exito | falabella | alkosto | aliexpress | temu | shein | ...
    via              TEXT NOT NULL,                   -- exito_vtex | serpapi_shopping | aliexpress_api | manual
    keyword          TEXT,
    titulo           TEXT,
    url              TEXT,
    imagen_url       TEXT,
    vendedor         TEXT,
    vendido_por_tienda BOOLEAN,                       -- true = la tienda misma, no un tercero del marketplace
    precio           NUMERIC(12,2),                   -- COP
    envio            NUMERIC(12,2),
    precio_efectivo  NUMERIC(12,2),                   -- precio + envío + IVA de importación si aplica
    dias_entrega     TEXT,
    volumen_ventas   INTEGER,                         -- AliExpress
    coincidencia     TEXT CHECK (coincidencia IN ('igual', 'similar', 'distinto')),
    confianza        TEXT CHECK (confianza IN ('alta', 'media', 'baja')),
    consultado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comparativo_dropi_idx ON comparativo_mercado (dropi_id, consultado_en DESC);

-- Una fila por producto probado con anuncios: score predicho vs. resultado real.
CREATE TABLE pruebas_producto (
    id              BIGSERIAL PRIMARY KEY,
    sku             TEXT NOT NULL REFERENCES productos(sku),
    dropi_id        TEXT REFERENCES catalogo_dropi(dropi_id),
    score_predicho  NUMERIC(5,1),
    inicio          TIMESTAMPTZ,
    fin             TIMESTAMPTZ,
    gasto           NUMERIC(12,2),
    conversaciones  INTEGER,
    pedidos         INTEGER,
    entregados      INTEGER,
    cpa             NUMERIC(12,2),
    resultado       TEXT NOT NULL DEFAULT 'en_curso'
                    CHECK (resultado IN ('en_curso', 'ganador', 'descartado', 'no_concluyente')),
    motivo          TEXT,
    objeciones_top  JSONB                             -- resumen IA de conversaciones perdidas
);

-- -------------------------------------------------------------- operación
-- Dedupe de webhooks (Shopify: X-Shopify-Webhook-Id).
CREATE TABLE eventos_webhook (
    fuente       TEXT NOT NULL,                       -- 'shopify' | 'meta'
    evento_id    TEXT NOT NULL,
    topic        TEXT,
    recibido_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (fuente, evento_id)
);

-- Configuración no secreta y valores que rotan (token de Shopify de 24 h).
CREATE TABLE config (
    clave           TEXT PRIMARY KEY,
    valor           TEXT NOT NULL,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO config (clave, valor) VALUES
    -- sistema de ventas
    ('debounce_segundos',        '8'),
    ('stock_umbral_pausa',       '10'),
    ('max_turnos_agente',        '60'),
    ('shopify_access_token',     ''),          -- lo escribe DS-05
    -- Módulo P: precios y filtros (valores iniciales; ajústalos)
    ('multiplicador_precio',     '2.5'),       -- precio_venta mínimo = precio_proveedor × esto
    ('precio_venta_min',         '49900'),
    ('precio_venta_max',         '169900'),
    ('utilidad_min',             '25000'),     -- utilidad esperada por pedido, COP
    ('efectividad_esperada',     '0.75'),      -- entregados / pedidos
    ('comision_recaudo_pct',     '0.00'),      -- confirmar con Dropi
    ('stock_min',                '200'),
    ('ventas_7d_min',            '20'),
    ('max_evaluaciones_ia_dia',  '30'),
    ('pesos_score',              '{"demanda":0.30,"margen":0.20,"ia":0.25,"saturacion":0.10,"mercado":0.15}'),
    ('categorias_objetivo',      ''),          -- ids de categorías Dropi, separados por coma
    -- Módulo P: comparador de mercado (DS-48)
    ('max_comparaciones_dia',            '40'),
    ('descartar_si_ratio_local_mayor_a', '1.0'),   -- precio_venta / precio en tienda local (vendido por la tienda)
    ('mercado_umbrales',                 '{"local_ideal":0.77,"local_cero":1.1,"intl_ideal":2.5,"intl_cero":6,"intl_sin_dato":80}'),
    ('iva_importacion_umbral_usd',       '50'),    -- desde 1-ene-2026: compras > US$50 pagan 19 % de IVA
    ('iva_importacion_pct',              '0.19'),
    ('trm_usd_cop',                      ''),      -- actualízala semanalmente (o automatiza con datos.gov.co)
    -- plantillas de búsqueda para revisión manual (verifica que abran bien)
    ('url_busqueda_temu',       'https://www.temu.com/search_result.html?search_key={kw}'),
    ('url_busqueda_shein',      'https://co.shein.com/pdsearch/{kw}/'),
    ('url_busqueda_falabella',  'https://www.falabella.com.co/falabella-co/search?Ntt={kw}'),
    ('url_busqueda_exito',      'https://www.exito.com/s?q={kw}'),
    ('url_busqueda_aliexpress', 'https://es.aliexpress.com/w/wholesale-{kw}.html'),
    -- Módulo P: juez de pruebas (múltiplos del CPA máximo del producto)
    ('juez_matar_sin_ventas_x',  '1.5'),
    ('juez_matar_por_costo_x',   '3'),
    ('juez_ganador_min_pedidos', '5'),
    ('juez_cierre_min',          '0.05');

-- Fuentes por categoría. Ajusta los nombres de categoría a los que devuelva la API de Dropi.
INSERT INTO fuentes_categoria (categoria, fuentes_locales, fuentes_intl) VALUES
    ('hogar_cocina',   '{exito,falabella,mercadolibre}',                   '{temu,aliexpress}'),
    ('tecnologia',     '{falabella,exito,google_shopping_co,mercadolibre}', '{temu,aliexpress}'),
    ('moda_accesorios','{falabella,mercadolibre}',                          '{shein,temu,aliexpress}'),
    ('belleza',        '{exito,falabella}',                                 '{shein,temu}'),
    ('mascotas',       '{exito,mercadolibre}',                              '{temu,aliexpress}'),
    ('deporte',        '{falabella,exito,google_shopping_co}',              '{temu,aliexpress}'),
    ('bebes_juguetes', '{exito,falabella}',                                 '{temu,aliexpress}'),
    ('herramientas',   '{google_shopping_co,falabella,mercadolibre}',       '{temu,aliexpress}'),
    ('*',              '{exito,falabella,google_shopping_co,mercadolibre}', '{aliexpress,temu,shein}');
