import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore, appId } from './firebase.js';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados para los precios
  const [menuItems, setMenuItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);

  // Estados para aplicar porcentaje
  const [globalPercentage, setGlobalPercentage] = useState('');
  const [categoryPercentage, setCategoryPercentage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Contraseña de admin (en producción esto debería estar en Firebase Auth)
  const ADMIN_PASSWORD = 'admin123'; // Cambiar por una contraseña segura

  // Cargar precios desde Firebase
  useEffect(() => {
    if (isAuthenticated) {
      loadPricesFromFirebase();
    }
  }, [isAuthenticated]);

  const loadPricesFromFirebase = async () => {
    setLoading(true);
    try {
      const docRef = doc(firestore, 'prices', appId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        let hasChanges = false;

        // Merge packages: actualizar propiedades de paquetes del código sin perder precios de Firebase
        const defaultPackages = getDefaultPackages();
        const firebasePackages = data.packages || [];
        const mergedPackages = firebasePackages.map(fbPkg => {
          const defaultPkg = defaultPackages.find(dp => dp.id === fbPkg.id);
          if (defaultPkg) {
            // Verificar si hay cambios en las propiedades (excluyendo basePrice)
            const propsChanged = Object.keys(defaultPkg).some(key => {
              if (key === 'basePrice') return false;
              return JSON.stringify(defaultPkg[key]) !== JSON.stringify(fbPkg[key]);
            });
            if (propsChanged) {
              console.log(`🔄 Actualizando propiedades del paquete: ${defaultPkg.name}`);
              hasChanges = true;
            }
            // Mantener precio de Firebase pero actualizar propiedades del código
            return { ...defaultPkg, basePrice: fbPkg.basePrice };
          }
          return fbPkg;
        });

        // Agregar paquetes nuevos que están en código pero no en Firebase
        defaultPackages.forEach(defaultPkg => {
          const exists = firebasePackages.some(fbPkg => fbPkg.id === defaultPkg.id);
          if (!exists) {
            mergedPackages.push(defaultPkg);
            console.log(`✨ Nuevo paquete detectado: ${defaultPkg.name}`);
            hasChanges = true;
          }
        });

        // Merge addons: mantener orden del código pero usar precios de Firebase
        const defaultAddons = getDefaultAddons();
        const firebaseAddons = data.addons || [];

        // Función para normalizar nombres (quita espacios extra y convierte a minúsculas)
        const normalizeName = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

        // Crear un Map de Firebase por nombre normalizado para acceso rápido
        const firebaseMap = new Map();
        firebaseAddons.forEach(fbAddon => {
          firebaseMap.set(normalizeName(fbAddon.name), fbAddon);
        });

        // Mantener orden del código, usar precio de Firebase si existe
        const mergedAddons = defaultAddons.map(defaultAddon => {
          const normalizedName = normalizeName(defaultAddon.name);
          const firebaseAddon = firebaseMap.get(normalizedName);

          if (firebaseAddon) {
            // Existe en Firebase: usar precio de Firebase
            return { ...defaultAddon, price: firebaseAddon.price };
          } else {
            // No existe en Firebase: usar valores por defecto
            console.log(`✨ Nuevo adicional detectado: ${defaultAddon.name}`);
            hasChanges = true;
            return defaultAddon;
          }
        });

        const loadedMenuItems = data.menuItems || getDefaultMenuItems();

        setMenuItems(loadedMenuItems);
        setPackages(mergedPackages);
        setAddons(mergedAddons);

        // Si detectamos cambios, guardar automáticamente
        if (hasChanges) {
          await setDoc(docRef, {
            menuItems: loadedMenuItems,
            packages: mergedPackages,
            addons: mergedAddons,
            lastUpdated: new Date().toISOString()
          });
          setMessage({ type: 'success', text: '✅ Cambios detectados y guardados automáticamente' });
        } else {
          setMessage({ type: 'success', text: 'Precios cargados correctamente' });
        }
      } else {
        // Si no existen precios guardados, usar los valores por defecto
        setMenuItems(getDefaultMenuItems());
        setPackages(getDefaultPackages());
        setAddons(getDefaultAddons());
        setMessage({ type: 'info', text: 'Usando precios por defecto' });
      }
    } catch (error) {
      console.error('Error cargando precios:', error);
      setMessage({ type: 'error', text: 'Error al cargar precios: ' + error.message });
      // Usar valores por defecto en caso de error
      setMenuItems(getDefaultMenuItems());
      setPackages(getDefaultPackages());
      setAddons(getDefaultAddons());
    } finally {
      setLoading(false);
    }
  };

  const savePricesToFirebase = async () => {
    setSaving(true);
    try {
      const docRef = doc(firestore, 'prices', appId);
      await setDoc(docRef, {
        menuItems,
        packages,
        addons,
        lastUpdated: new Date().toISOString()
      });
      setMessage({ type: 'success', text: '✅ Precios guardados exitosamente' });
    } catch (error) {
      console.error('Error guardando precios:', error);
      setMessage({ type: 'error', text: '❌ Error al guardar precios: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setMessage({ type: '', text: '' });
    } else {
      setMessage({ type: 'error', text: 'Contraseña incorrecta' });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setMessage({ type: '', text: '' });
  };

  // Actualizar precio individual de menuItem
  const updateMenuItemPrice = (index, newPrice) => {
    const updated = [...menuItems];
    updated[index].price = parseFloat(newPrice) || 0;
    setMenuItems(updated);
  };

  // Actualizar precio individual de package
  const updatePackagePrice = (index, newPrice) => {
    const updated = [...packages];
    updated[index].basePrice = parseFloat(newPrice) || 0;
    setPackages(updated);
  };

  // Actualizar precio individual de addon
  const updateAddonPrice = (index, newPrice) => {
    const updated = [...addons];
    updated[index].price = parseFloat(newPrice) || 0;
    setAddons(updated);
  };

  // Aplicar porcentaje a una categoría específica
  const applyPercentageToCategory = () => {
    const percentage = parseFloat(categoryPercentage);
    if (isNaN(percentage)) {
      setMessage({ type: 'error', text: 'Ingrese un porcentaje válido' });
      return;
    }

    const multiplier = 1 + (percentage / 100);

    if (selectedCategory === 'all') {
      // Aplicar a todo
      setMenuItems(menuItems.map(item => ({
        ...item,
        price: Math.round(item.price * multiplier)
      })));
      setPackages(packages.map(pkg => ({
        ...pkg,
        basePrice: Math.round(pkg.basePrice * multiplier)
      })));
      setAddons(addons.map(addon => ({
        ...addon,
        price: Math.round(addon.price * multiplier)
      })));
      setMessage({ type: 'success', text: `✅ Porcentaje ${percentage}% aplicado a TODOS los precios` });
    } else if (selectedCategory === 'packages') {
      setPackages(packages.map(pkg => ({
        ...pkg,
        basePrice: Math.round(pkg.basePrice * multiplier)
      })));
      setMessage({ type: 'success', text: `✅ Porcentaje ${percentage}% aplicado a PAQUETES` });
    } else if (selectedCategory === 'addons') {
      setAddons(addons.map(addon => ({
        ...addon,
        price: Math.round(addon.price * multiplier)
      })));
      setMessage({ type: 'success', text: `✅ Porcentaje ${percentage}% aplicado a EXTRAS` });
    } else {
      // Aplicar a categoría específica de bocados
      setMenuItems(menuItems.map(item => {
        if (item.type === selectedCategory) {
          return {
            ...item,
            price: Math.round(item.price * multiplier)
          };
        }
        return item;
      }));
      setMessage({ type: 'success', text: `✅ Porcentaje ${percentage}% aplicado a categoría ${getCategoryName(selectedCategory)}` });
    }

    setCategoryPercentage('');
  };

  const getCategoryName = (type) => {
    const names = {
      'bocadoFactura': 'Facturas',
      'bocadoSimple': 'Bocados Simples',
      'bocadoSaladoSimple': 'Bocados Salados Simples',
      'bocadoEspecialDulce': 'Bocados Especiales Dulces',
      'bocadoEspecialSalado': 'Bocados Especiales Salados',
      'empanada': 'Empanadas',
      'shotDulce': 'Shots Dulces',
      'bebidaSimple': 'Bebidas Simples'
    };
    return names[type] || type;
  };

  const groupByCategory = () => {
    const grouped = {};
    menuItems.forEach((item, index) => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push({ ...item, originalIndex: index });
    });
    return grouped;
  };

  // Renderizar formulario de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🔐 Panel de Administración
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Ingrese la contraseña"
                required
              />
            </div>
            {message.type === 'error' && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {message.text}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const groupedItems = groupByCategory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                ⚙️ Panel de Administración de Precios
              </h1>
              <p className="text-gray-600 mt-1">Gestiona todos los precios de la aplicación</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Mensajes */}
          {message.text && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' :
              message.type === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Botón de guardar principal */}
          <div className="mt-4">
            <button
              onClick={savePricesToFirebase}
              disabled={saving}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50"
            >
              {saving ? 'Guardando...' : '💾 GUARDAR TODOS LOS CAMBIOS'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando precios...</p>
          </div>
        ) : (
          <>
            {/* Aplicar porcentaje masivo */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📊 Aplicar Porcentaje Masivo
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">🌐 Todos los Precios</option>
                    <option value="packages">📦 Solo Paquetes</option>
                    <option value="addons">➕ Solo Extras</option>
                    <optgroup label="Bocados">
                      <option value="bocadoFactura">Facturas</option>
                      <option value="bocadoSimple">Bocados Simples</option>
                      <option value="bocadoSaladoSimple">Bocados Salados Simples</option>
                      <option value="bocadoEspecialDulce">Bocados Especiales Dulces</option>
                      <option value="bocadoEspecialSalado">Bocados Especiales Salados</option>
                      <option value="empanada">Empanadas</option>
                      <option value="shotDulce">Shots Dulces</option>
                      <option value="bebidaSimple">Bebidas Simples</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porcentaje (%)
                  </label>
                  <input
                    type="number"
                    value={categoryPercentage}
                    onChange={(e) => setCategoryPercentage(e.target.value)}
                    placeholder="ej: 10 para +10%"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyPercentageToCategory}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                💡 Tip: Usa números positivos para aumentar (ej: 10) o negativos para reducir (ej: -5)
              </p>
            </div>

            {/* Bocados por categoría */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🥐 Bocados y Productos</h2>
              {Object.entries(groupedItems).map(([type, items]) => (
                <div key={type} className="mb-8">
                  <h3 className="text-xl font-semibold text-indigo-700 mb-3 border-b pb-2">
                    {getCategoryName(type)} ({items.length} items)
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div key={item.originalIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <p className="text-sm text-gray-700 mb-2 font-medium">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateMenuItemPrice(item.originalIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Paquetes */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📦 Paquetes / Combos</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {packages.map((pkg, index) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{pkg.name}</p>
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-gray-500 text-sm">Precio por persona:</span>
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={pkg.basePrice}
                        onChange={(e) => updatePackagePrice(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extras/Add-ons */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Extras / Add-ons</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map((addon, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-700 mb-2 font-medium">{addon.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={addon.price}
                        onChange={(e) => updateAddonPrice(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de guardar inferior */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <button
                onClick={savePricesToFirebase}
                disabled={saving}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50"
              >
                {saving ? 'Guardando...' : '💾 GUARDAR TODOS LOS CAMBIOS'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Funciones para obtener valores por defecto
const getDefaultMenuItems = () => [
  // ===== CATEGORÍA FACTURAS =====
  { type: 'bocadoFactura', name: 'Medialuna de Manteca 🆕', price: 100 },
  { type: 'bocadoFactura', name: 'Medialuna de Grasa 🆕', price: 100 },
  { type: 'bocadoFactura', name: 'Librito', price: 100 },
  { type: 'bocadoFactura', name: 'Churrinche', price: 100 },
  { type: 'bocadoFactura', name: 'Sacramento 🆕', price: 100 },

  // ===== CATEGORÍA BOCADOS SIMPLES =====
  { type: 'bocadoSimple', name: 'Medialuna de Manteca', price: 120 },
  { type: 'bocadoSimple', name: 'Medialuna de Grasa', price: 120 },
  { type: 'bocadoSimple', name: 'Librito', price: 120 },
  { type: 'bocadoSimple', name: 'Churrinche', price: 120 },
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

  // ===== CATEGORÍA BOCADOS SALADOS SIMPLES =====
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

  // ===== CATEGORÍA BOCADOS ESPECIALES DULCES =====
  { type: 'bocadoEspecialDulce', name: 'Medialuna de Manteca', price: 200 },
  { type: 'bocadoEspecialDulce', name: 'Medialuna de Grasa', price: 200 },
  { type: 'bocadoEspecialDulce', name: 'Librito', price: 200 },
  { type: 'bocadoEspecialDulce', name: 'Churrinche', price: 200 },
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
  { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Maicena', price: 180 },
  { type: 'bocadoEspecialDulce', name: 'Alfajorcito Sablé', price: 180 },
  { type: 'bocadoEspecialDulce', name: 'Alfajorcito de Chocolate', price: 180 },
  { type: 'bocadoEspecialDulce', name: 'Shot de Ensalada de Frutas', price: 250 },
  { type: 'bocadoEspecialDulce', name: 'Shot de Yogurt con Granola', price: 250 },
  { type: 'bocadoEspecialDulce', name: 'Pinchos de Frutas 🆕', price: 250 },
  { type: 'bocadoEspecialDulce', name: 'Fruta de Estación', price: 250 },
  { type: 'bocadoEspecialDulce', name: 'Barrita de Cereal', price: 250 },

  // ===== CATEGORÍA BOCADOS ESPECIALES SALADOS =====
  { type: 'bocadoEspecialSalado', name: 'Chipacito de Queso', price: 200 },
  { type: 'bocadoEspecialSalado', name: 'Scon de Queso', price: 200 },
  { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Blanco', price: 200 },
  { type: 'bocadoEspecialSalado', name: 'Sandwich de Miga Negro', price: 200 },
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

  // ===== CATEGORÍA EMPANADAS =====
  { type: 'empanada', name: 'Empanada de Carne', price: 300 },
  { type: 'empanada', name: 'Empanada de Pollo', price: 300 },
  { type: 'empanada', name: 'Empanada de Jamón y Queso', price: 300 },
  { type: 'empanada', name: 'Empanada de Verdura', price: 300 },

  // ===== CATEGORÍA SHOTS DULCES =====
  { type: 'shotDulce', name: 'Shot Dulce - Lemon Pie 🆕', price: 180 },
  { type: 'shotDulce', name: 'Shot Dulce - Chocotorta 🆕', price: 180 },
  { type: 'shotDulce', name: 'Shot Dulce - Red Velvet 🆕', price: 180 },

  // ===== CATEGORÍA BEBIDAS SIMPLES =====
  { type: 'bebidaSimple', name: 'Agua Mineral', price: 0 },
  { type: 'bebidaSimple', name: 'Gaseosa Light', price: 0 },
  { type: 'bebidaSimple', name: 'Gaseosa Común', price: 0 },
];

const getDefaultPackages = () => [
  { id: 'C1', name: '1. Coffee Break (Simple)', description: 'Infusiones, jugo y agua.', basePrice: 2631, attendeesBase: 1, hasNespressoOption: true },
  { id: 'C1N', name: '1. Coffee Break (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua.', basePrice: 4066, attendeesBase: 1, isNespresso: true },
  { id: 'C2', name: '2. Coffee Break + 2 Facturas', description: 'Infusiones, jugo y agua + 2 Facturas.', basePrice: 4545, attendeesBase: 1, bocadoFacturaCount: 2, hasNespressoOption: true },
  { id: 'C2N', name: '2. Coffee Break + 2 Facturas (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua + 2 Facturas.', basePrice: 6698, attendeesBase: 1, bocadoFacturaCount: 2, isNespresso: true },
  { id: 'C3', name: '3. Coffee Break + 2 Bocados Simples (Mixto)', description: 'Infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).', basePrice: 6219, attendeesBase: 1, bocadoSimpleTotalCount: 2, hasNespressoOption: true },
  { id: 'C3N', name: '3. Coffee Break + 2 Bocados Simples (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua + 2 bocados simples (Dulce y/o Salado).', basePrice: 7834, attendeesBase: 1, bocadoSimpleTotalCount: 2, isNespresso: true },
  { id: 'C4', name: '4. Coffee Break + 2 Bocados Especiales (Dulce y/o Salado)', description: 'Infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).', basePrice: 6937, attendeesBase: 1, bocadoEspecialTotalCount: 2, hasNespressoOption: true },
  { id: 'C4N', name: '4. Coffee Break + 2 Bocados Especiales (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua + 2 bocados especiales (Dulce y/o Salado).', basePrice: 9030, attendeesBase: 1, bocadoEspecialTotalCount: 2, isNespresso: true },
  { id: 'C5', name: '5. Coffee Break + 2 Bocados Salados Especiales', description: 'Infusiones, jugo y agua + 2 bocados salados especiales.', basePrice: 7894, attendeesBase: 1, bocadoEspecialSaladoCount: 2, hasNespressoOption: true },
  { id: 'C5N', name: '5. Coffee Break + 2 Bocados Salados Especiales (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua + 2 bocados salados especiales.', basePrice: 10046, attendeesBase: 1, bocadoEspecialSaladoCount: 2, isNespresso: true },
  { id: 'C6N', name: '6. Coffee Break (NESPRESSO) + 4 Bocados Especiales (Dulce y/o Salado)', description: 'Nespresso, infusiones, jugo y agua + 4 bocados especiales (Dulce y/o Salado).', basePrice: 10046, attendeesBase: 1, bocadoEspecialTotalCount: 4, isNespresso: true },
  { id: 'C7N', name: '7. Coffee Break (NESPRESSO) + 2 Empanadas + 2 Bocados', description: 'Nespresso, infusiones, jugo y agua + 2 empanadas + 2 bocados (dulces y/o salados simples).', basePrice: 11482, attendeesBase: 1, empanadaCount: 2, bocadoSimpleTotalCount: 2, isNespresso: true },
  { id: 'C8S', name: '8. BIENVENIDA SIMPLE', description: '1 bocado dulce simple + 3 bocados salados simples + 1 bebida (agua, gaseosa light o común).', basePrice: 10465, attendeesBase: 1, bocadoSimpleCount: 1, bocadoSaladoSimpleCount: 3, bebidaSimpleCount: 1 },
  { id: 'C9F', name: '9. BIENVENIDA FULL', description: 'Infusiones, jugo y agua + 2 bocados dulces esp. + 1 shot dulce + 5 bocados salados esp. + 1 bebida (agua, gaseosa light o común).', basePrice: 22126, attendeesBase: 1, bocadoEspecialDulceCount: 2, shotDulceCount: 1, bocadoEspecialSaladoCount: 5, bebidaSimpleCount: 1, hasNespressoOption: true },
  { id: 'C9FN', name: '9. BIENVENIDA FULL (con NESPRESSO)', description: 'Nespresso, infusiones, jugo y agua + 2 bocados dulces esp. + 1 shot dulce + 5 bocados salados esp. + 1 bebida (agua, gaseosa light o común).', basePrice: 24638, attendeesBase: 1, bocadoEspecialDulceCount: 2, shotDulceCount: 1, bocadoEspecialSaladoCount: 5, bebidaSimpleCount: 1, isNespresso: true },
];

const getDefaultAddons = () => [
  { name: 'Yogurt Bebible Frutilla/Vainilla (Jarra x Litro)', price: 6578 },
  { name: 'Agua Mineral (grande 1.5lts)', price: 2512 },
  { name: 'Agua Mineral Chica', price: 1794 },
  { name: 'Gaseosa (grande)', price: 5382 },
  { name: 'Jugo Cepita x Litro', price: 2990 },
  { name: 'Bocaditos Salados', price: 2631 },
  { name: 'Bocaditos Dulces', price: 777 },
  { name: 'Frutas', price: 1555 },
  { name: 'Personal de Apoyo: Jornada 3 hs', price: 25116 },
  { name: 'Personal de Apoyo: Jornada 6 hs', price: 27508 },
  { name: 'Personal de Apoyo: Jornada 9 hs', price: 32292 },
];

export default AdminPanel;
