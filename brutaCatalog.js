// ============================================================================
// PORTAL DE PEDIDOS DE BRUTA (pizzas)
// ============================================================================
// Lógica pura del portal: carta, fechas, validación y totales. Sin React ni
// Firebase, así se puede probar suelta (ver `brutaCatalog.check.mjs`).
//
// La CARTA (gustos y precios) vive en Firebase, en el documento
// `prices/{appId}-bruta`, y se edita desde /admin/bruta. `PIZZAS_SEED` es sólo
// lo que se ofrece mientras nadie la tocó. Un gusto sin precio (<= 0) NO se
// muestra al cliente: nunca se toma un pedido a $0.
//
// El pedido se guarda en la misma colección que los de Coffee Break
// (`artifacts/{appId}/users/{uid}/orders`) con `kind: 'bruta'`, para no
// depender de reglas de Firestore nuevas.
// ============================================================================

export const BRUTA_KIND = 'bruta';

// Con cuántos días de anticipación se puede pedir si el admin no configuró otra
// cosa. 1 = desde mañana.
export const DEFAULT_LEAD_DAYS = 1;

// Semilla: sólo el gusto del que ya se habló. Sin precio, queda oculto hasta que
// se cargue desde /admin/bruta.
export const PIZZAS_SEED = [
  { name: 'Pizza Napoletana', price: 0, enabled: true },
];

/** 'YYYY-MM-DD' en hora local (no UTC: a la noche en Argentina UTC ya es mañana). */
export const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Primera fecha de entrega que se puede pedir. */
export const minDeliveryDate = (leadDays = DEFAULT_LEAD_DAYS, now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + Math.max(1, Number(leadDays) || DEFAULT_LEAD_DAYS));
  return toISODate(d);
};

/**
 * Carta + configuración a partir de lo guardado en Firebase (o null).
 * Lo guardado manda sobre la semilla.
 */
export const resolveBrutaCatalog = (stored) => {
  const rawItems = Array.isArray(stored?.pizzas) ? stored.pizzas : PIZZAS_SEED;
  const pizzas = rawItems
    .map((p) => ({
      name: String(p?.name ?? '').trim(),
      price: Math.max(0, Number(p?.price) || 0),
      enabled: p?.enabled !== false,
    }))
    .filter((p) => p.name);
  const leadDays = Math.max(1, Number(stored?.leadDays) || DEFAULT_LEAD_DAYS);
  return { pizzas, leadDays, lastUpdated: stored?.lastUpdated ?? null };
};

/** Lo que se guarda en Firebase: sólo carta y configuración. */
export const toStoredBrutaCatalog = (pizzas, leadDays) => ({
  pizzas: pizzas.map((p) => ({
    name: p.name.trim(),
    price: Math.max(0, Number(p.price) || 0),
    enabled: p.enabled !== false,
  })),
  leadDays: Math.max(1, Number(leadDays) || DEFAULT_LEAD_DAYS),
});

/** Lo que ve el cliente: prendido y con precio. */
export const pizzasDisponibles = (pizzas) => pizzas.filter((p) => p.enabled && p.price > 0);

/** Errores de la carta antes de publicarla (vacíos o repetidos rompen el pedido). */
export const validateBrutaCatalog = (pizzas) => {
  const errores = [];
  const vistos = new Set();
  pizzas.forEach((p, i) => {
    const nombre = p.name.trim();
    if (!nombre) {
      errores.push(`El gusto #${i + 1} no tiene nombre.`);
      return;
    }
    const clave = nombre.toLowerCase();
    if (vistos.has(clave)) errores.push(`"${nombre}" está repetido.`);
    vistos.add(clave);
  });
  return errores;
};

/** Renglones del pedido: sólo los gustos con cantidad > 0, con el precio vigente. */
export const armarRenglones = (pizzas, cantidades) =>
  pizzas
    .map((p) => ({ name: p.name, qty: Math.floor(Number(cantidades[p.name]) || 0), unitPrice: p.price }))
    .filter((r) => r.qty > 0)
    .map((r) => ({ ...r, subtotal: r.qty * r.unitPrice }));

export const totalesDelPedido = (renglones) => ({
  totalUnits: renglones.reduce((s, r) => s + r.qty, 0),
  totalPrice: renglones.reduce((s, r) => s + r.subtotal, 0),
});

/** Devuelve la lista de problemas del pedido; vacía = se puede enviar. */
export const validarPedido = ({ orderNumber, deliveryDate, renglones }, minDate) => {
  const errores = [];
  if (!String(orderNumber ?? '').trim()) errores.push('Cargá el número de orden.');
  if (!deliveryDate) errores.push('Elegí la fecha de entrega.');
  else if (deliveryDate < minDate) errores.push('La fecha de entrega es demasiado próxima.');
  if (renglones.length === 0) errores.push('Elegí al menos una pizza.');
  return errores;
};

/** Lo gastado en pedidos de BRUTA del mes de `now` (los cancelados no cuentan). */
export const gastadoDelMes = (orders, now = new Date()) => {
  const prefijo = toISODate(now).slice(0, 7);
  return orders
    .filter((o) => o.kind === BRUTA_KIND && o.status !== 'Cancelado')
    .filter((o) => String(o.orderDate ?? '').startsWith(prefijo))
    .reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
};
