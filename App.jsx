import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Configuración de Firebase desde las variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// MENÚ DE BOCADOS ACTUALIZADO - OCTUBRE 2025

const menuItems = {
  facturas: [
    { type: 'bocadoFactura', name: 'Medialuna de Manteca', category: 'Facturas' },
    { type: 'bocadoFactura', name: 'Medialuna de Grasa', category: 'Facturas' },
    { type: 'bocadoFactura', name: 'Librito', category: 'Facturas' },
    { type: 'bocadoFactura', name: 'Churrinche', category: 'Facturas' },
    { type: 'bocadoFactura', name: 'Dona Bañada Chocolate 🆕', category: 'Facturas', isNew: true },
    { type: 'bocadoFactura', name: 'Dona Bañada Rosa 🆕', category: 'Facturas', isNew: true },
    { type: 'bocadoFactura', name: 'Sacramento 🆕', category: 'Facturas', isNew: true }
  ],
  
  bocadosSimples: [
    // Facturas básicas
    { type: 'bocadoSimple', name: 'Medialuna de Manteca', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Medialuna de Grasa', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Librito', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Churrinche', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Dona Bañada Chocolate 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Dona Bañada Rosa 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Sacramento 🆕', category: 'Bocados Simples', isNew: true },
    
    // Nuevos bocados dulces
    { type: 'bocadoSimple', name: 'Madeleine Bañada en Chocolate 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Rosquita de Frutilla/Arándano 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Cake de Manzana 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Mini Budín de Limón y Amapola con Glace 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Mini Budín de Choco con Naranja 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Mini Budín Choco Bañado en Choco 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Pepa de Membrillo 🆕', category: 'Bocados Simples', isNew: true },
    
    // Budines clásicos
    { type: 'bocadoSimple', name: 'Budín Marmolado', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Budín Banana y Nuez', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Budín Limón y Amapola', category: 'Bocados Simples' },
    
    // Cuadraditos
    { type: 'bocadoSimple', name: 'Cuadradito Brownie', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Cuadradito Pasta Frola', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Cuadradito Coco y Dulce de Leche', category: 'Bocados Simples' },
    
    // Cookies
    { type: 'bocadoSimple', name: 'Cookie Red Velvet', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Cookie Choco', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Cookie Chips Choco', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Cookie Vegana', category: 'Bocados Simples' },
    
    // Sin TACC
    { type: 'bocadoSimple', name: 'Cookie Chocolate (Sin TACC)', category: 'Bocados Simples', sinTacc: true },
    { type: 'bocadoSimple', name: 'Cookie de Vainilla (Sin TACC)', category: 'Bocados Simples', sinTacc: true },
    { type: 'bocadoSimple', name: 'Cuadradito de Pasta Frola (Sin TACC)', category: 'Bocados Simples', sinTacc: true },
    { type: 'bocadoSimple', name: 'Roll de Jamón y Queso (Sin TACC)', category: 'Bocados Simples', sinTacc: true },
    
    // Alfajores
    { type: 'bocadoSimple', name: 'Alfajorcito Sable', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Alfajorcito Choco', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Alfajorcito Maicena', category: 'Bocados Simples' },
    
    // Sandwiches y saludables
    { type: 'bocadoSimple', name: 'Sandwich de Miga Blanco', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Sandwich de Miga Negro', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Shot de Ensalada de Frutas', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Shot de Yogurt con Granola', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Pinchos de Frutas 🆕', category: 'Bocados Simples', isNew: true },
    { type: 'bocadoSimple', name: 'Fruta de Estación', category: 'Bocados Simples' },
    { type: 'bocadoSimple', name: 'Barrita de Cereal', category: 'Bocados Simples' }
  ],
  
  bocadosSaladosSimples: [
    { type: 'bocadoSaladoSimple', name: 'Medialuna con Jamón y Queso', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Chipacito de Queso', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Scon de Queso', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Blanco', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Sandwich de Miga Negro', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pains Jamón y Queso', category: 'Bocados Salados Simples' },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lomito y Queso Danbo 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Bondiola y Queso 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate y Queso 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Lechuga y Queso 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Queso y Aceituna 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕', category: 'Bocados Salados Simples', isNew: true },
    { type: 'bocadoSaladoSimple', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕', category: 'Bocados Salados Simples', isNew: true }
  ],
  
  bocadosEspeciales: [
    // Facturas y dulces
    { type: 'bocadoEspecial', name: 'Medialuna de Manteca', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Medialuna de Grasa', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Librito', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Churrinche', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Dona Bañada Chocolate 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Dona Bañada Rosa 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Sacramento 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Madeleine Bañada 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Rosquita Rellena de Frutilla/Arándano 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Cake de Manzana 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Mini Budín de Limón y Amapola con Glace 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Mini Budín de Choco con Naranja 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Mini Budín Choco Bañado en Choco 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Pepa de Membrillo 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Budín Marmolado', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Budín Banana y Nuez', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Budín Limón y Amapola', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cuadradito de Brownie', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cuadradito de Pasta Frola', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cuadradito de Coco y Dulce de Leche', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cookie de Chip de Chocolate', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cookie de Chocolate', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cookie Red Velvet', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Cookie Vegana', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Chipacito de Queso', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Scon de Queso', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Sandwich de Miga Blanco', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Sandwich de Miga Negro', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Alfajorcito de Maicena', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Alfajorcito Sablé', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Alfajorcito de Chocolate', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Shot de Ensalada de Frutas', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Shot de Yogurt con Granola', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Pinchos de Frutas 🆕', category: 'Bocados Especiales', isNew: true },
    { type: 'bocadoEspecial', name: 'Fruta de Estación', category: 'Bocados Especiales' },
    { type: 'bocadoEspecial', name: 'Barrita de Cereal', category: 'Bocados Especiales' }
  ],
  
  bocadosSaladosEspeciales: [
    { type: 'bocadoSaladoEspecial', name: 'Mini Wrap de Jamón y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Mini Wrap de Pollo', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Mini Wrap de Carne', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Mini Wrap Vegetariano', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Empanada de Carne', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Empanada de Pollo', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Empanada de Jamón y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Empanada de Verdura', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Triángulos de Queso con Semillas de Sésamo 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Pizzeta Tomate y Mozzarella (Sin TACC)', category: 'Bocados Salados Especiales', sinTacc: true },
    { type: 'bocadoSaladoEspecial', name: 'Medialuna de Jamón y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pains de Jamón y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Lomito y Queso Danbo', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Bondiola y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Tomate y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Lechuga y Queso', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Queso y Aceituna', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Petit Pain Tomate Cherry, Mozzarella y Albahaca', category: 'Bocados Salados Especiales' },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Jamón Crudo y Queso 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Queso y Aceituna 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Huevo y Queso 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Jamón y Lechuga 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Roll de Jamón y Queso (Sin TACC) 🆕', category: 'Bocados Salados Especiales', sinTacc: true, isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Chipa de Jamón y Queso (Sin TACC) 🆕', category: 'Bocados Salados Especiales', sinTacc: true, isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Jamón y Tomate 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Queso y Tomate 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Queso y Roquefort 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sandwich de Miga Queso y Lechuga 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Sacramento de Jamón y Queso 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Pinchos de Tomate Cherry + Jamón + Queso + Aceituna 🆕', category: 'Bocados Salados Especiales', isNew: true },
    { type: 'bocadoSaladoEspecial', name: 'Pinchos de Tomate Cherry + Mozzarella + Albahaca 🆕', category: 'Bocados Salados Especiales', isNew: true }
  ],
  
  shotsDulces: [
    { type: 'shotDulce', name: 'Shot Dulce - Lemon Pie 🆕', category: 'Bienvenida Full', isNew: true },
    { type: 'shotDulce', name: 'Shot Dulce - Chocotorta 🆕', category: 'Bienvenida Full', isNew: true },
    { type: 'shotDulce', name: 'Shot Dulce - Red Velvet 🆕', category: 'Bienvenida Full', isNew: true }
  ]
};

// PAQUETES/COMBOS ACTUALIZADOS - OCTUBRE 2025
const packages = [
  {
    id: 'C1',
    name: '1. Coffee Break',
    description: 'Café de filtro o Nespresso, leche, agua caliente, infusiones, agua mineral, jugo de naranja, vajilla y mantelería',
    basePrice: 2200,
    nespressoPrice: 3400,
    hasNespressoOption: true,
    bocadosQuantity: 0,
    bocadosType: null,
    showBocadosSelector: false
  },
  {
    id: 'C2',
    name: '2. Coffee Break + 2 Facturas',
    description: 'Coffee Break completo + selección de 2 facturas por persona',
    basePrice: 3800,
    nespressoPrice: 5600,
    hasNespressoOption: true,
    bocadosQuantity: 2,
    bocadosType: 'facturas',
    showBocadosSelector: true
  },
  {
    id: 'C3',
    name: '3. Coffee Break + 2 Bocados Simples',
    description: 'Coffee Break completo + selección de 2 bocados simples por persona',
    basePrice: 5200,
    nespressoPrice: 6550,
    hasNespressoOption: true,
    bocadosQuantity: 2,
    bocadosType: 'bocadosSimples',
    showBocadosSelector: true
  },
  {
    id: 'C4',
    name: '4. Coffee Break + 2 Bocados Especiales',
    description: 'Coffee Break completo + selección de 2 bocados especiales por persona',
    basePrice: 5800,
    nespressoPrice: 7550,
    hasNespressoOption: true,
    bocadosQuantity: 2,
    bocadosType: 'bocadosEspeciales',
    showBocadosSelector: true
  },
  {
    id: 'C5',
    name: '5. Coffee Break + 2 Bocados Salados Especiales',
    description: 'Coffee Break completo + selección de 2 bocados salados especiales por persona',
    basePrice: 6600,
    nespressoPrice: 8400,
    hasNespressoOption: true,
    bocadosQuantity: 2,
    bocadosType: 'bocadosSaladosEspeciales',
    showBocadosSelector: true
  },
  {
    id: 'C6',
    name: '6. Coffee Break con Nespresso + 4 Bocados Especiales',
    description: 'Coffee Break con Nespresso + selección de 4 bocados especiales por persona',
    basePrice: 8400,
    nespressoPrice: null,
    hasNespressoOption: false,
    forceNespresso: true,
    bocadosQuantity: 4,
    bocadosType: 'bocadosEspeciales',
    showBocadosSelector: true
  },
  {
    id: 'C7',
    name: '7. Coffee Break Nespresso + 2 Empanadas + 2 Bocados Simples',
    description: 'Coffee Break con Nespresso + 2 empanadas + 2 bocados simples por persona',
    basePrice: 9600,
    nespressoPrice: null,
    hasNespressoOption: false,
    forceNespresso: true,
    bocadosQuantity: 2,
    bocadosType: 'bocadosSimples',
    showBocadosSelector: true,
    includesEmpanadas: true,
    empanadasQuantity: 2
  },
  {
    id: 'C8',
    name: '8. Bienvenida Simple',
    description: '3 bocados salados simples + 1 bocado dulce simple + agua mineral o gaseosa',
    basePrice: 8750,
    nespressoPrice: null,
    hasNespressoOption: false,
    bocadosQuantity: 3,
    bocadosType: 'bocadosSaladosSimples',
    showBocadosSelector: true,
    extraBocadosQuantity: 1,
    extraBocadosType: 'bocadosSimples'
  },
  {
    id: 'C9',
    name: '9. Bienvenida Full',
    description: 'Coffee Break + 5 bocados salados especiales + 2 bocados dulces especiales + 1 shot dulce + bebida',
    basePrice: 18500,
    nespressoPrice: 20600,
    hasNespressoOption: true,
    bocadosQuantity: 5,
    bocadosType: 'bocadosSaladosEspeciales',
    showBocadosSelector: true,
    extraBocadosQuantity: 2,
    extraBocadosType: 'bocadosEspeciales',
    includesShotDulce: true,
    shotDulceQuantity: 1
  }
];

// ADICIONALES OPCIONALES
const addons = [
  { name: 'Yogurt Bebible Frutilla/Vainilla (Jarra x Litro)', price: 5500, unit: 'litro' },
  { name: 'Agua Mineral Grande 1.5lts', price: 2100, unit: 'unidad' },
  { name: 'Agua Mineral Chica', price: 1500, unit: 'unidad' },
  { name: 'Gaseosa Grande', price: 4500, unit: 'unidad' },
  { name: 'Jugo Cepita x Litro', price: 2500, unit: 'litro' },
  { name: 'Bocaditos Salados', price: 2200, unit: 'unidad' },
  { name: 'Bocaditos Dulces', price: 650, unit: 'unidad' },
  { name: 'Frutas', price: 1300, unit: 'unidad' }
];

// PERSONAL DE APOYO
const personalOptions = [
  { name: 'Sin personal de apoyo', price: 0, hours: 0 },
  { name: 'Jornada 3 horas', price: 21000, hours: 3 },
  { name: 'Jornada 6 horas', price: 23000, hours: 6 },
  { name: 'Jornada 9 horas', price: 27000, hours: 9 }
];

function CoffeeBreakUdesa() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [useNespresso, setUseNespresso] = useState(false);
  const [attendees, setAttendees] = useState(20);
  const [selectedBocados, setSelectedBocados] = useState({});
  const [selectedExtraBocados, setSelectedExtraBocados] = useState({});
  const [selectedShotDulce, setSelectedShotDulce] = useState('');
  const [selectedAddons, setSelectedAddons] = useState({});
  const [selectedPersonal, setSelectedPersonal] = useState(personalOptions[0]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    eventDate: '',
    eventTime: '',
    observations: ''
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Autenticación anónima con Firebase
  useEffect(() => {
    signInAnonymously(auth)
      .then((userCredential) => {
        setUser(userCredential.user);
      })
      .catch((error) => {
        console.error('Error de autenticación:', error);
      });
  }, []);

  // Calcular precio total
  const calculateTotalPrice = () => {
    if (!selectedPackage) return 0;

    const pkg = packages.find(p => p.id === selectedPackage);
    let basePrice = useNespresso && pkg.nespressoPrice ? pkg.nespressoPrice : pkg.basePrice;
    let total = basePrice * attendees;

    // Agregar adicionales
    Object.entries(selectedAddons).forEach(([addonName, quantity]) => {
      const addon = addons.find(a => a.name === addonName);
      if (addon) {
        total += addon.price * quantity;
      }
    });

    // Agregar personal
    total += selectedPersonal.price;

    return total;
  };

  // Validar selección de bocados
  const validateBocadosSelection = () => {
    if (!selectedPackage) return true;

    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg.showBocadosSelector) return true;

    const totalSelected = Object.values(selectedBocados).reduce((sum, qty) => sum + qty, 0);
    const requiredTotal = pkg.bocadosQuantity * attendees;

    let extraValid = true;
    if (pkg.extraBocadosQuantity) {
      const totalExtra = Object.values(selectedExtraBocados).reduce((sum, qty) => sum + qty, 0);
      const requiredExtra = pkg.extraBocadosQuantity * attendees;
      extraValid = totalExtra === requiredExtra;
    }

    let shotValid = true;
    if (pkg.includesShotDulce) {
      shotValid = selectedShotDulce !== '';
    }

    return totalSelected === requiredTotal && extraValid && shotValid;
  };

  // Manejar selección de bocados
  const handleBocadoChange = (bocadoName, quantity, isExtra = false) => {
    const targetState = isExtra ? selectedExtraBocados : selectedBocados;
    const setTargetState = isExtra ? setSelectedExtraBocados : setSelectedBocados;

    setTargetState({
      ...targetState,
      [bocadoName]: Math.max(0, parseInt(quantity) || 0)
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateBocadosSelection()) {
      alert('Por favor, selecciona la cantidad correcta de bocados según el paquete elegido.');
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      const pkg = packages.find(p => p.id === selectedPackage);
      const orderData = {
        name: formData.name,
        email: formData.email,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        attendees,
        packageName: pkg.name,
        packagePricePerAttendee: useNespresso && pkg.nespressoPrice ? pkg.nespressoPrice : pkg.basePrice,
        useNespresso,
        selectedBocados,
        selectedExtraBocados: pkg.extraBocadosQuantity ? selectedExtraBocados : null,
        selectedShotDulce: pkg.includesShotDulce ? selectedShotDulce : null,
        addons: Object.entries(selectedAddons)
          .filter(([_, qty]) => qty > 0)
          .map(([name, quantity]) => ({
            name,
            price: addons.find(a => a.name === name).price,
            quantity
          })),
        personal: selectedPersonal.name !== 'Sin personal de apoyo' ? {
          name: selectedPersonal.name,
          price: selectedPersonal.price,
          hours: selectedPersonal.hours
        } : null,
        totalPrice: calculateTotalPrice(),
        observations: formData.observations,
        status: 'Pendiente',
        userId: user?.uid,
        timestamp: new Date().toISOString()
      };

      // Guardar en Firebase
      const appId = import.meta.env.VITE_APP_ID || 'coffee-break-udesa';
      const docRef = await addDoc(
        collection(db, 'artifacts', appId, 'users', user.uid, 'orders'),
        orderData
      );

      // Enviar a webhook de n8n si está configurado
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...orderData,
            orderId: docRef.id
          })
        });
      }

      setSubmitStatus('success');
      alert('¡Pedido enviado exitosamente! Te contactaremos pronto.');

      // Resetear formulario
      setFormData({
        name: '',
        email: '',
        eventDate: '',
        eventTime: '',
        observations: ''
      });
      setSelectedPackage(null);
      setSelectedBocados({});
      setSelectedExtraBocados({});
      setSelectedShotDulce('');
      setSelectedAddons({});
      setSelectedPersonal(personalOptions[0]);

    } catch (error) {
      console.error('Error al enviar pedido:', error);
      setSubmitStatus('error');
      alert('Hubo un error al enviar el pedido. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Coffee Break UDESA
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              DAF Negocios y Desarrollos SRL
            </p>
            <p className="text-sm text-gray-500">
              www.somosdaf.com | Salta 683, 3F CABA
            </p>
            <div className="mt-4 inline-block bg-amber-100 text-amber-800 px-6 py-2 rounded-full text-sm font-semibold">
              Precios actualizados - Octubre 2025
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del evento */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
              <span className="mr-3">📋</span>
              Datos del Evento
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
                  placeholder="email@udesa.edu.ar"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha del Evento *
                </label>
                <input
                  type="date"
                  required
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Horario del Evento *
                </label>
                <input
                  type="time"
                  required
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cantidad de Asistentes *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={attendees}
                  onChange={(e) => setAttendees(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          {/* Selección de Paquete */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
              <span className="mr-3">☕</span>
              Selecciona tu Paquete
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackage(pkg.id);
                    setUseNespresso(pkg.forceNespresso || false);
                    setSelectedBocados({});
                    setSelectedExtraBocados({});
                    setSelectedShotDulce('');
                  }}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPackage === pkg.id
                      ? 'border-amber-500 bg-amber-50 shadow-lg'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 min-h-[60px]">
                    {pkg.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-amber-600">
                      ${pkg.basePrice.toLocaleString('es-AR')}
                    </p>
                    {pkg.nespressoPrice && (
                      <p className="text-sm text-gray-500">
                        Con Nespresso: ${pkg.nespressoPrice.toLocaleString('es-AR')}
                      </p>
                    )}
                    {pkg.forceNespresso && (
                      <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                        Con Nespresso
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Opción Nespresso */}
            {selectedPkg && selectedPkg.hasNespressoOption && !selectedPkg.forceNespresso && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useNespresso}
                    onChange={(e) => setUseNespresso(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="ml-3 text-gray-900 font-semibold">
                    Agregar Nespresso (+${(selectedPkg.nespressoPrice - selectedPkg.basePrice).toLocaleString('es-AR')} por persona)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Selección de Bocados */}
          {selectedPkg && selectedPkg.showBocadosSelector && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
                <span className="mr-3">🥐</span>
                Selecciona tus Bocados
              </h2>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-blue-900 font-semibold">
                  Debes seleccionar {selectedPkg.bocadosQuantity} bocados por persona
                  ({selectedPkg.bocadosQuantity * attendees} bocados en total)
                </p>
                {selectedPkg.extraBocadosQuantity && (
                  <p className="text-blue-900 font-semibold mt-2">
                    Además: {selectedPkg.extraBocadosQuantity} bocados adicionales por persona
                    ({selectedPkg.extraBocadosQuantity * attendees} bocados adicionales en total)
                  </p>
                )}
              </div>

              {/* Bocados principales */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems[selectedPkg.bocadosType]?.map((bocado) => (
                  <div key={bocado.name} className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-300 transition">
                    <label className="block">
                      <span className="font-semibold text-gray-900 text-sm mb-2 block">
                        {bocado.name}
                        {bocado.sinTacc && (
                          <span className="ml-2 inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                            Sin TACC
                          </span>
                        )}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={selectedBocados[bocado.name] || 0}
                        onChange={(e) => handleBocadoChange(bocado.name, e.target.value, false)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {/* Bocados extra */}
              {selectedPkg.extraBocadosQuantity && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-amber-800 mb-4">
                    Bocados Adicionales ({selectedPkg.extraBocadosType})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems[selectedPkg.extraBocadosType]?.map((bocado) => (
                      <div key={bocado.name} className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-300 transition">
                        <label className="block">
                          <span className="font-semibold text-gray-900 text-sm mb-2 block">
                            {bocado.name}
                            {bocado.sinTacc && (
                              <span className="ml-2 inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                Sin TACC
                              </span>
                            )}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={selectedExtraBocados[bocado.name] || 0}
                            onChange={(e) => handleBocadoChange(bocado.name, e.target.value, true)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                            placeholder="0"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shot Dulce */}
              {selectedPkg.includesShotDulce && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-amber-800 mb-4">
                    Selecciona tu Shot Dulce
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {menuItems.shotsDulces.map((shot) => (
                      <div
                        key={shot.name}
                        onClick={() => setSelectedShotDulce(shot.name)}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                          selectedShotDulce === shot.name
                            ? 'border-pink-500 bg-pink-50 shadow-lg'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <span className="font-semibold text-gray-900">
                          {shot.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empanadas (para C7) */}
              {selectedPkg.includesEmpanadas && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <p className="text-yellow-900 font-semibold">
                    ✓ Este paquete incluye {selectedPkg.empanadasQuantity} empanadas por persona 
                    (selección a cargo de DAF)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Adicionales */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
              <span className="mr-3">🥤</span>
              Adicionales Opcionales
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map((addon) => (
                <div key={addon.name} className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-300 transition">
                  <label className="block">
                    <span className="font-semibold text-gray-900 text-sm mb-2 block">
                      {addon.name}
                    </span>
                    <p className="text-amber-600 font-bold text-lg mb-2">
                      ${addon.price.toLocaleString('es-AR')} / {addon.unit}
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={selectedAddons[addon.name] || 0}
                      onChange={(e) => setSelectedAddons({
                        ...selectedAddons,
                        [addon.name]: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="0"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Personal de Apoyo */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
              <span className="mr-3">👥</span>
              Personal de Apoyo
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {personalOptions.map((option) => (
                <div
                  key={option.name}
                  onClick={() => setSelectedPersonal(option)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPersonal.name === option.name
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <h3 className="font-bold text-gray-900 mb-2">
                    {option.name}
                  </h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {option.price > 0 ? `$${option.price.toLocaleString('es-AR')}` : 'Gratis'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
              <span className="mr-3">📝</span>
              Observaciones
            </h2>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none transition"
              rows="4"
              placeholder="Necesidades especiales, opciones sin gluten, veganas, etc."
            />
          </div>

          {/* Resumen y Total */}
          {selectedPackage && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <span className="mr-3">💰</span>
                Resumen del Pedido
              </h2>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between">
                  <span>Paquete:</span>
                  <span className="font-bold">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Asistentes:</span>
                  <span className="font-bold">{attendees} personas</span>
                </div>
                {useNespresso && (
                  <div className="flex justify-between">
                    <span>Con Nespresso:</span>
                    <span className="font-bold">✓ Sí</span>
                  </div>
                )}
                <div className="border-t-2 border-white/30 pt-4 mt-4">
                  <div className="flex justify-between text-3xl font-bold">
                    <span>TOTAL:</span>
                    <span>${calculateTotalPrice().toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-sm mt-2 opacity-90">
                    IVA incluido - Precios finales
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !validateBocadosSelection()}
                className={`w-full mt-8 py-4 px-6 rounded-xl font-bold text-xl transition-all transform hover:scale-105 ${
                  loading || !validateBocadosSelection()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-white text-amber-600 hover:bg-amber-50 shadow-lg'
                }`}
              >
                {loading ? 'Enviando...' : 'Enviar Pedido'}
              </button>
            </div>
          )}
        </form>

        {/* Información adicional */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-amber-900 mb-4">
            Condiciones Comerciales
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Los precios son finales, IVA incluido</li>
            <li>✓ Para todas las opciones se contempla alimentos para veganos y celíacos</li>
            <li>✓ Los servicios incluyen traslado, personal, todos los insumos, vajilla y/o vasos térmicos y mantelería</li>
            <li>✓ UDESA provee mesas para cada servicio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CoffeeBreakUdesa;
