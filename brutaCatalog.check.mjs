// Chequeo de la lógica del portal de BRUTA. Correr con: node brutaCatalog.check.mjs
import assert from 'node:assert/strict';
import {
  resolveBrutaCatalog, pizzasDisponibles, armarRenglones, totalesDelPedido,
  validarPedido, minDeliveryDate, gastadoDelMes, validateBrutaCatalog, toStoredBrutaCatalog,
} from './brutaCatalog.js';

// Sin nada guardado: la semilla no tiene precio, así que no se ofrece nada.
const vacio = resolveBrutaCatalog(null);
assert.equal(vacio.pizzas.length, 1);
assert.equal(pizzasDisponibles(vacio.pizzas).length, 0);

// Lo guardado manda; apagados y sin precio no se ofrecen.
const c = resolveBrutaCatalog({ pizzas: [
  { name: 'Muzza', price: 8000, enabled: true },
  { name: 'Fugazzeta', price: 9000, enabled: false },
  { name: 'Sin precio', price: 0, enabled: true },
], leadDays: 2 });
assert.deepEqual(pizzasDisponibles(c.pizzas).map((p) => p.name), ['Muzza']);
assert.equal(c.leadDays, 2);

// Renglones y totales.
const r = armarRenglones(c.pizzas, { Muzza: '10', Fugazzeta: 0, 'Sin precio': -3 });
assert.deepEqual(r, [{ name: 'Muzza', qty: 10, unitPrice: 8000, subtotal: 80000 }]);
assert.deepEqual(totalesDelPedido(r), { totalUnits: 10, totalPrice: 80000 });

// Fechas: desde mañana por defecto, y respeta el anticipo configurado.
const hoy = new Date(2026, 9, 1, 23, 30); // 1/10/2026 23:30 locales
assert.equal(minDeliveryDate(1, hoy), '2026-10-02');
assert.equal(minDeliveryDate(3, hoy), '2026-10-04');
assert.equal(minDeliveryDate(0, hoy), '2026-10-02'); // nunca "hoy"

// Validación.
const min = '2026-10-02';
assert.deepEqual(validarPedido({ orderNumber: '  ', deliveryDate: '', renglones: [] }, min).length, 3);
assert.equal(validarPedido({ orderNumber: 'A-1', deliveryDate: '2026-10-01', renglones: r }, min).length, 1);
assert.equal(validarPedido({ orderNumber: 'A-1', deliveryDate: '2026-10-05', renglones: r }, min).length, 0);

// Gastado del mes: sólo BRUTA, sólo este mes, sin cancelados.
const orders = [
  { kind: 'bruta', orderDate: '2026-10-01', totalPrice: 80000, status: 'Pendiente' },
  { kind: 'bruta', orderDate: '2026-10-10', totalPrice: 20000, status: 'Cancelado' },
  { kind: 'bruta', orderDate: '2026-09-30', totalPrice: 50000, status: 'Pendiente' },
  { kind: undefined, orderDate: '2026-10-01', totalPrice: 999999, status: 'Pendiente' },
];
assert.equal(gastadoDelMes(orders, hoy), 80000);

// Carta: nombres vacíos o repetidos no se publican.
assert.equal(validateBrutaCatalog([{ name: ' ' }]).length, 1);
assert.equal(validateBrutaCatalog([{ name: 'Muzza' }, { name: 'muzza ' }]).length, 1);
assert.deepEqual(toStoredBrutaCatalog([{ name: ' Muzza ', price: '8000' }], 0),
  { pizzas: [{ name: 'Muzza', price: 8000, enabled: true }], leadDays: 1 });

console.log('OK: brutaCatalog');
