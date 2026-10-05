import test from 'node:test';
import assert from 'node:assert';
import { validarEntrada, armarPayload } from '../../workflows/dst2_logic.js';

test('validarEntrada - faltan datos', () => {
  const input = { datos_envio: { celular: "3001234567" }, confirmado_por_cliente: true };
  const res = validarEntrada(input);
  assert.strictEqual(res.ok, false);
});

test('validarEntrada - celular inválido', () => {
  const input = { datos_envio: { celular: "1001234567", direccion: "Calle 1", barrio: "B", ciudad: "C" }, confirmado_por_cliente: true };
  const res = validarEntrada(input);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'Celular inválido');
});

test('validarEntrada - no confirmado', () => {
  const input = { datos_envio: { celular: "3001234567", direccion: "Calle 1", barrio: "B", ciudad: "C" }, confirmado_por_cliente: false };
  const res = validarEntrada(input);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'Pedido no confirmado explícitamente');
});

test('armarPayload - x1 (tag TEST, sin customer, formato Dropi)', () => {
  const env = { celular: "3001234567", nombre: "Juan", apellido: "Perez", direccion: "Calle 1 #2-3", barrio: "Centro", ciudad: "Cali" };
  const db = { 
    cantidad: 1, 
    precio_total: 219900.00, 
    shopify_variant_gid: "gid://shopify/ProductVariant/123",
    ciudad_oficial: "Cali",
    shopify_province_code: "VAC"
  };
  const payload = armarPayload(env, db, "573001234567", 123, true);
  const order = payload.variables.order;
  
  assert.strictEqual(order.tags.includes("TEST"), true);
  assert.strictEqual(order.tags.includes("canal:whatsapp"), true);
  assert.strictEqual(order.customer, undefined);
  assert.strictEqual(order.shippingAddress.phone, "+573001234567");
  assert.strictEqual(order.lineItems[0].quantity, 1);
  assert.strictEqual(order.lineItems[0].priceSet.shopMoney.amount, "219900");
  assert.strictEqual(order.transactions[0].amountSet.shopMoney.amount, "219900");
});

test('armarPayload - x2 (tag TEST, cantidad 2, precios correctos)', () => {
  const env = { celular: "3001234567", nombre: "Juan", apellido: "Perez", direccion: "Calle 1 #2-3", barrio: "Centro", ciudad: "Cali" };
  const db = { 
    cantidad: 2, 
    precio_total: 399900.00, 
    shopify_variant_gid: "gid://shopify/ProductVariant/123",
    ciudad_oficial: "Cali",
    shopify_province_code: "VAC"
  };
  const payload = armarPayload(env, db, "573001234567", 123, true);
  const order = payload.variables.order;
  
  assert.strictEqual(order.lineItems[0].quantity, 2);
  assert.strictEqual(order.lineItems[0].priceSet.shopMoney.amount, "199950");
  assert.strictEqual(order.transactions[0].amountSet.shopMoney.amount, "399900");
});

test('armarPayload - real sin TEST', () => {
  const env = { celular: "3001234567", nombre: "Juan", apellido: "Perez", direccion: "Calle 1 #2-3", barrio: "Centro", ciudad: "Cali" };
  const db = { 
    cantidad: 1, 
    precio_total: 219900.00, 
    shopify_variant_gid: "gid://shopify/ProductVariant/123",
    ciudad_oficial: "Cali",
    shopify_province_code: "VAC"
  };
  const payload = armarPayload(env, db, "573001234567", 123, false);
  const order = payload.variables.order;
  
  assert.strictEqual(order.tags.includes("TEST"), false);
});
