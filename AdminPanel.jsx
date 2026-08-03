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
        setMessage({ type: 'info', text: `${sinPrecio.length} ítem(s) sin precio guardado: ${sinPrecio.map((i) => i.name).join(', ')}. Se muestran con el valor inicial del catálogo, revisalos y guardá.` });
      } else {
        setMessage({ type: 'ok', text: 'Precios cargados correctamente' });
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
      setMessage({ type: 'ok', text: 'Precios guardados y publicados' });
    } catch (error) {
      console.error('Error guardando precios:', error);
      setMessage({ type: 'error', text: 'Error al guardar precios: ' + error.message });
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
      setMessage({ type: 'error', text: 'Ingresá un porcentaje válido' });
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

    setMessage({ type: 'info', text: `${value}% aplicado a ${targets.join(' y ')}. Revisá los valores y guardá para publicarlos.` });
    setPercentage('');
  };

  const formatDate = (iso) => (
    iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : null
  );

  // --- Login ---------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="ct-shell flex items-center justify-center p-4">
        <div className="ct-panel w-full max-w-sm">
          <div className="ct-bar">
            <span className="ct-title">Acceso restringido</span>
            <span className="ct-label-inv">DAF</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-5 p-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                Panel de precios
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Ingresá la contraseña de administrador.
              </p>
            </div>

            <label className="block">
              <span className="ct-label">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ct-input mt-2"
                placeholder="••••••••"
                required
              />
            </label>

            {message.type === 'error' && (
              <p className="ct-note font-medium">{message.text}</p>
            )}

            <button type="submit" className="ct-btn-solid w-full">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Panel ---------------------------------------------------------------
  const pendientes = [...packages, ...addons].filter((i) => i.fromSeed).length;

  const saveButton = (
    <button onClick={savePricesToFirebase} disabled={saving} className="ct-btn-solid w-full">
      {saving ? 'Guardando…' : 'Guardar y publicar'}
    </button>
  );

  return (
    <div className="ct-shell p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-4">

        {/* Chrome principal */}
        <div className="ct-panel">
          <div className="ct-bar">
            <span className="ct-title">Panel de precios</span>
            <button onClick={handleLogout} className="ct-btn-inv !px-3 !py-1.5">
              Salir
            </button>
          </div>

          {/* Fila de lecturas */}
          <dl className="grid grid-cols-2 divide-neutral-300 border-b border-neutral-300 sm:grid-cols-4 sm:divide-x">
            <div className="px-4 py-3">
              <dt className="ct-label">Paquetes</dt>
              <dd className="ct-readout mt-1 text-2xl font-semibold">{packages.length}</dd>
            </div>
            <div className="border-l border-neutral-300 px-4 py-3 sm:border-l-0">
              <dt className="ct-label">Extras</dt>
              <dd className="ct-readout mt-1 text-2xl font-semibold">{addons.length}</dd>
            </div>
            <div className="border-t border-neutral-300 px-4 py-3 sm:border-t-0">
              <dt className="ct-label">Sin guardar</dt>
              <dd className="ct-readout mt-1 text-2xl font-semibold">{pendientes}</dd>
            </div>
            <div className="border-l border-t border-neutral-300 px-4 py-3 sm:border-t-0">
              <dt className="ct-label">Última publicación</dt>
              <dd className="mt-1 text-sm text-neutral-700">
                {formatDate(lastUpdated) ?? '—'}
              </dd>
            </div>
          </dl>

          {message.text && (
            <div className="px-4 pt-4">
              <p className={message.type === 'error' ? 'ct-note-strong' : 'ct-note'}>
                {message.text}
              </p>
            </div>
          )}

          <div className="p-4">{saveButton}</div>
        </div>

        {loading ? (
          <div className="ct-panel px-6 py-16 text-center">
            <div className="mx-auto h-6 w-6 animate-spin border-2 border-neutral-300 border-t-neutral-900" />
            <p className="ct-label mt-4">Cargando precios</p>
          </div>
        ) : (
          <>
            {/* Porcentaje masivo */}
            <div className="ct-panel">
              <div className="ct-bar-sub">
                <span className="ct-title text-neutral-900">Ajuste porcentual</span>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="block">
                  <span className="ct-label">Alcance</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="ct-input mt-2"
                  >
                    <option value="all">Todos los precios</option>
                    <option value="packages">Solo paquetes</option>
                    <option value="addons">Solo extras</option>
                  </select>
                </label>
                <label className="block">
                  <span className="ct-label">Porcentaje</span>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="10"
                    className="ct-input-num mt-2"
                  />
                </label>
                <button onClick={applyPercentage} className="ct-btn-line h-[42px]">
                  Aplicar
                </button>
              </div>
              <p className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
                Positivo aumenta, negativo reduce. Se aplica sobre los valores que ves abajo,
                que son los que están publicados — no sobre la lista anterior.
              </p>
            </div>

            {/* Paquetes */}
            <div className="ct-panel">
              <div className="ct-bar">
                <span className="ct-title">Paquetes · precio por persona</span>
                <span className="ct-readout text-sm text-neutral-400">{packages.length}</span>
              </div>
              <ul className="divide-y divide-neutral-200">
                {packages.map((pkg, index) => (
                  <li
                    key={pkg.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition hover:bg-neutral-50"
                  >
                    <span className="ct-readout w-12 shrink-0 text-xs font-semibold text-neutral-400">
                      {pkg.id}
                    </span>
                    <div className="min-w-[14rem] flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        {pkg.name}
                        {pkg.isNespresso && <span className="ct-chip text-neutral-500">Nespresso</span>}
                        {pkg.fromSeed && <span className="ct-chip text-neutral-900">Sin guardar</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">{pkg.description}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2">
                      <span className="ct-label">$</span>
                      <input
                        type="number"
                        value={pkg.basePrice}
                        onChange={(e) => updatePackagePrice(index, e.target.value)}
                        className="ct-input-num w-32 text-right"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Extras */}
            <div className="ct-panel">
              <div className="ct-bar">
                <span className="ct-title">Extras · precio por unidad</span>
                <span className="ct-readout text-sm text-neutral-400">{addons.length}</span>
              </div>
              <ul className="divide-y divide-neutral-200">
                {addons.map((addon, index) => (
                  <li
                    key={addon.name}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition hover:bg-neutral-50"
                  >
                    <p className="min-w-[14rem] flex-1 text-sm font-medium text-neutral-900">
                      {addon.name}
                      {addon.fromSeed && <span className="ct-chip ml-2 text-neutral-900">Sin guardar</span>}
                    </p>
                    <label className="flex shrink-0 items-center gap-2">
                      <span className="ct-label">$</span>
                      <input
                        type="number"
                        value={addon.price}
                        onChange={(e) => updateAddonPrice(index, e.target.value)}
                        className="ct-input-num w-32 text-right"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ct-panel p-4">{saveButton}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
