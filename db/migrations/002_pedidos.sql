INSERT INTO config (clave, valor) VALUES
    ('modo_pedidos', 'simulado'),
    ('shopify_token_expira_en', ''),
    ('shopify_gateway_contraentrega', 'Pago contra entrega')
ON CONFLICT (clave) DO NOTHING;
