// ============================================================================
// CATALOGO UNICO DE LA APP
// ============================================================================
// Fuente de verdad de la ESTRUCTURA: nombres, descripciones y composicion de
// cada combo, y la carta de bocados. Lo importa tanto la web de pedidos
// (App.jsx) como el panel de admin (AdminPanel.jsx), asi no hay dos copias
// que se puedan desincronizar.
//
// Los PRECIOS VIGENTES viven en Firebase (documento `prices/{appId}`) y se
// editan desde /admin. `seedPrice` es solo el valor inicial: se usa cuando
// Firebase todavia no tiene un precio para ese item (alta nueva o primer
// arranque). Nunca pisa un precio ya guardado.
//
// La DISPONIBILIDAD de cada bocado tambien vive en Firebase, como una lista de
// articulos deshabilitados (`disabledItems`). Al ser una lista de excepciones,
// todo lo que este en la carta arranca habilitado: dar de alta un bocado nuevo
// no exige tocar el panel.
//
// Precios semilla alineados con la lista ago-26.
// ============================================================================

// Carta de bocados. NO llevan precio: lo que el cliente elige dentro de su
// combo ya esta incluido en el precio por persona del paquete, no se cobra
// aparte. El costo unitario de cada bocado es informacion interna y no tiene
// lugar en la app.
export const MENU_ITEMS = [
    // ===== CATEGORÍA FACTURAS (Usada en Combo 2) =====
    { type: 'bocadoFactura', name: 'Medialuna de Manteca 🆕' },
    { type: 'bocadoFactura', name: 'Medialuna de Grasa 🆕' },
    { type: 'bocadoFactura', name: 'Librito' },
    { type: 'bocadoFactura', name: 'Churrinche' },
    { type: 'bocadoFactura', name: 'Sacramento 🆕' },

    // ===== CATEGORÍA BOCADOS SIMPLES (Usada en Combo 3, 7, 8) =====
    // Estos son los "Simples DULCES" para el Combo 8
    { type: 'bocadoSimple', name: 'Medialuna de Manteca' },
    { type: 'bocadoSimple', name: 'Medialuna de Grasa' },
    { type: 'bocadoSimple', name: 'Librito' },
    { type: 'bocadoSimple', name: 'Churrinche' },
    { type: 'bocadoSimple', name: 'Sacramento 🆕' },
    { type: 'bocadoSimple', name: 'Madeleine Bañada en Chocolate 🆕' },
    { type: 'bocadoSimple', name: 'Rosquita de Frutilla/Arándano 🆕' },
    { type: 'bocadoSimple', name: 'Cake de Manzana 🆕' },
    { type: 'bocadoSimple', name: 'Mini Budín de Limón y Amapola con Glace 🆕' },
    { type: 'bocadoSimple', name: 'Mini Budín de Choco con Naranja 🆕' },
    { type: 'bocadoSimple', name: 'Mini Budín Choco Bañado en Choco 🆕' },
    { type: 'bocadoSimple', name: 'Pepa de Membrillo 🆕' },
    { type: 'bocadoSimple', name: 'Budín Marmolado' },
    { type: 'bocadoSimple', name: 'Budín Banana y Nuez' },
    { type: 'bocadoSimple', name: 'Budín Limón y Amapola' },
    { type: 'bocadoSimple', name: 'Cuadradito Brownie' },
    { type: 'bocadoSimple', name: 'Cuadradito Pasta Frola' },
    { type: 'bocadoSimple', name: 'Cuadradito Coco y Dulce de Leche' },
    { type: 'bocadoSimple', name: 'Cookie Red Velvet' },
    { type: 'bocadoSimple', name: 'Cookie Choco' },
    { type: 'bocadoSimple', name: 'Cookie Chips Choco' },
    { type: 'bocadoSimple', name: 'Cookie Vegana' },
    { type: 'bocadoSimple', name: 'Cookie Chocolate (Sin TACC) 🌾' },
    { type: 'bocadoSimple', name: 'Cookie de Vainilla (Sin TACC) 🌾' },
    { type: 'bocadoSimple', name: 'Cuadradito de Pasta Frola (Sin TACC) 🌾' },
    { type: 'bocadoSimple', name: 'Alfajorcito Sable' },
    { type: 'bocadoSimple', name: 'Alfajorcito Choco' },
    { type: 'bocadoSimple', name: 'Alfajorcito Maicena' },
    { type: 'bocadoSimple', name: 'Shot de Ensalada de Frutas' },
    { type: 'bocadoSimple', name: 'Shot de Yogurt con Granola' },
    { type: 'bocadoSimple', name: 'Pinchos de Frutas 🆕' },
    { type: 'bocadoSimple', name: 'Fruta de Estación' },
    { type: 'bocadoSimple', name: 'Barrita de Cereal' },
    
    // ===== CATEGORÍA BOCADOS SALADOS SIMPLES (Usada en Combo 3 y 8) =====
    { type: 'bocadoSaladoSimple', name: 'Medialuna con Jamón y Queso' },
    { type: 'bocadoSaladoSimple', name: 'Chipacito de Queso' },
    { type: 'bocadoSaladoSimple', name: 'Scon de Queso' },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Blanco' },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Negro' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pains Jamón y Queso' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lomito y Queso Danbo 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Bondiola y Queso 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate y Queso 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lechuga y Queso 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Queso y Aceituna 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕' },
    { type: 'bocadoSaladoSimple', name: 'Roll de Jamón y Queso (Sin TACC) 🌾' },
    { type: 'bocadoSaladoSimple', name: 'Roll de Jamón y Queso 🆕' },

    // ===== CATEGORÍA BOCADOS ESPECIALES DULCES (Usada en Combo 4, 6, 9) =====
    { type: 'bocadoEspecialDulce', name: 'Medialuna de Manteca' },
    { type: 'bocadoEspecialDulce', name: 'Medialuna de Grasa' },
    { type: 'bocadoEspecialDulce', name: 'Librito' },
    { type: 'bocadoEspecialDulce', name: 'Churrinche' },
    { type: 'bocadoEspecialDulce', name: 'Sacramento 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Madeleine Bañada 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Rosquita Rellena de Frutilla/Arándano 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Cake de Manzana 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín de Limón y Amapola con Glace 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín de Choco con Naranja 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín Choco Bañado en Choco 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Pepa de Membrillo 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Budín Marmolado' },
    { type: 'bocadoEspecialDulce', name: 'Budín Banana y Nuez' },
    { type: 'bocadoEspecialDulce', name: 'Budín Limón y Amapola' },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Brownie' },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Pasta Frola' },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Coco y Dulce de Leche' },
    { type: 'bocadoEspecialDulce', name: 'Cookie de Chip de Chocolate' },
    { type: 'bocadoEspecialDulce', name: 'Cookie de Chocolate' },
    { type: 'bocadoEspecialDulce', name: 'Cookie Red Velvet' },
    { type: 'bocadoEspecialDulce', name: 'Cookie Vegana' },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Maicena' },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito Sablé' },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Chocolate' },
    { type: 'bocadoEspecialDulce', name: 'Shot de Ensalada de Frutas' },
    { type: 'bocadoEspecialDulce', name: 'Shot de Yogurt con Granola' },
    { type: 'bocadoEspecialDulce', name: 'Pinchos de Frutas 🆕' },
    { type: 'bocadoEspecialDulce', name: 'Fruta de Estación' },
    { type: 'bocadoEspecialDulce', name: 'Barrita de Cereal' },

    // ===== CATEGORÍA BOCADOS ESPECIALES SALADOS (Usada en Combo 5, 9) =====
    { type: 'bocadoEspecialSalado', name: 'Chipacito de Queso' },
    { type: 'bocadoEspecialSalado', name: 'Scon de Queso' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Blanco' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Negro' },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Jamón y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Pollo' },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Carne' },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap Vegetariano' },
    { type: 'bocadoEspecialSalado', name: 'Triángulos de Queso con Semillas de Sésamo 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Pizzeta Tomate y Mozzarella (Sin TACC) 🌾' },
    { type: 'bocadoEspecialSalado', name: 'Medialuna de Jamón y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pains de Jamón y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Lomito y Queso Danbo' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Bondiola y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Tomate y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Lechuga y Queso' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Queso y Aceituna' },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón Crudo y Queso 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Aceituna 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Huevo y Queso 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón y Lechuga 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Roll de Jamón y Queso (Sin TACC) 🌾🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Chipa de Jamón y Queso (Sin TACC) 🌾🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón y Tomate 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Tomate 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Roquefort 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Lechuga 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Sacramento de Jamón y Queso 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕' },
    { type: 'bocadoEspecialSalado', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕' },

    // ===== CATEGORÍA EMPANADAS (NUEVA, Usada en Combo 7) =====
    { type: 'empanada', name: 'Empanada de Carne' },
    { type: 'empanada', name: 'Empanada de Pollo' },
    { type: 'empanada', name: 'Empanada de Jamón y Queso' },
    { type: 'empanada', name: 'Empanada de Verdura' },

    // ===== CATEGORÍA SHOTS DULCES (Usada en Combo 9) =====
    { type: 'shotDulce', name: 'Shot Dulce - Lemon Pie 🆕' },
    { type: 'shotDulce', name: 'Shot Dulce - Chocotorta 🆕' },
    { type: 'shotDulce', name: 'Shot Dulce - Red Velvet 🆕' },

    // ===== CATEGORÍA BEBIDAS SIMPLES (Usada en Combo 8 y 9) =====
    { type: 'bebidaSimple', name: 'Agua Mineral' },
    { type: 'bebidaSimple', name: 'Gaseosa Light' },
    { type: 'bebidaSimple', name: 'Gaseosa Común' },
];

// Paquetes / combos. El precio es POR PERSONA.
export const PACKAGES = [
  { 
    id: 'C1', 
    name: '1. Coffee Break (Simple)', 
    description: 'Infusiones, jugo y agua.', 
    seedPrice: 2860,
    attendeesBase: 1, 
    hasNespressoOption: true,
  },
  { 
    id: 'C1N', 
    name: '1. Coffee Break (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua.', 
    seedPrice: 4420,
    attendeesBase: 1, 
    isNespresso: true,
  },
  { 
    id: 'C2', 
    name: '2. Coffee Break + 2 Facturas', 
    description: 'Infusiones, jugo y agua + 2 Facturas.', 
    seedPrice: 4940,
    attendeesBase: 1,
    bocadoFacturaCount: 2,
    hasNespressoOption: true,
  },
  { 
    id: 'C2N', 
    name: '2. Coffee Break + 2 Facturas (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 Facturas.', 
    seedPrice: 7280,
    attendeesBase: 1,
    bocadoFacturaCount: 2,
    isNespresso: true,
  },
  {
    id: 'C3',
    name: '3. Coffee Break + 2 Bocados Simples (Mixto)',
    description: 'Infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).',
    seedPrice: 6760,
    attendeesBase: 1,
    bocadoSimpleTotalCount: 2, // Total compartido entre dulces y salados
    hasNespressoOption: true,
  },
  {
    id: 'C3N',
    name: '3. Coffee Break + 2 Bocados Simples (con NESPRESSO)',
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).',
    seedPrice: 8515,
    attendeesBase: 1,
    bocadoSimpleTotalCount: 2, // Total compartido entre dulces y salados
    isNespresso: true,
  },
  {
    id: 'C4',
    name: '4. Coffee Break + 2 Bocados Especiales (Dulce y/o Salado)',
    description: 'Infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).',
    seedPrice: 7540,
    attendeesBase: 1,
    bocadoEspecialTotalCount: 2,
    hasNespressoOption: true,
  },
  {
    id: 'C4N',
    name: '4. Coffee Break + 2 Bocados Especiales (con NESPRESSO)',
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).',
    seedPrice: 9815,
    attendeesBase: 1,
    bocadoEspecialTotalCount: 2,
    isNespresso: true,
  },
  { 
    id: 'C5', 
    name: '5. Coffee Break + 2 Bocados Salados Especiales', 
    description: 'Infusiones, jugo y agua + 2 bocados salados especiales.', 
    seedPrice: 8580,
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 2,
    hasNespressoOption: true,
  },
  { 
    id: 'C5N', 
    name: '5. Coffee Break + 2 Bocados Salados Especiales (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados salados especiales.', 
    seedPrice: 10920,
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 2,
    isNespresso: true,
  },
  {
    id: 'C6N',
    name: '6. Coffee Break (NESPRESSO) + 4 Bocados Especiales (Dulce y/o Salado)',
    description: 'Nespresso, infusiones, jugo y agua + 4 bocados especiales (Dulce y/o Salado).',
    seedPrice: 10920,
    attendeesBase: 1,
    bocadoEspecialTotalCount: 4,
    isNespresso: true,
  },
  {
    id: 'C7N',
    name: '7. Coffee Break (NESPRESSO) + 2 Empanadas + 2 Bocados',
    description: 'Nespresso, infusiones, jugo y agua + 2 empanadas + 2 bocados (dulces y/o salados simples).',
    seedPrice: 12480,
    attendeesBase: 1,
    empanadaCount: 2,
    bocadoSimpleTotalCount: 2,
    isNespresso: true,
  },
  {
    id: 'C8S',
    name: '8. BIENVENIDA SIMPLE',
    description: '1 bocado dulce simple + 3 bocados salados simples + 1 bebida (agua, gaseosa light o común).',
    seedPrice: 11375,
    attendeesBase: 1,
    bocadoSimpleCount: 1,
    bocadoSaladoSimpleCount: 3,
    bebidaSimpleCount: 1,
  },
  {
    id: 'C9F',
    name: '9. BIENVENIDA FULL',
    description: 'Infusiones, jugo y agua + 2 bocados dulces esp. + 1 shot dulce + 5 bocados salados esp. + 1 bebida (agua, gaseosa light o común).',
    seedPrice: 24051,
    attendeesBase: 1,
    bocadoEspecialDulceCount: 2,
    shotDulceCount: 1,
    bocadoEspecialSaladoCount: 5,
    bebidaSimpleCount: 1,
    hasNespressoOption: true,
  },
  {
    id: 'C9FN',
    name: '9. BIENVENIDA FULL (con NESPRESSO)',
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados dulces esp. + 1 shot dulce + 5 bocados salados esp. + 1 bebida (agua, gaseosa light o común).',
    seedPrice: 26781,
    attendeesBase: 1,
    bocadoEspecialDulceCount: 2,
    shotDulceCount: 1,
    bocadoEspecialSaladoCount: 5,
    bebidaSimpleCount: 1,
    isNespresso: true,
  },
];

// Extras que se cobran por unidad ademas del paquete.
export const ADDONS = [
  { name: 'Yogurt Bebible Frutilla/Vainilla (Jarra x Litro)', seedPrice: 7150 },
  { name: 'Agua Mineral (grande 1.5lts)', seedPrice: 2730 },
  { name: 'Agua Mineral Chica', seedPrice: 1950 },
  { name: 'Gaseosa (grande)', seedPrice: 5850 },
  { name: 'Jugo Cepita x Litro', seedPrice: 3250 },
  { name: 'Bocaditos Salados', seedPrice: 2860 },
  { name: 'Bocaditos Dulces', seedPrice: 845 },
  { name: 'Frutas', seedPrice: 1690 },
  { name: 'Personal de Apoyo: Jornada 3 hs', seedPrice: 27301 },
  { name: 'Personal de Apoyo: Jornada 6 hs', seedPrice: 29901 },
  { name: 'Personal de Apoyo: Jornada 9 hs', seedPrice: 35101 },
];

// Categorias de la carta, en el orden en que se muestran en el panel de admin.
// El `label` es como se llama la categoria de cara a quien administra; el
// `type` es el que llevan los items de MENU_ITEMS.
export const ITEM_CATEGORIES = [
  { type: 'bocadoFactura', label: 'Facturas' },
  { type: 'bocadoSimple', label: 'Bocados simples dulces' },
  { type: 'bocadoSaladoSimple', label: 'Bocados simples salados' },
  { type: 'bocadoEspecialDulce', label: 'Bocados especiales dulces' },
  { type: 'bocadoEspecialSalado', label: 'Bocados especiales salados' },
  { type: 'empanada', label: 'Empanadas' },
  { type: 'shotDulce', label: 'Shots dulces' },
  { type: 'bebidaSimple', label: 'Bebidas' },
];

// Que tipos de item sirve cada tope declarado en un paquete (`...Count`).
// Los `...TotalCount` son topes compartidos entre dos categorias.
export const COUNT_ITEM_TYPES = {
  bocadoFacturaCount: ['bocadoFactura'],
  empanadaCount: ['empanada'],
  bocadoSimpleCount: ['bocadoSimple'],
  bocadoSaladoSimpleCount: ['bocadoSaladoSimple'],
  bocadoSimpleTotalCount: ['bocadoSimple', 'bocadoSaladoSimple'],
  bocadoEspecialDulceCount: ['bocadoEspecialDulce'],
  bocadoEspecialSaladoCount: ['bocadoEspecialSalado'],
  bocadoEspecialTotalCount: ['bocadoEspecialDulce', 'bocadoEspecialSalado'],
  shotDulceCount: ['shotDulce'],
  bebidaSimpleCount: ['bebidaSimple'],
};

// Identificador estable de un articulo. Va por tipo + nombre porque el mismo
// bocado aparece en varias categorias (una medialuna puede ser "simple" y
// "especial") y se habilita por separado en cada una.
export const itemKey = (item) => `${item.type}::${item.name}`;

// Unidades que el cliente tiene que elegir por asistente para completar el
// paquete. Un tope cuya categoria quedo sin articulos habilitados no se exige:
// si no hay nada para elegir, no se puede pedir.
export function requiredUnitsPerAttendee(pkg, availableItems) {
  const typesConStock = new Set(availableItems.map((item) => item.type));

  return Object.entries(COUNT_ITEM_TYPES).reduce((sum, [countKey, types]) => {
    const count = pkg?.[countKey] || 0;
    if (!count || !types.some((type) => typesConStock.has(type))) return sum;
    return sum + count;
  }, 0);
}

const normalize = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Combina la estructura del codigo con lo guardado en Firebase: precios y
// articulos deshabilitados. Acepta tanto el formato nuevo (mapas de precios)
// como el viejo (objetos completos), para que la migracion sea transparente.
export function resolveCatalog(data) {
  const pkgPrices = data?.packagePrices
    ?? Object.fromEntries((data?.packages ?? []).map((p) => [p.id, p.basePrice]));

  const rawAddonPrices = data?.addonPrices
    ?? Object.fromEntries((data?.addons ?? []).map((a) => [a.name, a.price]));
  const addonPrices = new Map(
    Object.entries(rawAddonPrices).map(([name, price]) => [normalize(name), price])
  );

  const packages = PACKAGES.map(({ seedPrice, ...pkg }) => {
    const stored = pkgPrices[pkg.id];
    const hasStored = Number.isFinite(stored);
    return { ...pkg, basePrice: hasStored ? stored : seedPrice, fromSeed: !hasStored };
  });

  const addons = ADDONS.map(({ seedPrice, ...addon }) => {
    const stored = addonPrices.get(normalize(addon.name));
    const hasStored = Number.isFinite(stored);
    return { ...addon, price: hasStored ? stored : seedPrice, fromSeed: !hasStored };
  });

  const disabled = new Set(data?.disabledItems ?? []);
  const menuItems = MENU_ITEMS.map((item) => ({
    ...item,
    key: itemKey(item),
    enabled: !disabled.has(itemKey(item)),
  }));

  return { packages, addons, menuItems };
}

// Reduce el estado del admin a lo unico que se persiste: precios y la lista de
// articulos apagados.
export function toStoredCatalog(packages, addons, menuItems) {
  return {
    packagePrices: Object.fromEntries(packages.map((p) => [p.id, p.basePrice])),
    addonPrices: Object.fromEntries(addons.map((a) => [a.name, a.price])),
    disabledItems: menuItems.filter((i) => !i.enabled).map((i) => i.key ?? itemKey(i)),
  };
}
