// BrutaAdmin.jsx — carta y configuración del portal de BRUTA (ruta /admin/bruta).
// Gustos, precios, qué se ofrece y con cuántos días de anticipación se pide.
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from './firebase.js';
import { ADMIN_PASSWORD } from './adminAuth.js';
import { BRUTA_DOC_ID } from './brutaDoc.js';
import { resolveBrutaCatalog, toStoredBrutaCatalog, validateBrutaCatalog } from './brutaCatalog.js';

const BrutaAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pizzas, setPizzas] = useState([]);
  const [leadDays, setLeadDays] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(firestore, 'prices', BRUTA_DOC_ID));
        const data = snap.exists() ? snap.data() : null;
        const resolved = resolveBrutaCatalog(data);
        setPizzas(resolved.pizzas);
        setLeadDays(resolved.leadDays);
        setLastUpdated(resolved.lastUpdated);
        setMessage(data
          ? { type: 'ok', text: 'Carta cargada' }
          : { type: 'info', text: 'Todavía no hay carta publicada. Cargá los gustos con su precio y guardá: un gusto sin precio no se muestra a los clientes.' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al cargar la carta: ' + error.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const save = async () => {
    const errores = validateBrutaCatalog(pizzas);
    if (errores.length > 0) {
      setMessage({ type: 'error', text: `No se publicó nada. ${errores.join(' ')}` });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await setDoc(doc(firestore, 'prices', BRUTA_DOC_ID), { ...toStoredBrutaCatalog(pizzas, leadDays), lastUpdated: now });
      setPizzas((prev) => prev.map((p) => ({ ...p, name: p.name.trim() })));
      setLastUpdated(now);
      setMessage({ type: 'ok', text: 'Carta guardada y publicada' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const update = (index, patch) => setPizzas((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  if (!isAuthenticated) {
    return (
      <div className="ct-shell flex items-center justify-center p-4">
        <form
          className="ct-panel w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (password === ADMIN_PASSWORD) setIsAuthenticated(true);
            else setMessage({ type: 'error', text: 'Contraseña incorrecta' });
          }}
        >
          <div className="ct-bar"><span className="ct-title">BRUTA · Admin</span></div>
          <div className="space-y-4 p-6">
            <label className="block">
              <span className="ct-label">Contraseña</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ct-input mt-2" />
            </label>
            {message.text && <p className="ct-note-strong">{message.text}</p>}
            <button type="submit" className="ct-btn-primary w-full">Entrar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="ct-shell p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="ct-panel">
          <div className="ct-bar">
            <span className="ct-title">BRUTA · Carta y configuración</span>
            <button onClick={() => { setIsAuthenticated(false); setPassword(''); }} className="ct-btn-inv !px-3 !py-1.5">Salir</button>
          </div>
          {lastUpdated && (
            <p className="px-4 py-3 text-xs text-neutral-500">Última publicación: {new Date(lastUpdated).toLocaleString('es-AR')}</p>
          )}
        </header>

        {message.text && <p className={message.type === 'error' ? 'ct-note-strong' : 'ct-note'}>{message.text}</p>}

        {loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Cargando…</p>
        ) : (
          <>
            <div className="ct-panel space-y-3 p-4 sm:p-6">
              <div className="flex items-baseline justify-between border-b border-neutral-900 pb-2">
                <h3 className="ct-title text-neutral-900">Gustos de pizza</h3>
                <span className="text-xs text-neutral-500">Sin precio = no se muestra</span>
              </div>
              <ul className="space-y-2">
                {pizzas.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Nombre del gusto"
                      aria-label={`Nombre del gusto ${i + 1}`}
                      className="ct-input min-w-0 flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      value={p.price}
                      onChange={(e) => update(i, { price: parseFloat(e.target.value) || 0 })}
                      aria-label={`Precio de ${p.name || `gusto ${i + 1}`}`}
                      className="ct-input-num !w-28"
                    />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.enabled}
                      aria-label={`${p.name || `Gusto ${i + 1}`} disponible`}
                      onClick={() => update(i, { enabled: !p.enabled })}
                      className="ct-toggle"
                    />
                    <button
                      type="button"
                      onClick={() => setPizzas((prev) => prev.filter((_, j) => j !== i))}
                      className="ct-step"
                      aria-label={`Quitar ${p.name || `gusto ${i + 1}`}`}
                    >×</button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setPizzas((prev) => [...prev, { name: '', price: 0, enabled: true }])} className="ct-btn">
                + Agregar gusto
              </button>
            </div>

            <div className="ct-panel space-y-3 p-4 sm:p-6">
              <label className="block">
                <span className="ct-label">Días de anticipación mínimos</span>
                <input
                  type="number"
                  min="1"
                  value={leadDays}
                  onChange={(e) => setLeadDays(parseInt(e.target.value, 10) || 1)}
                  className="ct-input-num mt-2 !w-28"
                />
              </label>
              <p className="text-xs text-neutral-500">1 = se puede pedir para mañana. Hoy nunca.</p>
            </div>

            <button type="button" onClick={save} disabled={saving} className="ct-btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar y publicar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BrutaAdmin;
