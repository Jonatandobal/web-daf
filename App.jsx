import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, addDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db as firestore, appId } from './firebase.js';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';

// --- CONFIGURACIÓN DE DATA ---

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// Función para obtener la fecha mínima (48 horas desde hoy)
const getMinDate = () => {
  const today = new Date();
  const minDate = new Date(today.getTime() + 48 * 60 * 60 * 1000);
  return minDate.toISOString().split('T')[0];
};

// ========== MENÚ DE BOCADOS ACTUALIZADO - OCTUBRE 2025 ==========
const menuItems = [
    // ===== CATEGORÍA FACTURAS (Usada en Combo 2) =====
    { type: 'bocadoFactura', name: 'Medialuna de Manteca 🆕', price: 100 },
    { type: 'bocadoFactura', name: 'Medialuna de Grasa 🆕', price: 100 },
    { type: 'bocadoFactura', name: 'Librito', price: 100 },
    { type: 'bocadoFactura', name: 'Churrinche', price: 100 },
    { type: 'bocadoFactura', name: 'Dona Bañada Chocolate 🆕', price: 100 },
    { type: 'bocadoFactura', name: 'Dona Bañada Rosa 🆕', price: 100 },
    { type: 'bocadoFactura', name: 'Sacramento 🆕', price: 100 },

    // ===== CATEGORÍA BOCADOS SIMPLES (Usada en Combo 3, 7, 8) =====
    // Estos son los "Simples DULCES" para el Combo 8
    { type: 'bocadoSimple', name: 'Medialuna de Manteca', price: 120 },
    { type: 'bocadoSimple', name: 'Medialuna de Grasa', price: 120 },
    { type: 'bocadoSimple', name: 'Librito', price: 120 },
    { type: 'bocadoSimple', name: 'Churrinche', price: 120 },
    { type: 'bocadoSimple', name: 'Dona Bañada Chocolate 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Dona Bañada Rosa 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Sacramento 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Madeleine Bañada en Chocolate 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Rosquita de Frutilla/Arándano 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Cake de Manzana 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Mini Budín de Limón y Amapola con Glace 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Mini Budín de Choco con Naranja 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Mini Budín Choco Bañado en Choco 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Pepa de Membrillo 🆕', price: 120 },
    { type: 'bocadoSimple', name: 'Budín Marmolado', price: 120 },
    { type: 'bocadoSimple', name: 'Budín Banana y Nuez', price: 120 },
    { type: 'bocadoSimple', name: 'Budín Limón y Amapola', price: 120 },
    { type: 'bocadoSimple', name: 'Cuadradito Brownie', price: 120 },
    { type: 'bocadoSimple', name: 'Cuadradito Pasta Frola', price: 120 },
    { type: 'bocadoSimple', name: 'Cuadradito Coco y Dulce de Leche', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie Red Velvet', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie Choco', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie Chips Choco', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie Vegana', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie Chocolate (Sin TACC) 🌾', price: 120 },
    { type: 'bocadoSimple', name: 'Cookie de Vainilla (Sin TACC) 🌾', price: 120 },
    { type: 'bocadoSimple', name: 'Cuadradito de Pasta Frola (Sin TACC) 🌾', price: 120 },
    { type: 'bocadoSimple', name: 'Alfajorcito Sable', price: 120 },
    { type: 'bocadoSimple', name: 'Alfajorcito Choco', price: 120 },
    { type: 'bocadoSimple', name: 'Alfajorcito Maicena', price: 120 },
    { type: 'bocadoSimple', name: 'Shot de Ensalada de Frutas', price: 150 },
    { type: 'bocadoSimple', name: 'Shot de Yogurt con Granola', price: 150 },
    { type: 'bocadoSimple', name: 'Pinchos de Frutas 🆕', price: 150 },
    { type: 'bocadoSimple', name: 'Fruta de Estación', price: 150 },
    { type: 'bocadoSimple', name: 'Barrita de Cereal', price: 150 },
    
    // ===== CATEGORÍA BOCADOS SALADOS SIMPLES (Usada en Combo 3 y 8) =====
    { type: 'bocadoSaladoSimple', name: 'Medialuna con Jamón y Queso', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Chipacito de Queso', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Scon de Queso', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Blanco', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Negro', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pains Jamón y Queso', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lomito y Queso Danbo 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Bondiola y Queso 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate y Queso 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lechuga y Queso 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Queso y Aceituna 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Roll de Jamón y Queso (Sin TACC) 🌾', price: 180 },
    { type: 'bocadoSaladoSimple', name: 'Roll de Jamón y Queso 🆕', price: 180 },

    // ===== CATEGORÍA BOCADOS ESPECIALES DULCES (Usada en Combo 4, 6, 9) =====
    { type: 'bocadoEspecialDulce', name: 'Medialuna de Manteca', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Medialuna de Grasa', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Librito', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Churrinche', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Dona Bañada Chocolate 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Dona Bañada Rosa 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Sacramento 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Madeleine Bañada 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Rosquita Rellena de Frutilla/Arándano 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cake de Manzana 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín de Limón y Amapola con Glace 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín de Choco con Naranja 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Mini Budín Choco Bañado en Choco 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Pepa de Membrillo 🆕', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Budín Marmolado', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Budín Banana y Nuez', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Budín Limón y Amapola', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Brownie', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Pasta Frola', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cuadradito de Coco y Dulce de Leche', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cookie de Chip de Chocolate', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cookie de Chocolate', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cookie Red Velvet', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Cookie Vegana', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Chipacito de Queso', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Scon de Queso', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Sandwich de Miga Blanco', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Sandwich de Miga Negro', price: 200 },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Maicena', price: 180 },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito Sablé', price: 180 },
    { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Chocolate', price: 180 },
    { type: 'bocadoEspecialDulce', name: 'Shot de Ensalada de Frutas', price: 250 },
    { type: 'bocadoEspecialDulce', name: 'Shot de Yogurt con Granola', price: 250 },
    { type: 'bocadoEspecialDulce', name: 'Pinchos de Frutas 🆕', price: 250 },
    { type: 'bocadoEspecialDulce', name: 'Fruta de Estación', price: 250 },
    { type: 'bocadoEspecialDulce', name: 'Barrita de Cereal', price: 250 },

    // ===== CATEGORÍA BOCADOS ESPECIALES SALADOS (Usada en Combo 5, 9) =====
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Jamón y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Pollo', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap de Carne', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Mini Wrap Vegetariano', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Triángulos de Queso con Semillas de Sésamo 🆕', price: 300 },
    { type: 'bocadoEspecialSalado', name: 'Pizzeta Tomate y Mozzarella (Sin TACC) 🌾', price: 350 },
    { type: 'bocadoEspecialSalado', name: 'Medialuna de Jamón y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pains de Jamón y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Lomito y Queso Danbo', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Bondiola y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Tomate y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Lechuga y Queso', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Queso y Aceituna', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón Crudo y Queso 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Aceituna 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Huevo y Queso 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón y Lechuga 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Roll de Jamón y Queso (Sin TACC) 🌾🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Chipa de Jamón y Queso (Sin TACC) 🌾🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Jamón y Tomate 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Tomate 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Roquefort 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Queso y Lechuga 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Sacramento de Jamón y Queso 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕', price: 280 },
    { type: 'bocadoEspecialSalado', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕', price: 280 },

    // ===== CATEGORÍA EMPANADAS (NUEVA, Usada en Combo 7) =====
    { type: 'empanada', name: 'Empanada de Carne', price: 300 },
    { type: 'empanada', name: 'Empanada de Pollo', price: 300 },
    { type: 'empanada', name: 'Empanada de Jamón y Queso', price: 300 },
    { type: 'empanada', name: 'Empanada de Verdura', price: 300 },

    // ===== CATEGORÍA SHOTS DULCES (Usada en Combo 9) =====
    { type: 'shotDulce', name: 'Shot Dulce - Lemon Pie 🆕', price: 180 },
    { type: 'shotDulce', name: 'Shot Dulce - Chocotorta 🆕', price: 180 },
    { type: 'shotDulce', name: 'Shot Dulce - Red Velvet 🆕', price: 180 },

    // ===== CATEGORÍA BEBIDAS SIMPLES (Usada en Combo 8 y 9) =====
    { type: 'bebidaSimple', name: 'Agua Mineral', price: 0 },
    { type: 'bebidaSimple', name: 'Gaseosa', price: 0 },
];

// Definición de paquetes base (Combos actualizados con precio POR PERSONA)
const packages = [
  { 
    id: 'C1', 
    name: '1. Coffee Break (Simple)', 
    description: 'Infusiones, jugo y agua.', 
    basePrice: 2200, 
    attendeesBase: 1, 
    hasNespressoOption: true,
  },
  { 
    id: 'C1N', 
    name: '1. Coffee Break (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua.', 
    basePrice: 3400, 
    attendeesBase: 1, 
    isNespresso: true,
  },
  { 
    id: 'C2', 
    name: '2. Coffee Break + 2 Facturas', 
    description: 'Infusiones, jugo y agua + 2 Facturas.', 
    basePrice: 3800, 
    attendeesBase: 1,
    bocadoFacturaCount: 2,
    hasNespressoOption: true,
  },
  { 
    id: 'C2N', 
    name: '2. Coffee Break + 2 Facturas (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 Facturas.', 
    basePrice: 5600, 
    attendeesBase: 1,
    bocadoFacturaCount: 2,
    isNespresso: true,
  },
  { 
    id: 'C3', 
    name: '3. Coffee Break + 2 Bocados Simples (Mixto)', 
    description: 'Infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).', 
    basePrice: 5200, 
    attendeesBase: 1,
    bocadoSimpleTotalCount: 2, 
    hasNespressoOption: true,
  },
  { 
    id: 'C3N', 
    name: '3. Coffee Break + 2 Bocados Simples (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).', 
    basePrice: 6550, 
    attendeesBase: 1,
    bocadoSimpleTotalCount: 2, 
    isNespresso: true,
  },
  { 
    id: 'C4', 
    name: '4. Coffee Break + 2 Bocados Especiales (Mixto)', 
    description: 'Infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).', 
    basePrice: 5800, 
    attendeesBase: 1,
    bocadoEspecialTotalCount: 2,
    hasNespressoOption: true,
  },
  { 
    id: 'C4N', 
    name: '4. Coffee Break + 2 Bocados Especiales (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).', 
    basePrice: 7550, 
    attendeesBase: 1,
    bocadoEspecialTotalCount: 2,
    isNespresso: true,
  },
  { 
    id: 'C5', 
    name: '5. Coffee Break + 2 Bocados Salados Especiales', 
    description: 'Infusiones, jugo y agua + 2 bocados salados especiales.', 
    basePrice: 6600, 
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 2,
    hasNespressoOption: true,
  },
  { 
    id: 'C5N', 
    name: '5. Coffee Break + 2 Bocados Salados Especiales (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 2 bocados salados especiales.', 
    basePrice: 8400, 
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 2,
    isNespresso: true,
  },
  { 
    id: 'C6N', 
    name: '6. Coffee Break (NESPRESSO) + 4 Bocados Especiales (Mixto)', 
    description: 'Nespresso, infusiones, jugo y agua + 4 bocados especiales (Dulce y/o Salado).', 
    basePrice: 8400, 
    attendeesBase: 1,
    bocadoEspecialTotalCount: 4, 
    isNespresso: true,
  },
  { 
    id: 'C7N', 
    name: '7. Coffee Break (NESPRESSO) + 2 Empanadas + 2 Bocados Simples', 
    description: 'Nespresso, infusiones, jugo y agua + 2 empanadas + 2 bocados simples.', 
    basePrice: 9600, 
    attendeesBase: 1,
    empanadaCount: 2, 
    bocadoSimpleCount: 2,
    isNespresso: true,
  },
  { 
    id: 'C8S', 
    name: '8. BIENVENIDA SIMPLE', 
    description: '3 bocados salados simples + 1 bocado dulce simple + 1 bebida (agua o gaseosa).', 
    basePrice: 8750, 
    attendeesBase: 1,
    bocadoSaladoSimpleCount: 3,
    bocadoSimpleCount: 1,
    bebidaSimpleCount: 1, 
  },
  { 
    id: 'C9F', 
    name: '9. BIENVENIDA FULL', 
    description: 'Infusiones, jugo y agua + 5 bocados salados esp. + 2 bocados dulces esp. + 1 shot dulce + 1 bebida (agua o gaseosa).', 
    basePrice: 18500, 
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 5,
    bocadoEspecialDulceCount: 2,
    shotDulceCount: 1,
    bebidaSimpleCount: 1, 
    hasNespressoOption: true,
  },
  { 
    id: 'C9FN', 
    name: '9. BIENVENIDA FULL (con NESPRESSO)', 
    description: 'Nespresso, infusiones, jugo y agua + 5 bocados salados esp. + 2 bocados dulces esp. + 1 shot dulce + 1 bebida (agua o gaseosa).', 
    basePrice: 20600, 
    attendeesBase: 1,
    bocadoEspecialSaladoCount: 5,
    bocadoEspecialDulceCount: 2,
    shotDulceCount: 1,
    bebidaSimpleCount: 1, 
    isNespresso: true,
  },
];

// Definición de add-ons/extras actualizados
const addons = [
  { name: 'Yogurt Bebible Frutilla/Vainilla (Jarra x Litro)', price: 5500 },
  { name: 'Agua Mineral', price: 2100 },
  { name: 'Gaseosa', price: 4500 },
  { name: 'Jugo Cepita x Litro', price: 2500 },
  { name: 'Bocaditos Salados', price: 2200 },
  { name: 'Bocaditos Dulces', price: 650 },
  { name: 'Frutas', price: 1300 },
  { name: 'Personal de Apoyo: Jornada 3 hs', price: 21000 },
  { name: 'Personal de Apoyo: Jornada 6 hs', price: 23000 },
  { name: 'Personal de Apoyo: Jornada 9 hs', price: 27000 },
];

// --- FUNCIONES DE UTILIDAD ---

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// --- COMPONENTES ---

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Cargando...
  </div>
);

const OrderList = ({ orders, userEmail }) => {
  if (!orders.length) {
    return <p className="text-center text-gray-500 italic p-6">Aún no has realizado pedidos.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Mis Pedidos ({orders.length})</h2>
      {orders.map((order) => (
        <div key={order.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-lg font-bold text-indigo-600">{order.packageName}</p>
              <p className="text-sm text-gray-500">
                <span className="font-medium">Fecha:</span> {order.eventDate} a las {order.eventTime}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Usuario:</span> <span className="text-indigo-400 text-[10px]">{userEmail}</span>
              </p>
            </div>
            <p className="text-2xl font-extrabold text-green-600">{formatCurrency(order.totalPrice)}</p>
          </div>
          <p className="text-sm text-gray-700">Para <strong>{order.attendees}</strong> asistentes.</p>
          
          {order.selectedBocados && Object.keys(order.selectedBocados).length > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-sm font-semibold text-gray-700">Detalle de Bocados:</p>
              <ul className="list-disc list-inside text-xs text-gray-600 ml-2">
                {Object.entries(order.selectedBocados).map(([name, quantity]) => (
                    quantity > 0 && <li key={name}>{quantity} unidades de {name}</li>
                ))}
              </ul>
            </div>
          )}

          {order.addons && order.addons.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-sm font-semibold text-gray-700">Extras:</p>
              <ul className="list-disc list-inside text-xs text-gray-600 ml-2">
                {order.addons.map((addon, index) => (
                  <li key={index}>
                    {addon.quantity} x {addon.name} ({formatCurrency(addon.quantity * addon.price)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {order.observations && (
            <div className="mt-2 text-xs text-gray-500 italic">
                <span className="font-semibold">Obs:</span> {order.observations}
            </div>
          )}
          <p className="mt-2 text-xs text-right text-gray-400">Creado: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('es-AR') : 'Fecha no disponible'}</p>
        </div>
      ))}
    </div>
  );
};

// Componente para seleccionar bocados dentro de un combo
const BocadoSelector = ({ 
    title, 
    itemTypes, 
    maxTotalPerAttendee, 
    formData, 
    setFormData, 
    attendees,
    otherItemTypes = [], 
    sharedMaxTotalPerAttendee = 0 
}) => {
    
    const maxToUse = sharedMaxTotalPerAttendee > 0 ? sharedMaxTotalPerAttendee : maxTotalPerAttendee;

    const availableItems = useMemo(() => {
        if (!itemTypes) return [];
        return menuItems.filter(item => itemTypes.includes(item.type));
    }, [itemTypes]);

    const otherAvailableItems = useMemo(() => {
        if (!otherItemTypes) return [];
        return menuItems.filter(item => otherItemTypes.includes(item.type));
    }, [otherItemTypes]);
    
    const currentTotalSelected = useMemo(() => {
        const thisCategoryTotal = availableItems.reduce((sum, item) => sum + (formData.selectedBocados[item.name] || 0), 0);
        
        if (sharedMaxTotalPerAttendee > 0) {
            const otherCategoryTotal = otherAvailableItems.reduce((sum, item) => sum + (formData.selectedBocados[item.name] || 0), 0);
            return thisCategoryTotal + otherCategoryTotal;
        }
        
        return thisCategoryTotal;

    }, [formData.selectedBocados, availableItems, otherAvailableItems, sharedMaxTotalPerAttendee]);

    const totalMax = maxToUse * attendees;
    const remaining = totalMax - currentTotalSelected;

    if (maxToUse <= 0) return null;

    const handleBocadoChange = (bocadoName, change) => {
        setFormData(prev => {
            const currentQuantity = prev.selectedBocados[bocadoName] || 0;
            let newQuantity = currentQuantity + change;
            
            newQuantity = Math.max(0, newQuantity);

            const tentativeTotalSelected = currentTotalSelected - currentQuantity + newQuantity;

            if (change > 0 && tentativeTotalSelected > totalMax) {
                 newQuantity = currentQuantity + remaining;
            }

            newQuantity = Math.max(0, newQuantity);

            return {
                ...prev,
                selectedBocados: {
                    ...prev.selectedBocados,
                    [bocadoName]: newQuantity,
                }
            };
        });
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-inner">
            <h4 className="font-semibold text-gray-800 mb-2">
                {title} 
                {sharedMaxTotalPerAttendee === 0 && (
                    <span className={`text-xs ${remaining === 0 ? 'text-red-500 font-bold' : 'text-indigo-600'}`}>
                        ({currentTotalSelected} de {totalMax} unidades seleccionadas)
                    </span>
                )}
            </h4>
            
            {sharedMaxTotalPerAttendee === 0 && (
                <p className="text-xs text-gray-500 mb-3">
                    Máximo de unidades <strong>TOTALES</strong> a elegir: <strong>{totalMax}</strong> (Base por asistente: {maxToUse} unidad/es)
                </p>
            )}
            
            {availableItems.map((item) => (
                <div key={item.name} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-b-0">
                    <p className="text-sm text-gray-700 flex-1">{item.name}</p>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => handleBocadoChange(item.name, -1)}
                            disabled={!formData.selectedBocados[item.name] || formData.selectedBocados[item.name] <= 0}
                            className="p-1 bg-red-50 text-red-600 rounded-full w-6 h-6 flex items-center justify-center disabled:opacity-30 transition text-sm hover:bg-red-100"
                        >
                            -
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">
                            {formData.selectedBocados[item.name] || 0}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleBocadoChange(item.name, 1)}
                            disabled={remaining <= 0}
                            className="p-1 bg-green-50 text-green-600 rounded-full w-6 h-6 flex items-center justify-center transition hover:bg-green-100 disabled:opacity-30 text-sm"
                        >
                            +
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  // SOLUCION: Calcular minDateString ANTES de usarlo en el estado inicial
  const minDateString = useMemo(() => getMinDate(), []);

  // Form State - Inicialización correcta
  const [formData, setFormData] = useState(() => {
    const initialBocados = menuItems.reduce((acc, item) => ({ ...acc, [item.name]: 0 }), {});

    return {
        name: '',
        email: '',
        eventDate: minDateString, 
        eventTime: '10:00',
        attendees: 20,
        selectedPackageId: packages[0]?.id || 'C1',
        addonQuantities: addons.reduce((acc, addon) => ({ ...acc, [addon.name]: 0 }), {}),
        selectedBocados: initialBocados,
        observations: '',
    };
  });

  // --- HOOKS DE FIREBASE ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Carga de datos (Pedidos del usuario actual)
  useEffect(() => {
    if (firestore && user) {
      const ordersRef = collection(firestore, `artifacts/${appId}/users/${user.uid}/orders`);
      const q = query(ordersRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt, 
        }));
        setOrders(fetchedOrders);
      }, (error) => {
        console.error("Error fetching orders:", error);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Resetea la selección de bocados cuando cambia el paquete
  useEffect(() => {
    setFormData(prev => ({
        ...prev,
        selectedBocados: menuItems.reduce((acc, item) => ({ ...acc, [item.name]: 0 }), {}),
    }));
  }, [formData.selectedPackageId]);

  // --- CÁLCULO DEL TOTAL DEL PEDIDO ---

  const totalPrice = useMemo(() => {
    if (!formData.attendees || formData.attendees <= 0) return 0;

    const selectedPackage = packages.find(p => p.id === formData.selectedPackageId);
    if (!selectedPackage) return 0;

    const packageCost = selectedPackage.basePrice * formData.attendees;

    const addonsCost = addons.reduce((total, addon) => {
      const quantity = formData.addonQuantities[addon.name] || 0;
      return total + (quantity * addon.price);
    }, 0);
    
    return packageCost + addonsCost;
  }, [formData]);

  // --- MANEJADORES DE EVENTOS ---

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    if (type === 'number') {
        newValue = Math.max(1, Number(value));
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleAddonChange = (addonName, change) => {
    const isSupportStaff = addonName.startsWith('Personal de Apoyo');

    setFormData(prev => {
      const currentQuantity = prev.addonQuantities[addonName] || 0;
      let newQuantity = currentQuantity + change;
      
      if (isSupportStaff) {
          if (change > 0) {
              if (currentQuantity === 1) {
                  return prev;
              }
              
              const updatedQuantities = addons.reduce((acc, addon) => {
                  if (addon.name.startsWith('Personal de Apoyo') && addon.name !== addonName) {
                      acc[addon.name] = 0;
                  } else {
                      acc[addon.name] = prev.addonQuantities[addon.name] || 0;
                  }
                  return acc;
              }, {});
              
              updatedQuantities[addonName] = 1;
              
              return {
                  ...prev,
                  addonQuantities: updatedQuantities
              };
          } else {
              newQuantity = 0;
          }
      }
      
      newQuantity = Math.max(0, newQuantity);

      return {
          ...prev,
          addonQuantities: {
              ...prev.addonQuantities,
              [addonName]: newQuantity
          }
      };
    });
  };

  const getTotalSelectedForMixto = (itemTypes) => {
      const items = menuItems.filter(item => itemTypes.includes(item.type));
      return items.reduce((sum, item) => sum + (formData.selectedBocados[item.name] || 0), 0);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firestore || !user || isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const selectedPackage = packages.find(p => p.id === formData.selectedPackageId);
      if (!selectedPackage) throw new Error("Paquete de servicio no válido.");
      
      if (!formData.email) throw new Error("El campo Email es obligatorio.");

      const selectedAddons = addons
        .filter(addon => formData.addonQuantities[addon.name] > 0)
        .map(addon => ({
          name: addon.name,
          price: addon.price,
          quantity: formData.addonQuantities[addon.name]
        }));
      
      let totalBocadosRequired = 0;
      let totalBocadosSelected = 0;

      if (selectedPackage.bocadoSimpleTotalCount > 0) {
          totalBocadosRequired += selectedPackage.bocadoSimpleTotalCount * formData.attendees;
          totalBocadosSelected += getTotalSelectedForMixto(['bocadoSimple', 'bocadoSaladoSimple']);
      }
      if (selectedPackage.bocadoEspecialTotalCount > 0) {
          totalBocadosRequired += selectedPackage.bocadoEspecialTotalCount * formData.attendees;
          totalBocadosSelected += getTotalSelectedForMixto(['bocadoEspecialDulce', 'bocadoEspecialSalado']);
      }

      const nonMixtoCounts = Object.keys(selectedPackage)
          .filter(key => key.includes('Count') && !key.includes('TotalCount'))
          .reduce((sum, key) => sum + (selectedPackage[key] || 0), 0);

      totalBocadosRequired += nonMixtoCounts * formData.attendees;
      
      const nonMixtoTypes = ['bocadoFactura', 'empanada', 'shotDulce', 'bebidaSimple']; 
      
      if (selectedPackage.bocadoSimpleCount > 0) nonMixtoTypes.push('bocadoSimple'); 
      if (selectedPackage.bocadoSaladoSimpleCount > 0) nonMixtoTypes.push('bocadoSaladoSimple');
      if (selectedPackage.bocadoEspecialSaladoCount > 0) nonMixtoTypes.push('bocadoEspecialSalado');
      if (selectedPackage.bocadoEspecialDulceCount > 0) nonMixtoTypes.push('bocadoEspecialDulce');
      
      totalBocadosSelected += getTotalSelectedForMixto(nonMixtoTypes);


      if (totalBocadosRequired > 0 && totalBocadosSelected === 0) {
        throw new Error("Por favor, selecciona la variedad de bocados/bebidas para tu combo.");
      }
      
      if (totalBocadosRequired > 0 && totalBocadosSelected < totalBocadosRequired) {
          throw new Error(`Debes seleccionar un total de ${totalBocadosRequired} unidades de bocados/bebidas (Seleccionaste ${totalBocadosSelected}).`);
      }
      
      const orderData = {
        name: formData.name || 'N/A',
        email: formData.email,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        attendees: formData.attendees,
        packageName: selectedPackage.name,
        packagePricePerAttendee: selectedPackage.basePrice, 
        addons: selectedAddons,
        selectedBocados: Object.fromEntries(Object.entries(formData.selectedBocados).filter(([, quantity]) => quantity > 0)),
        totalPrice: totalPrice,
        observations: formData.observations,
        status: 'Pendiente',
        userId: user.uid,
        userEmail: user.email,
        appId: appId,
        timestamp: new Date().toISOString(), 
      };

      const ordersRef = collection(firestore, `artifacts/${appId}/users/${user.uid}/orders`);
      const docRef = await addDoc(ordersRef, { ...orderData, createdAt: serverTimestamp() });
      
      orderData.orderId = docRef.id;

      if (N8N_WEBHOOK_URL) {
          try {
              const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(orderData)
              });
              
              if (!webhookResponse.ok) {
                  console.error('Error enviando datos al webhook:', webhookResponse.statusText);
              } else {
                  console.log('Datos enviados a webhook con éxito.');
              }
          } catch (webhookError) {
              console.error('Fallo al conectar con el webhook:', webhookError);
          }
      }

      setFormData(prev => ({
        ...prev,
        eventDate: minDateString, 
        attendees: 20,
        selectedPackageId: packages[0]?.id || 'C1',
        addonQuantities: addons.reduce((acc, addon) => ({ ...acc, [addon.name]: 0 }), {}),
        selectedBocados: menuItems.reduce((acc, item) => ({ ...acc, [item.name]: 0 }), {}),
        observations: '',
      }));
      
      setMessage(`✅ ¡Pedido realizado con éxito! Total: ${formatCurrency(totalPrice)}`);

    } catch (error) {
      console.error("Error al guardar el pedido:", error);
      if (error.message.includes("bocados") || error.message.includes("unidades") || error.message.includes("Email")) {
         setMessage(`❌ Error de validación: ${error.message}`);
      } else {
         setMessage(`❌ Error al enviar el pedido: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setOrders([]);
      setMessage('');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar Login o Register
  if (!user) {
    if (showRegister) {
      return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />;
  }

  const selectedPackage = packages.find(p => p.id === formData.selectedPackageId);
  const needsBocadoSelection = Object.keys(selectedPackage || {}).some(key => key.includes('Count') && selectedPackage[key] > 0);
  
  const isMixtoEspecial = selectedPackage?.bocadoEspecialTotalCount > 0 && 
                         !(selectedPackage?.bocadoEspecialDulceCount > 0) &&
                         !(selectedPackage?.bocadoEspecialSaladoCount > 0);

  const isMixtoSimple = selectedPackage?.bocadoSimpleTotalCount > 0 && 
                       !(selectedPackage?.bocadoSimpleCount > 0) &&
                       !(selectedPackage?.bocadoSaladoSimpleCount > 0);

  const totalSelectedMixtoSimple = isMixtoSimple ? getTotalSelectedForMixto(['bocadoSimple', 'bocadoSaladoSimple']) : 0;
  const totalMaxMixtoSimple = (selectedPackage?.bocadoSimpleTotalCount || 0) * formData.attendees;
  const remainingMixtoSimple = totalMaxMixtoSimple - totalSelectedMixtoSimple;

  const totalSelectedMixtoEspecial = isMixtoEspecial ? getTotalSelectedForMixto(['bocadoEspecialDulce', 'bocadoEspecialSalado']) : 0;
  const totalMaxMixtoEspecial = (selectedPackage?.bocadoEspecialTotalCount || 0) * formData.attendees;
  const remainingMixtoEspecial = totalMaxMixtoEspecial - totalSelectedMixtoEspecial;


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto">

        <header className="text-center mb-8 p-6 bg-white rounded-xl shadow-lg border-b-4 border-indigo-400">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-extrabold text-gray-900">
                Sistema de Pedidos Coffee Break UDESA
              </h1>
              <p className="text-gray-500 mt-2 text-sm">Organiza tu evento de manera rápida y sencilla.</p>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Usuario: <span className="font-medium text-indigo-600">{user.email}</span>
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-2xl space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">1. Configurar Pedido</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-indigo-700">Detalles del Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium text-sm">Fecha del Evento:</span>
                    <input
                      type="date"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleInputChange}
                      required
                      min={minDateString} 
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 font-medium text-sm">Hora del Evento:</span>
                    <input
                      type="time"
                      name="eventTime"
                      value={formData.eventTime}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-gray-700 font-medium text-sm">Cantidad de Asistentes:</span>
                    <input
                      type="number"
                      name="attendees"
                      value={formData.attendees}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </label>
                </div>
                
                <h3 className="text-lg font-semibold text-indigo-700 pt-4 border-t">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block md:col-span-2">
                        <span className="text-gray-700 font-medium text-sm">Email de Contacto (Obligatorio):</span>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="ejemplo@udesa.edu.ar"
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </label>
                    <label className="block md:col-span-2">
                        <span className="text-gray-700 font-medium text-sm">Nombre de Contacto (Opcional):</span>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Ej: Juan Pérez"
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold text-indigo-700">2. Paquete de Servicio (Precio por Persona)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition duration-150 ease-in-out ${
                        formData.selectedPackageId === pkg.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, selectedPackageId: pkg.id }))}
                    >
                      <p className="font-bold text-gray-800 flex justify-between items-center text-base">
                        {pkg.name}
                        {pkg.isNespresso && <span className='text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full'>NESPRESSO</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                      <p className="text-xl font-extrabold text-green-700 mt-2">
                        {formatCurrency(pkg.basePrice)} / pers.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {needsBocadoSelection && (
                <div className="space-y-4 pt-4 border-t p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-800">2b. Selección de Bocados ({formData.attendees} asistentes)</h3>
                    <p className="text-sm text-blue-700 italic">Elige la variedad de bocados <strong>totales</strong> que incluye tu paquete. El límite se basa en <strong>unidades por asistente</strong>.</p>

                    <div className="space-y-4">
                        
                        <BocadoSelector
                            title="Facturas (Medialunas, Libritos, etc.)"
                            itemTypes={['bocadoFactura']}
                            maxTotalPerAttendee={selectedPackage.bocadoFacturaCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Bocados Salados Simples (Medialuna J/Q, Petit Pain, Sándwich de Miga)"
                            itemTypes={['bocadoSaladoSimple']}
                            maxTotalPerAttendee={selectedPackage.bocadoSaladoSimpleCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Bocados Especiales Salados (Wraps, Pizzetas, etc.)"
                            itemTypes={['bocadoEspecialSalado']}
                            maxTotalPerAttendee={selectedPackage.bocadoEspecialSaladoCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Empanadas"
                            itemTypes={['empanada']}
                            maxTotalPerAttendee={selectedPackage.empanadaCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Bocados Simples (Budines, Cuadraditos, Frutas, etc.)"
                            itemTypes={['bocadoSimple']}
                            maxTotalPerAttendee={selectedPackage.bocadoSimpleCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />
                        
                        <BocadoSelector
                            title="Bocados Especiales Dulces (Cookies, Alfajores, Shot Yogurt)"
                            itemTypes={['bocadoEspecialDulce']}
                            maxTotalPerAttendee={selectedPackage.bocadoEspecialDulceCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Shots Dulces (Lemon Pie, Chocotorta, Red Velvet)"
                            itemTypes={['shotDulce']}
                            maxTotalPerAttendee={selectedPackage.shotDulceCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />

                        <BocadoSelector
                            title="Bebida (Agua o Gaseosa)"
                            itemTypes={['bebidaSimple']}
                            maxTotalPerAttendee={selectedPackage.bebidaSimpleCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                        />
                         
                        {isMixtoSimple && (
                            <div className='bg-teal-50 p-3 rounded-xl border border-teal-300'>
                                <p className='text-sm font-semibold text-teal-800 mb-2'>
                                    Selección Mixta (Simples Dulces y Salados)
                                    <span className={`text-xs ml-2 ${remainingMixtoSimple === 0 ? 'text-red-500 font-bold' : 'text-teal-600'}`}>
                                        ({totalSelectedMixtoSimple} de {totalMaxMixtoSimple} unidades seleccionadas)
                                    </span>
                                </p>
                                <p className='text-xs text-teal-700 mb-3'>
                                    Tienes un total de <strong>{selectedPackage.bocadoSimpleTotalCount}</strong> unidades por asistente para dividir libremente entre las opciones Dulces y Saladas Simples.
                                </p>
                                <BocadoSelector
                                    title="Simples (Dulces)"
                                    itemTypes={['bocadoSimple']}
                                    otherItemTypes={['bocadoSaladoSimple']}
                                    sharedMaxTotalPerAttendee={selectedPackage.bocadoSimpleTotalCount || 0}
                                    formData={formData}
                                    setFormData={setFormData}
                                    attendees={formData.attendees}
                                />
                                <div className="mt-2"></div>
                                <BocadoSelector
                                    title="Simples (Salados)"
                                    itemTypes={['bocadoSaladoSimple']}
                                    otherItemTypes={['bocadoSimple']}
                                    sharedMaxTotalPerAttendee={selectedPackage.bocadoSimpleTotalCount || 0}
                                    formData={formData}
                                    setFormData={setFormData}
                                    attendees={formData.attendees}
                                />
                            </div>
                        )}

                         {isMixtoEspecial && (
                            <div className='bg-yellow-50 p-3 rounded-xl border border-yellow-300'>
                                <p className='text-sm font-semibold text-yellow-800 mb-2'>
                                    Selección Mixta (Especiales Dulces y Salados)
                                    <span className={`text-xs ml-2 ${remainingMixtoEspecial === 0 ? 'text-red-500 font-bold' : 'text-yellow-700'}`}>
                                        ({totalSelectedMixtoEspecial} de {totalMaxMixtoEspecial} unidades seleccionadas)
                                    </span>
                                </p>
                                <p className='text-xs text-yellow-700 mb-3'>
                                    Tienes un total de <strong>{selectedPackage.bocadoEspecialTotalCount}</strong> unidades por asistente para dividir libremente entre las opciones Dulces y Saladas Especiales.
                                </p>
                                <BocadoSelector
                                    title="Especiales (Dulces)"
                                    itemTypes={['bocadoEspecialDulce']}
                                    otherItemTypes={['bocadoEspecialSalado']}
                                    sharedMaxTotalPerAttendee={selectedPackage.bocadoEspecialTotalCount || 0}
                                    formData={formData}
                                    setFormData={setFormData}
                                    attendees={formData.attendees}
                                />
                                <div className="mt-2"></div>
                                <BocadoSelector
                                    title="Especiales (Salados)"
                                    itemTypes={['bocadoEspecialSalado']}
                                    otherItemTypes={['bocadoEspecialDulce']}
                                    sharedMaxTotalPerAttendee={selectedPackage.bocadoEspecialTotalCount || 0}
                                    formData={formData}
                                    setFormData={setFormData}
                                    attendees={formData.attendees}
                                />
                            </div>
                        )}
                    </div>

                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold text-indigo-700">3. Extras Adicionales (Con Costo Extra)</h3>
                <p className='text-sm text-gray-600'>Nota: El <strong>Personal de Apoyo</strong> solo permite seleccionar <strong>una</strong> opción.</p>
                <div className="space-y-3">
                  {addons.map((addon) => {
                    const isSupportStaff = addon.name.startsWith('Personal de Apoyo');
                    return (
                        <div key={addon.name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <p className="font-medium text-gray-700">{addon.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(addon.price)} / {isSupportStaff ? 'Servicio Único' : 'unidad'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                            type="button"
                            onClick={() => handleAddonChange(addon.name, -1)}
                            disabled={!formData.addonQuantities[addon.name] || formData.addonQuantities[addon.name] === 0}
                            className="p-1 bg-red-50 text-red-600 rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-50 transition hover:bg-red-100"
                            >
                            -
                            </button>
                            <span className="w-8 text-center font-bold text-gray-800">
                            {formData.addonQuantities[addon.name] || 0}
                            </span>
                            <button
                            type="button"
                            onClick={() => handleAddonChange(addon.name, 1)}
                            disabled={isSupportStaff && Object.keys(formData.addonQuantities).some(key => key.startsWith('Personal de Apoyo') && formData.addonQuantities[key] > 0 && key !== addon.name)}
                            className="p-1 bg-green-50 text-green-600 rounded-full w-8 h-8 flex items-center justify-center transition hover:bg-green-100 disabled:opacity-30"
                            >
                            +
                            </button>
                        </div>
                        </div>
                    );
                  })}
                </div>
              </div>

              <label className="block pt-4 border-t">
                <span className="text-gray-700 font-medium text-sm">4. Observaciones:</span>
                <textarea
                  name="observations"
                  value={formData.observations}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Ej: Necesitamos opciones sin gluten o el área de servicio es en el 3er piso."
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </label>

              <div className="pt-4 border-t">
                {message && (
                  <p className={`p-3 mb-4 rounded-xl text-sm font-bold ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || formData.attendees <= 0 || !user}
                  className="w-full py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 disabled:bg-indigo-300"
                >
                  {isSubmitting ? 'Enviando Pedido...' : `Enviar Pedido por ${formatCurrency(totalPrice)}`}
                </button>
              </div>
            </form>
          </div>
          
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-2xl sticky top-12 border-t-4 border-green-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Costos</h2>
              
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Paquete Seleccionado:</p>
                <p className="text-lg font-semibold text-indigo-600">{selectedPackage?.name}</p>
                <p className="text-xs text-gray-500 italic mt-1">
                    Precio por persona: <strong>{formatCurrency(selectedPackage?.basePrice)}</strong>
                </p>
              </div>
              
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-gray-600">Costo Base ({formData.attendees} pers.):</p>
                  <p className="text-sm font-medium text-gray-600">{formatCurrency((selectedPackage?.basePrice || 0) * formData.attendees)}</p>
                </div>
                
                {addons.filter(a => formData.addonQuantities[a.name] > 0).map(addon => (
                  <div key={addon.name} className="flex justify-between text-sm">
                    <p className="text-gray-600 italic">Extra {formData.addonQuantities[addon.name]}x {addon.name.split(':')[0]}:</p>
                    <p className="font-medium text-gray-700">{formatCurrency(formData.addonQuantities[addon.name] * addon.price)}</p>
                  </div>
                ))}

              </div>
              
              <div className="border-t mt-4 pt-4 flex justify-between items-center">
                <p className="text-xl font-extrabold text-gray-800">TOTAL ESTIMADO:</p>
                <p className="text-3xl font-extrabold text-green-600">{formatCurrency(totalPrice)}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2 italic text-right">*El precio final puede variar tras la confirmación.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-inner border border-gray-200">
                <OrderList orders={orders} userEmail={user.email} />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default App;