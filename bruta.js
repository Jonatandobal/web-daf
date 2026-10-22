// ============================================================================
// BRUTA: pizzas para eventos, pedidas desde /bruta
// ============================================================================
// Bruta no vende al público: vende por catering, a través de esta web. Solo
// estos gustos y solo pizzas enteras, a un precio por tipo (simple o especial).
//
// Los pedidos entran a Blixi por la fuente "Pizzas BRUTA" (token propio,
// BLIXI_BRUTA_TOKEN), así caen en el local BRUTA y no en UDESA. La carta de
// Blixi (menu_items del local BRUTA) tiene los mismos gustos y precios: si se
// toca uno, se toca el otro.
// ============================================================================

export const BRUTA_PRECIOS = {
  simple: 8900,
  especial: 10900,
};

export const BRUTA_TIPOS = {
  simple: { label: 'Pizza simple', packageName: 'Pizza simple' },
  especial: { label: 'Pizza especial', packageName: 'Pizza especial' },
};

export const BRUTA_GUSTOS = [
  { name: 'Mozzarella', tipo: 'simple', description: 'Salsa de tomate, mozzarella y orégano' },
  { name: 'Pepperoni', tipo: 'simple', description: 'Salsa de tomate, mozzarella y peperoni' },
  { name: 'Jamón', tipo: 'simple', description: 'Salsa de tomate, mozzarella, jamón cocido' },
  { name: 'Margherita', tipo: 'simple', description: 'Salsa de tomate, mozzarella, albahaca fresca, aceite de oliva' },
  { name: 'Cherry', tipo: 'especial', description: 'Salsa de tomate, mozzarella, tomates confitados y orégano' },
  { name: 'Roque & Miel', tipo: 'especial', description: 'Mozzarella, queso roquefort, miel' },
  { name: 'Cebolla caramelizada', tipo: 'especial', description: 'Salsa de tomate, mozzarella y cebolla caramelizada' },
  { name: 'Mortadela', tipo: 'especial', description: 'Salsa de tomate, mozzarella, mortadela con pistachos y pesto de albahaca' },
];

/**
 * Del pedido por gusto ({ Mozzarella: 3, Cherry: 2 }) al formato que ya entiende
 * el webhook de Blixi (paquete × cantidad + extras), sin tocar Blixi:
 *
 *   · simples y especiales  → "Pizza simple" × n  +  extra "Pizza especial" × m
 *   · solo especiales       → "Pizza especial" × m
 *   · los gustos            → selectedBocados (el detalle de qué lleva cada una)
 *
 * El total cierra con paquete × cantidad + extras, que es lo que Blixi exige.
 */
export function armarPedidoBruta(cantidades) {
  const porTipo = { simple: 0, especial: 0 };
  const gustos = {};
  for (const g of BRUTA_GUSTOS) {
    const qty = Math.max(0, Math.floor(Number(cantidades[g.name]) || 0));
    if (qty > 0) {
      gustos[g.name] = qty;
      porTipo[g.tipo] += qty;
    }
  }
  const total = porTipo.simple * BRUTA_PRECIOS.simple + porTipo.especial * BRUTA_PRECIOS.especial;
  const pizzas = porTipo.simple + porTipo.especial;

  if (pizzas === 0) {
    return { pizzas: 0, porTipo, gustos, total: 0, packageName: null, attendees: 0, packagePricePerAttendee: 0, addons: [] };
  }
  if (porTipo.simple > 0) {
    return {
      pizzas, porTipo, gustos, total,
      packageName: BRUTA_TIPOS.simple.packageName,
      attendees: porTipo.simple,
      packagePricePerAttendee: BRUTA_PRECIOS.simple,
      addons: porTipo.especial > 0
        ? [{ name: BRUTA_TIPOS.especial.packageName, price: BRUTA_PRECIOS.especial, quantity: porTipo.especial }]
        : [],
    };
  }
  return {
    pizzas, porTipo, gustos, total,
    packageName: BRUTA_TIPOS.especial.packageName,
    attendees: porTipo.especial,
    packagePricePerAttendee: BRUTA_PRECIOS.especial,
    addons: [],
  };
}
