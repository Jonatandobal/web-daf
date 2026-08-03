import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore, appId } from './firebase.js';
import { resolvePrices, toPriceMaps } from './catalog.js';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Precios editables. La estructura (nombres, combos) viene del catálogo.
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Estados para aplicar porcentaje
  const [percentage, setPercentage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Contraseña de admin (en producción esto debería estar en Firebase Auth)
  const ADMIN_PASSWORD = 'admin123'; // Cambiar por una contraseña segura

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
      const data = docSnap.exists() ? docSnap.data() : null;

      const resolved = resolvePrices(data);
      setPackages(resolved.packages);
      setAddons(resolved.addons);
      setLastUpdated(data?.lastUpdated ?? null);

      const sinPrecio = [...resolved.packages, ...resolved.addons].filter((i) => i.fromSeed);
      if (!data) {
        setMessage({ type: 'info', text: 'No hay precios en Firebase todavía. Se muestran los valores iniciales del catálogo: revisalos y guardá.' });
      } else if (sinPrecio.length > 0) {
        setMessage({ type: 'info', text: `⚠️ ${sinPrecio.length} ítem(s) sin precio guardado: ${sinPrecio.map((i) => i.name).join(', ')}. Se muestran con el valor inicial del catálogo, revisalos y guardá.` });
      } else {
        setMessage({ type: 'success', text: 'Precios cargados correctamente' });
      }
    } catch (error) {
      console.error('Error cargando precios:', error);
      setMessage({ type: 'error', text: 'Error al cargar precios: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const savePricesToFirebase = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const docRef = doc(firestore, 'prices', appId);
      // Solo se persisten los precios: la estructura vive en catalog.js
      await setDoc(docRef, { ...toPriceMaps(packages, addons), lastUpdated: now });

      setPackages((prev) => prev.map(({ fromSeed, ...p }) => p));
      setAddons((prev) => prev.map(({ fromSeed, ...a }) => a));
      setLastUpdated(now);
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

  const updatePackagePrice = (index, newPrice) => {
    setPackages((prev) => prev.map((pkg, i) => (
      i === index ? { ...pkg, basePrice: parseFloat(newPrice) || 0 } : pkg
    )));
  };

  const updateAddonPrice = (index, newPrice) => {
    setAddons((prev) => prev.map((addon, i) => (
      i === index ? { ...addon, price: parseFloat(newPrice) || 0 } : addon
    )));
  };

  const applyPercentage = () => {
    const value = parseFloat(percentage);
    if (isNaN(value)) {
      setMessage({ type: 'error', text: 'Ingrese un porcentaje válido' });
      return;
    }

    const multiplier = 1 + value / 100;
    const targets = [];

    if (selectedCategory === 'all' || selectedCategory === 'packages') {
      setPackages((prev) => prev.map((pkg) => ({
        ...pkg,
        basePrice: Math.round(pkg.basePrice * multiplier),
      })));
      targets.push('paquetes');
    }
    if (selectedCategory === 'all' || selectedCategory === 'addons') {
      setAddons((prev) => prev.map((addon) => ({
        ...addon,
        price: Math.round(addon.price * multiplier),
      })));
      targets.push('extras');
    }

    setMessage({ type: 'success', text: `✅ ${value}% aplicado a ${targets.join(' y ')}. Revisá los valores y guardá para publicarlos.` });
    setPercentage('');
  };

  const formatDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
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

  const saveButton = (
    <button
      onClick={savePricesToFirebase}
      disabled={saving}
      className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50"
    >
      {saving ? 'Guardando...' : '💾 GUARDAR TODOS LOS CAMBIOS'}
    </button>
  );

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
              <p className="text-gray-600 mt-1">
                {packages.length} paquetes y {addons.length} extras — se corresponden uno a uno con la lista de precios
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {lastUpdated
                  ? `Última actualización: ${formatDate(lastUpdated)}`
                  : 'Todavía no se guardó ninguna actualización'}
              </p>
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

          <div className="mt-4">{saveButton}</div>
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porcentaje (%)
                  </label>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="ej: 10 para +10%"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyPercentage}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                💡 Tip: Usa números positivos para aumentar (ej: 10) o negativos para reducir (ej: -5).
                El porcentaje se aplica sobre los precios que ves acá abajo, que son los que están publicados.
              </p>
            </div>

            {/* Paquetes */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📦 Paquetes / Combos ({packages.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {packages.map((pkg, index) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{pkg.name}</p>
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                      </div>
                      {pkg.fromSeed && (
                        <span className="ml-2 shrink-0 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">sin guardar</span>
                      )}
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ➕ Extras / Add-ons ({addons.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map((addon, index) => (
                  <div key={addon.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-gray-700 font-medium">{addon.name}</p>
                      {addon.fromSeed && (
                        <span className="ml-2 shrink-0 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">sin guardar</span>
                      )}
                    </div>
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
            <div className="bg-white rounded-lg shadow-lg p-6">{saveButton}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
