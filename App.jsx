import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, addDoc, onSnapshot, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db as firestore, appId } from './firebase.js';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import { MENU_ITEMS, resolvePrices } from './catalog.js';

// --- CONFIGURACIÓN DE DATA ---

const CONFIRMATION_API_URL = '/api/send-confirmation';

// Función para obtener la fecha mínima (48 horas desde hoy)
const getMinDate = () => {
  const today = new Date();
  const minDate = new Date(today.getTime() + 48 * 60 * 60 * 1000);
  return minDate.toISOString().split('T')[0];
};

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
  <div className="flex flex-col items-center justify-center gap-3 p-6">
    <div className="h-6 w-6 animate-spin border-2 border-neutral-300 border-t-neutral-900" />
    <span className="ct-label">Cargando</span>
  </div>
);

// Encabezado de paso del formulario, numerado como un tablero
const Step = ({ n, title, hint }) => (
  <div className="flex items-baseline gap-3 border-b border-neutral-900 pb-2">
    <span className="ct-readout text-xs font-semibold text-neutral-400">{n}</span>
    <h3 className="ct-title text-neutral-900">{title}</h3>
    {hint && <span className="ml-auto text-xs text-neutral-500">{hint}</span>}
  </div>
);

const OrderList = ({ orders, userEmail }) => (
  <div className="ct-panel">
    <div className="ct-bar">
      <span className="ct-title">Mis pedidos</span>
      <span className="ct-readout text-sm text-neutral-400">{orders.length}</span>
    </div>

    {!orders.length ? (
      <p className="px-4 py-10 text-center text-sm text-neutral-500">
        Todavía no hiciste pedidos.
      </p>
    ) : (
      <ul className="divide-y divide-neutral-200">
        {orders.map((order) => (
          <li key={order.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-snug text-neutral-900">{order.packageName}</p>
              <p className="ct-readout shrink-0 text-lg font-semibold">
                {formatCurrency(order.totalPrice)}
              </p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="ct-label">Fecha</dt>
              <dd className="ct-readout text-neutral-700">{order.eventDate} · {order.eventTime}</dd>

              <dt className="ct-label">Pers.</dt>
              <dd className="ct-readout text-neutral-700">{order.attendees}</dd>

              {order.eventLocation && order.eventLocation !== 'N/A' && (
                <>
                  <dt className="ct-label">Lugar</dt>
                  <dd className="text-neutral-700">{order.eventLocation}</dd>
                </>
              )}

              <dt className="ct-label">Usuario</dt>
              <dd className="truncate text-neutral-500">{userEmail}</dd>
            </dl>

            {order.selectedBocados && Object.values(order.selectedBocados).some((q) => q > 0) && (
              <div className="border-t border-neutral-200 pt-3">
                <p className="ct-label">Bocados</p>
                <ul className="mt-1.5 space-y-0.5">
                  {Object.entries(order.selectedBocados).map(([name, quantity]) => (
                    quantity > 0 && (
                      <li key={name} className="flex gap-2 text-xs text-neutral-600">
                        <span className="ct-readout text-neutral-400">{String(quantity).padStart(2, '0')}</span>
                        <span>{name}</span>
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}

            {order.addons && order.addons.length > 0 && (
              <div className="border-t border-neutral-200 pt-3">
                <p className="ct-label">Extras</p>
                <ul className="mt-1.5 space-y-0.5">
                  {order.addons.map((addon, index) => (
                    <li key={index} className="flex justify-between gap-2 text-xs text-neutral-600">
                      <span>
                        <span className="ct-readout text-neutral-400">{String(addon.quantity).padStart(2, '0')}</span>
                        {' '}{addon.name}
                      </span>
                      <span className="ct-readout shrink-0">{formatCurrency(addon.quantity * addon.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {order.observations && (
              <p className="border-t border-neutral-200 pt-3 text-xs text-neutral-500">
                <span className="ct-label">Obs</span>{' '}
                {order.observations}
              </p>
            )}

            <p className="ct-readout text-right text-[10px] text-neutral-400">
              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('es-AR') : '—'}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// Componente para seleccionar bocados dentro de un combo
const BocadoSelector = ({
    title,
    itemTypes,
    maxTotalPerAttendee,
    formData,
    setFormData,
    attendees,
    otherItemTypes = [],
    sharedMaxTotalPerAttendee = 0,
    menuItems = []
}) => {

    const maxToUse = sharedMaxTotalPerAttendee > 0 ? sharedMaxTotalPerAttendee : maxTotalPerAttendee;

    const availableItems = useMemo(() => {
        if (!itemTypes) return [];
        return menuItems.filter(item => itemTypes.includes(item.type));
    }, [itemTypes, menuItems]);

    const otherAvailableItems = useMemo(() => {
        if (!otherItemTypes) return [];
        return menuItems.filter(item => otherItemTypes.includes(item.type));
    }, [otherItemTypes, menuItems]);
    
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

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="ct-panel">
            <div className="ct-bar-sub flex-wrap">
                <span className="ct-title text-neutral-900">{title}</span>
                {/* Contador tipo instrumento: seleccionadas / tope */}
                <span
                    className={`ct-readout px-2 py-0.5 text-xs font-semibold ${
                        remaining === 0
                            ? 'bg-neutral-950 text-white'
                            : 'border border-neutral-300 text-neutral-600'
                    }`}
                >
                    {pad(currentTotalSelected)} / {pad(totalMax)}
                </span>
            </div>

            <p className="border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500">
                {sharedMaxTotalPerAttendee > 0
                    ? `Límite compartido con otra categoría: ${totalMax} unidades en total (${maxToUse} por asistente).`
                    : `Hasta ${totalMax} unidades en total (${maxToUse} por asistente).`}
            </p>

            <ul className="divide-y divide-neutral-100">
                {availableItems.map((item) => {
                    const quantity = formData.selectedBocados[item.name] || 0;
                    return (
                        <li
                            key={item.name}
                            className={`flex items-center justify-between gap-3 px-4 py-2 transition ${
                                quantity > 0 ? 'bg-neutral-50' : ''
                            }`}
                        >
                            <p className="flex-1 text-sm text-neutral-700">{item.name}</p>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleBocadoChange(item.name, -1)}
                                    disabled={quantity <= 0}
                                    className="ct-step h-7 w-7 text-sm"
                                    aria-label={`Quitar ${item.name}`}
                                >
                                    −
                                </button>
                                <span
                                    className={`ct-readout w-7 text-center text-sm ${
                                        quantity > 0 ? 'font-semibold text-neutral-900' : 'text-neutral-400'
                                    }`}
                                >
                                    {pad(quantity)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleBocadoChange(item.name, 1)}
                                    disabled={remaining <= 0}
                                    className="ct-step h-7 w-7 text-sm"
                                    aria-label={`Agregar ${item.name}`}
                                >
                                    +
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
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

  // La carta de bocados es fija (viene del catálogo), solo los precios son dinámicos
  const menuItems = MENU_ITEMS;
  const [packages, setPackages] = useState(() => resolvePrices(null).packages);
  const [addons, setAddons] = useState(() => resolvePrices(null).addons);
  const [pricesLoaded, setPricesLoaded] = useState(false);

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
        eventLocation: '',
        attendees: 20,
        selectedPackageId: packages[0]?.id || 'C1',
        addonQuantities: addons.reduce((acc, addon) => ({ ...acc, [addon.name]: 0 }), {}),
        selectedBocados: initialBocados,
        observations: '',
    };
  });

  // --- HOOKS DE FIREBASE ---

  // Cargar precios desde Firebase al iniciar
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const pricesDocRef = doc(firestore, 'prices', appId);
        const pricesSnap = await getDoc(pricesDocRef);

        // La estructura sale siempre del catálogo; Firebase solo aporta precios.
        const { packages, addons } = resolvePrices(
          pricesSnap.exists() ? pricesSnap.data() : null
        );
        setPackages(packages);
        setAddons(addons);

        const sinPrecio = [...packages, ...addons].filter(i => i.fromSeed).length;
        if (sinPrecio > 0) {
          console.warn(`⚠️ ${sinPrecio} ítems sin precio en Firebase, usando valor inicial del catálogo`);
        }
      } catch (error) {
        console.error('Error cargando precios desde Firebase:', error);
        console.log('ℹ️ Usando precios iniciales del catálogo debido a error');
      } finally {
        setPricesLoaded(true);
      }
    };

    loadPrices();
  }, []);

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

  // Actualizar formData cuando se carguen los precios por primera vez
  useEffect(() => {
    if (pricesLoaded) {
      setFormData(prev => ({
        ...prev,
        selectedPackageId: packages[0]?.id || 'C1',
        addonQuantities: addons.reduce((acc, addon) => ({ ...acc, [addon.name]: 0 }), {}),
        selectedBocados: menuItems.reduce((acc, item) => ({ ...acc, [item.name]: 0 }), {}),
      }));
    }
  }, [pricesLoaded]);

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
      
      // Calcular total de bocados requeridos sumando todos los counts del paquete
      const totalBocadosRequired = Object.keys(selectedPackage)
          .filter(key => key.includes('Count'))
          .reduce((sum, key) => sum + (selectedPackage[key] || 0), 0) * formData.attendees;

      // Calcular total de bocados seleccionados
      const allItemTypes = ['bocadoFactura', 'bocadoSimple', 'bocadoSaladoSimple', 'bocadoEspecialDulce', 'bocadoEspecialSalado', 'empanada', 'shotDulce', 'bebidaSimple'];
      const totalBocadosSelected = getTotalSelectedForMixto(allItemTypes);


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
        eventLocation: formData.eventLocation || 'N/A',
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

      try {
          const confirmationResponse = await fetch(CONFIRMATION_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderData)
          });

          if (!confirmationResponse.ok) {
              console.error('Error enviando confirmación:', confirmationResponse.statusText);
          } else {
              console.log('Confirmación enviada con éxito.');
          }
      } catch (confirmationError) {
          console.error('Fallo al enviar confirmación:', confirmationError);
      }

      setFormData(prev => ({
        ...prev,
        eventDate: minDateString,
        eventLocation: '',
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
      <div className="ct-shell flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Detectar si estamos en la ruta /admin ANTES de verificar autenticación
  const isAdminRoute = window.location.pathname === '/admin';

  // Si estamos en la ruta /admin, mostrar el panel de administración
  if (isAdminRoute) {
    return <AdminPanel />;
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

  // El paso de bocados solo existe para algunos paquetes: numeramos corrido
  // para que no queden huecos en la secuencia.
  const stepExtras = needsBocadoSelection ? '05' : '04';
  const stepObservaciones = needsBocadoSelection ? '06' : '05';

  return (
    <div className="ct-shell p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-4">

        <header className="ct-panel">
          <div className="ct-bar">
            <span className="ct-title">Coffee Break · Pedidos</span>
            <button onClick={handleLogout} className="ct-btn-inv !px-3 !py-1.5">
              Salir
            </button>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Armá tu pedido
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Elegí el paquete, los bocados y los extras. El total se actualiza a medida que cargás.
              </p>
            </div>
            <div className="text-right">
              <p className="ct-label">Usuario</p>
              <p className="mt-0.5 text-sm text-neutral-700">{user.email}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <div className="space-y-4 lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="ct-panel space-y-5 p-4 sm:p-6">
                <Step n="01" title="Datos del evento" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="ct-label">Fecha</span>
                    <input
                      type="date"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleInputChange}
                      required
                      min={minDateString}
                      className="ct-input-num mt-2"
                    />
                  </label>
                  <label className="block">
                    <span className="ct-label">Hora</span>
                    <input
                      type="time"
                      name="eventTime"
                      value={formData.eventTime}
                      onChange={handleInputChange}
                      required
                      className="ct-input-num mt-2"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="ct-label">Lugar</span>
                    <input
                      type="text"
                      name="eventLocation"
                      value={formData.eventLocation}
                      onChange={handleInputChange}
                      placeholder="Ej: Sala de conferencias A, Piso 3"
                      className="ct-input mt-2"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="ct-label">Cantidad de asistentes</span>
                    <input
                      type="number"
                      name="attendees"
                      value={formData.attendees}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="ct-input-num mt-2"
                    />
                  </label>
                </div>

                <Step n="02" title="Contacto" />

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="ct-label">Email · obligatorio</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="ejemplo@udesa.edu.ar"
                      className="ct-input mt-2"
                    />
                  </label>
                  <label className="block">
                    <span className="ct-label">Nombre · opcional</span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej: Juan Pérez"
                      className="ct-input mt-2"
                    />
                  </label>
                </div>
              </div>

              <div className="ct-panel space-y-5 p-4 sm:p-6">
                <Step n="03" title="Paquete de servicio" hint="Precio por persona" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {packages.map((pkg) => {
                    const isOn = formData.selectedPackageId === pkg.id;
                    return (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setFormData(prev => ({ ...prev, selectedPackageId: pkg.id }))}
                        aria-pressed={isOn}
                        className={`ct-card flex flex-col ${isOn ? 'ct-card-on' : ''}`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-snug">{pkg.name}</span>
                          {pkg.isNespresso && (
                            <span className={`ct-chip shrink-0 ${isOn ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              Nespresso
                            </span>
                          )}
                        </span>
                        <span className={`mt-1 text-xs ${isOn ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {pkg.description}
                        </span>
                        <span className="ct-readout mt-3 text-lg font-semibold">
                          {formatCurrency(pkg.basePrice)}
                          <span className={`ml-1 text-xs font-normal ${isOn ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            /pers.
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {needsBocadoSelection && (
                <div className="ct-panel space-y-5 p-4 sm:p-6">
                    <Step n="04" title="Selección de bocados" hint={`${formData.attendees} asistentes`} />
                    <p className="text-sm text-neutral-500">
                      Elegí la variedad incluida en tu paquete. El tope se calcula por unidades
                      por asistente y ya está contemplado en el precio: los bocados no se cobran aparte.
                    </p>

                    <div className="space-y-3">

                        <BocadoSelector
                            title="Facturas (Medialunas, Libritos, etc.)"
                            itemTypes={['bocadoFactura']}
                            maxTotalPerAttendee={selectedPackage.bocadoFacturaCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Empanadas"
                            itemTypes={['empanada']}
                            maxTotalPerAttendee={selectedPackage.empanadaCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Bocados Simples Dulces (Budines, Cuadraditos, Frutas, etc.)"
                            itemTypes={['bocadoSimple']}
                            maxTotalPerAttendee={selectedPackage.bocadoSimpleCount || 0}
                            otherItemTypes={['bocadoSaladoSimple']}
                            sharedMaxTotalPerAttendee={selectedPackage.bocadoSimpleTotalCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Bocados Especiales Dulces (Cookies, Alfajores, Shot Yogurt)"
                            itemTypes={['bocadoEspecialDulce']}
                            maxTotalPerAttendee={selectedPackage.bocadoEspecialDulceCount || 0}
                            otherItemTypes={['bocadoEspecialSalado']}
                            sharedMaxTotalPerAttendee={selectedPackage.bocadoEspecialTotalCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Shots Dulces (Lemon Pie, Chocotorta, Red Velvet)"
                            itemTypes={['shotDulce']}
                            maxTotalPerAttendee={selectedPackage.shotDulceCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Bocados Salados Simples (Medialuna J/Q, Petit Pain, Sándwich de Miga)"
                            itemTypes={['bocadoSaladoSimple']}
                            maxTotalPerAttendee={selectedPackage.bocadoSaladoSimpleCount || 0}
                            otherItemTypes={['bocadoSimple']}
                            sharedMaxTotalPerAttendee={selectedPackage.bocadoSimpleTotalCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Bocados Especiales Salados (Wraps, Pizzetas, etc.)"
                            itemTypes={['bocadoEspecialSalado']}
                            maxTotalPerAttendee={selectedPackage.bocadoEspecialSaladoCount || 0}
                            otherItemTypes={['bocadoEspecialDulce']}
                            sharedMaxTotalPerAttendee={selectedPackage.bocadoEspecialTotalCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />

                        <BocadoSelector
                            title="Bebida (Agua, Gaseosa Light o Común)"
                            itemTypes={['bebidaSimple']}
                            maxTotalPerAttendee={selectedPackage.bebidaSimpleCount || 0}
                            formData={formData}
                            setFormData={setFormData}
                            attendees={formData.attendees}
                            menuItems={menuItems}
                        />
                    </div>

                </div>
              )}

              <div className="ct-panel space-y-5 p-4 sm:p-6">
                <Step n={stepExtras} title="Extras" hint="Se cobran aparte" />
                <p className="text-sm text-neutral-500">
                  El <strong className="font-medium text-neutral-900">personal de apoyo</strong> admite
                  una sola opción.
                </p>
                <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {addons.map((addon) => {
                    const isSupportStaff = addon.name.startsWith('Personal de Apoyo');
                    const quantity = formData.addonQuantities[addon.name] || 0;
                    return (
                      <li
                        key={addon.name}
                        className={`flex items-center justify-between gap-3 py-3 ${quantity > 0 ? 'bg-neutral-50' : ''}`}
                      >
                        <div className="flex-1 px-1">
                          <p className="text-sm font-medium text-neutral-900">{addon.name}</p>
                          <p className="ct-readout mt-0.5 text-xs text-neutral-500">
                            {formatCurrency(addon.price)}
                            <span className="ml-1">/ {isSupportStaff ? 'servicio' : 'unidad'}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-1">
                          <button
                            type="button"
                            onClick={() => handleAddonChange(addon.name, -1)}
                            disabled={quantity === 0}
                            className="ct-step"
                            aria-label={`Quitar ${addon.name}`}
                          >
                            −
                          </button>
                          <span
                            className={`ct-readout w-8 text-center text-sm ${
                              quantity > 0 ? 'font-semibold text-neutral-900' : 'text-neutral-400'
                            }`}
                          >
                            {String(quantity).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddonChange(addon.name, 1)}
                            disabled={isSupportStaff && Object.keys(formData.addonQuantities).some(key => key.startsWith('Personal de Apoyo') && formData.addonQuantities[key] > 0 && key !== addon.name)}
                            className="ct-step"
                            aria-label={`Agregar ${addon.name}`}
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="ct-panel space-y-5 p-4 sm:p-6">
                <Step n={stepObservaciones} title="Observaciones" hint="Opcional" />
                <textarea
                  name="observations"
                  value={formData.observations}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Ej: Necesitamos opciones sin gluten o el área de servicio es en el 3er piso."
                  className="ct-input resize-y"
                ></textarea>
              </div>

              <div className="ct-panel space-y-4 p-4 sm:p-6">
                {message && (
                  <p className={message.startsWith('✅') ? 'ct-note' : 'ct-note-strong'}>
                    {message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || formData.attendees <= 0 || !user}
                  className="ct-btn-solid w-full !py-4"
                >
                  {isSubmitting ? 'Enviando pedido…' : `Enviar pedido · ${formatCurrency(totalPrice)}`}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-1">
            {/* Resumen: la lectura principal del tablero */}
            <div className="ct-panel sticky top-8">
              <div className="ct-bar">
                <span className="ct-title">Resumen</span>
              </div>

              <div className="border-b border-neutral-200 px-4 py-3">
                <p className="ct-label">Paquete</p>
                <p className="mt-1 text-sm font-medium leading-snug text-neutral-900">
                  {selectedPackage?.name}
                </p>
                <p className="ct-readout mt-1 text-xs text-neutral-500">
                  {formatCurrency(selectedPackage?.basePrice)} / pers.
                </p>
              </div>

              <dl className="space-y-2 border-b border-neutral-200 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-neutral-600">
                    Base · <span className="ct-readout">{formData.attendees}</span> pers.
                  </dt>
                  <dd className="ct-readout text-sm text-neutral-900">
                    {formatCurrency((selectedPackage?.basePrice || 0) * formData.attendees)}
                  </dd>
                </div>

                {addons.filter(a => formData.addonQuantities[a.name] > 0).map(addon => (
                  <div key={addon.name} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-neutral-600">
                      <span className="ct-readout text-neutral-400">
                        {String(formData.addonQuantities[addon.name]).padStart(2, '0')}
                      </span>{' '}
                      {addon.name.split(':')[0]}
                    </dt>
                    <dd className="ct-readout text-sm text-neutral-900">
                      {formatCurrency(formData.addonQuantities[addon.name] * addon.price)}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="bg-neutral-950 px-4 py-4 text-white">
                <p className="ct-label-inv">Total estimado</p>
                <p className="ct-readout mt-1 text-3xl font-semibold tracking-tight">
                  {formatCurrency(totalPrice)}
                </p>
              </div>

              <p className="px-4 py-2.5 text-[11px] text-neutral-500">
                El precio final puede variar tras la confirmación.
              </p>
            </div>

            <OrderList orders={orders} userEmail={user.email} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;