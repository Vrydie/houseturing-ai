// node --test tienda/scripts/economia.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcular, precioNecesario } from './economia.mjs';

// Números reales del pedido TEST #1001 (OT-06): taladro de ejemplo, Cali → Cali.
const taladro = { precio: 219900, proveedor: 159900, flete: 17647 };

test('el margen por entrega coincide con el que mostró Dropi ($32.241)', () => {
  const r = calcular(taladro);
  assert.ok(Math.abs(r.margen - 32241) < 2, `margen ${r.margen}`);
  assert.ok(Math.abs(r.comisionValor - 10112.68) < 5, `comisión ${r.comisionValor}`);
});

test('el CPA máximo del taladro al 75 % es de unos $13.357', () => {
  const e75 = calcular(taladro).escenarios.find((e) => e.efectividad === 0.75);
  assert.equal(Math.round(e75.cpaMaximo), 13357);
});

test('el flete de retorno es igual al de ida si no se indica', () => {
  assert.equal(calcular(taladro).costoDevolucion, 2 * 17647);
  assert.equal(calcular({ ...taladro, retorno: 10000 }).costoDevolucion, 27647);
});

test('con más efectividad el CPA máximo sube', () => {
  const cpas = calcular(taladro).escenarios.map((e) => e.cpaMaximo);
  assert.deepEqual([...cpas].sort((a, b) => a - b), cpas);
});

test('el precio necesario devuelve exactamente el CPA objetivo', () => {
  const { precio } = precioNecesario({ ...taladro, cpa: 25000 });
  const e75 = calcular({ ...taladro, precio }).escenarios.find((e) => e.efectividad === 0.75);
  assert.ok(Math.abs(e75.cpaMaximo - 25000) < 1, `cpa ${e75.cpaMaximo}`);
});

test('rechaza valores inválidos', () => {
  assert.throws(() => calcular({ ...taladro, flete: NaN }));
  assert.throws(() => calcular({ ...taladro, precio: -1 }));
});
