// Unit economics de un producto (ROADMAP Fase 0.2): margen por entrega y CPA máximo.
// No usa red ni credenciales.
//
// Uso (desde la raíz del repositorio):
//   node tienda/scripts/economia.mjs --precio 249900 --proveedor 159900 --flete 20000
// Opcionales:
//   --comision 4.5987     % que cobra Dropi sobre el precio (por defecto, el observado en OT-06: $10.112,68 de $219.900)
//   --retorno 20000       flete de devolución (por defecto, igual al flete de ida)
//   --ia 2000             costo de IA + WhatsApp por pedido creado (estimado)
//   --cpa 25000           CPA objetivo, para calcular el margen y el precio necesarios
import { pathToFileURL } from 'node:url';

export const DEFAULTS = { comision: 4.5987, ia: 2000, cpa: 25000 };
export const EFECTIVIDADES = [0.65, 0.7, 0.75, 0.8, 0.85];

export function calcular({ precio, proveedor, flete, comision = DEFAULTS.comision, retorno = flete, ia = DEFAULTS.ia }) {
  for (const [k, v] of Object.entries({ precio, proveedor, flete, comision, retorno, ia })) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`Valor inválido para --${k}: ${v}`);
  }
  const comisionValor = (precio * comision) / 100;
  const margen = precio - proveedor - flete - comisionValor;
  const costoDevolucion = flete + retorno;
  const escenarios = EFECTIVIDADES.map((e) => {
    const utilidad = e * margen - (1 - e) * costoDevolucion;
    return { efectividad: e, utilidad, cpaMaximo: utilidad - ia };
  });
  // Efectividad a partir de la cual se gana algo sin anuncios.
  const efectividadMinima = (costoDevolucion + ia) / (margen + costoDevolucion);
  return { comisionValor, margen, costoDevolucion, escenarios, efectividadMinima, multiplo: precio / proveedor };
}

// Precio de venta necesario para pagar un CPA objetivo con una efectividad dada.
export function precioNecesario({ proveedor, flete, comision = DEFAULTS.comision, retorno = flete, ia = DEFAULTS.ia, cpa = DEFAULTS.cpa, efectividad = 0.75 }) {
  const margenNecesario = (cpa + ia + (1 - efectividad) * (flete + retorno)) / efectividad;
  const precio = (margenNecesario + proveedor + flete) / (1 - comision / 100);
  return { margenNecesario, precio };
}

function leerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]?.replace(/^--/, '');
    if (!k || argv[i + 1] === undefined) throw new Error(`Falta el valor de ${argv[i]}`);
    args[k] = Number(String(argv[i + 1]).replace(/[.,\s](?=\d{3}\b)/g, ''));
  }
  for (const k of ['precio', 'proveedor', 'flete']) {
    if (args[k] === undefined) throw new Error(`Falta --${k}. Uso: --precio 249900 --proveedor 159900 --flete 20000`);
  }
  return args;
}

const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n) => (n * 100).toFixed(1).replace('.0', '') + ' %';

function main() {
  const a = leerArgs(process.argv.slice(2));
  const r = calcular(a);
  const n = precioNecesario(a);
  const cpa = a.cpa ?? DEFAULTS.cpa;

  console.log(`Precio ${cop(a.precio)} · proveedor ${cop(a.proveedor)} · flete ${cop(a.flete)} · comisión ${a.comision ?? DEFAULTS.comision} %`);
  console.log(`Precio / proveedor: ${r.multiplo.toFixed(2)}x`);
  console.log(`Margen por pedido entregado: ${cop(r.margen)}`);
  console.log(`Costo por pedido devuelto:   ${cop(r.costoDevolucion)}\n`);
  console.log('Efectividad  Utilidad/pedido  CPA máximo');
  for (const e of r.escenarios) {
    console.log(`${pct(e.efectividad).padStart(10)}  ${cop(e.utilidad).padStart(15)}  ${cop(e.cpaMaximo).padStart(10)}`);
  }
  console.log(`\nSin anuncios se pierde dinero si se entrega menos del ${pct(r.efectividadMinima)} de los pedidos.`);
  console.log(`Para pagar un CPA de ${cop(cpa)} con 75 % de efectividad hace falta un margen de ${cop(n.margenNecesario)} por entrega, es decir, un precio de al menos ${cop(n.precio)}.`);
  const cpa75 = r.escenarios.find((e) => e.efectividad === 0.75).cpaMaximo;
  console.log(cpa75 >= cpa ? '\nVEREDICTO: da para anunciar con el CPA objetivo.' : `\nVEREDICTO: NO da para el CPA objetivo (CPA máximo al 75 %: ${cop(cpa75)}).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
