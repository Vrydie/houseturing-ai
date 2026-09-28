-- db/seeds/cobertura_prueba.sql
INSERT INTO cobertura (departamento, ciudad, ciudad_norm, shopify_province_code, acepta_contraentrega, dias_entrega_min, dias_entrega_max) VALUES
('Bogotá D.C.', 'Bogotá', 'bogota', 'DC', true, 1, 2),
('Antioquia', 'Medellín', 'medellin', 'ANT', true, 1, 3),
('Valle del Cauca', 'Cali', 'cali', 'VAC', true, 1, 3),
('Atlántico', 'Barranquilla', 'barranquilla', 'ATL', true, 2, 4),
('Santander', 'Bucaramanga', 'bucaramanga', 'SAN', true, 2, 4),
('Risaralda', 'Pereira', 'pereira', 'RIS', true, 2, 3),
('Guaviare', 'San José', 'san jose', 'GUV', true, 4, 8),
('Caldas', 'San José', 'san jose', 'CAL', true, 2, 4),
('Amazonas', 'Leticia', 'leticia', 'AMA', false, 5, 15),
('Cundinamarca', 'Soacha', 'soacha', 'CUN', true, 1, 2),
('Bolívar', 'Cartagena', 'cartagena', 'BOL', true, 2, 4),
('Nariño', 'Pasto', 'pasto', 'NAR', true, 3, 5)
ON CONFLICT (departamento, ciudad) DO UPDATE 
SET acepta_contraentrega = EXCLUDED.acepta_contraentrega;

-- Update config for simulated WhatsApp
INSERT INTO config (clave, valor) VALUES 
('whatsapp_modo_simulado', 'true'),
('whatsapp_app_secret_prueba', 'secret_local_test_12345')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
