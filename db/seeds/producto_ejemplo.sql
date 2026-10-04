-- 2. Semilla db/seeds/producto_ejemplo.sql (producto de EJEMPLO, solo para pruebas)
INSERT INTO productos (sku, nombre, shopify_variant_gid, moneda, estado, disponible)
VALUES ('CM-135', 'Producto de Prueba CM-135', 'gid://shopify/ProductVariant/48848562651254', 'COP', 'prueba', true)
ON CONFLICT (sku) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    shopify_variant_gid = EXCLUDED.shopify_variant_gid,
    estado = EXCLUDED.estado,
    disponible = EXCLUDED.disponible;

INSERT INTO ofertas (id, sku, descripcion, cantidad, precio_total, activa)
VALUES 
    ('x1', 'CM-135', '1 unidad', 1, 219900.00, true),
    ('x2', 'CM-135', '2 unidades', 2, 399900.00, true)
ON CONFLICT (id) DO UPDATE SET 
    sku = EXCLUDED.sku,
    descripcion = EXCLUDED.descripcion,
    cantidad = EXCLUDED.cantidad,
    precio_total = EXCLUDED.precio_total,
    activa = EXCLUDED.activa;

INSERT INTO cobertura (departamento, ciudad, ciudad_norm, shopify_province_code, acepta_contraentrega)
VALUES ('Valle del Cauca', 'Cali', 'cali', 'VAC', true)
ON CONFLICT (departamento, ciudad) DO UPDATE SET 
    ciudad_norm = EXCLUDED.ciudad_norm,
    shopify_province_code = EXCLUDED.shopify_province_code,
    acepta_contraentrega = EXCLUDED.acepta_contraentrega;
