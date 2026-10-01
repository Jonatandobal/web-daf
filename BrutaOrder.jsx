// BrutaOrder.jsx — portal de pedidos de pizza de BRUTA (ruta /bruta).
// Mismo login y mismo estilo que Coffee Break, pero un pedido simple: número
// de orden, fecha de entrega y cantidad por gusto. Muestra al cliente lo que
// pidió y cuánto lleva gastado en el mes.
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db as firestore, appId } from './firebase.js';
import { BRUTA_DOC_ID } from './brutaDoc.js';
import {
  BRUTA_KIND,
  armarRenglones,
  gastadoDelMes,
  minDeliveryDate,
  pizzasDisponibles,
  resolveBrutaCatalog,
  toISODate,
  totalesDelPedido,
  validarPedido,
} from './brutaCatalog.js';

const SEND_API_URL = '/api/send-bruta';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatFecha = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const BrutaOrder = ({ user, onLogout }) => {
  const [catalog, setCatalog] = useState(() => resolveBrutaCatalog(null));
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [cantidades, setCantidades] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const minDate = useMemo(() => minDeliveryDate(catalog.leadDays), [catalog.leadDays]);
  const pizzas = useMemo(() => pizzasDisponibles(catalog.pizzas), [catalog.pizzas]);
  const renglones = useMemo(() => armarRenglones(pizzas, cantidades), [pizzas, cantidades]);
  const { totalUnits, totalPrice } = useMemo(() => totalesDelPedido(renglones), [renglones]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, 'prices', BRUTA_DOC_ID));
        setCatalog(resolveBrutaCatalog(snap.exists() ? snap.data() : null));
      } catch (error) {
        console.error('Error cargando la carta de BRUTA:', error);
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, []);

  // La fecha de entrega arranca en la primera disponible, y se corrige si la
  // carta cambia el anticipo y la elegida quedó fuera.
  useEffect(() => {
    setDeliveryDate((prev) => (prev && prev >= minDate ? prev : minDate));
  }, [minDate]);

  useEffect(() => {
    const ref = collection(firestore, `artifacts/${appId}/users/${user.uid}/orders`);
    return onSnapshot(
      query(ref, orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => o.kind === BRUTA_KIND)),
      (error) => console.error('Error leyendo pedidos:', error),
    );
  }, [user.uid]);

  const gastado = useMemo(() => gastadoDelMes(orders), [orders]);

  const setCantidad = (name, value) =>
    setCantidades((prev) => ({ ...prev, [name]: Math.max(0, Math.floor(Number(value) || 0)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const errores = validarPedido({ orderNumber, deliveryDate, renglones }, minDate);
    if (errores.length > 0) {
      setMessage(`❌ ${errores.join(' ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        kind: BRUTA_KIND,
        orderNumber: orderNumber.trim(),
        orderDate: toISODate(new Date()),
        deliveryDate,
        items: renglones,
        totalUnits,
        totalPrice,
        observations: observations.trim(),
        status: 'Pendiente',
        userId: user.uid,
        userEmail: user.email,
        appId,
        timestamp: new Date().toISOString(),
      };
      const ref = collection(firestore, `artifacts/${appId}/users/${user.uid}/orders`);
      const docRef = await addDoc(ref, { ...orderData, createdAt: serverTimestamp() });

      // El mail es un aviso: si falla, el pedido ya quedó guardado.
      let mailOk = true;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(SEND_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, orderId: docRef.id, idToken }),
        });
        mailOk = res.ok;
      } catch (error) {
        console.error('Fallo al enviar la confirmación:', error);
        mailOk = false;
      }

      setCantidades({});
      setOrderNumber('');
      setObservations('');
      setDeliveryDate(minDate);
      setMessage(
        `✅ Pedido ${orderData.orderNumber} enviado. ${totalUnits} pizzas · ${formatCurrency(totalPrice)}.` +
          (mailOk ? ' Te mandamos la confirmación por mail.' : ' No pudimos mandarte el mail, pero el pedido quedó registrado.'),
      );
    } catch (error) {
      console.error('Error al guardar el pedido:', error);
      setMessage(`❌ No se pudo enviar el pedido: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ct-shell p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="ct-panel">
          <div className="ct-bar">
            <span className="ct-title">BRUTA · Pedidos de pizza</span>
            <button onClick={onLogout} className="ct-btn-inv !px-3 !py-1.5">Salir</button>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Hacé tu pedido</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Cargá el número de orden, la fecha de entrega y cuántas pizzas de cada gusto.
              </p>
            </div>
            <div className="text-right">
              <p className="ct-label">Lleva gastado este mes</p>
              <p className="ct-readout mt-0.5 text-xl font-semibold text-neutral-900">{formatCurrency(gastado)}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
            <div className="ct-panel space-y-5 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="ct-label">Número de orden</span>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                    placeholder="Ej: 1042"
                    className="ct-input mt-2"
                  />
                </label>
                <label className="block">
                  <span className="ct-label">Fecha de entrega</span>
                  <input
                    type="date"
                    value={deliveryDate}
                    min={minDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                    className="ct-input-num mt-2"
                  />
                </label>
              </div>
              <p className="text-xs text-neutral-500">
                Fecha del pedido: {formatFecha(toISODate(new Date()))} (se carga sola).
              </p>
            </div>

            <div className="ct-panel space-y-3 p-4 sm:p-6">
              <div className="flex items-baseline justify-between border-b border-neutral-900 pb-2">
                <h3 className="ct-title text-neutral-900">Gustos</h3>
                <span className="text-xs text-neutral-500">Precio por unidad</span>
              </div>

              {!catalogLoaded ? (
                <p className="py-6 text-center text-sm text-neutral-500">Cargando…</p>
              ) : pizzas.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Todavía no hay gustos disponibles. Consultá con DAF.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {pizzas.map((p) => {
                    const qty = cantidades[p.name] || 0;
                    return (
                      <li key={p.name} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                          <p className="ct-readout text-xs text-neutral-500">{formatCurrency(p.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="ct-step" aria-label={`Menos ${p.name}`}
                            onClick={() => setCantidad(p.name, qty - 1)}>−</button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => setCantidad(p.name, e.target.value)}
                            aria-label={`Cantidad de ${p.name}`}
                            className="ct-input-num !w-16 text-center"
                          />
                          <button type="button" className="ct-step" aria-label={`Más ${p.name}`}
                            onClick={() => setCantidad(p.name, qty + 1)}>+</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="ct-panel space-y-4 p-4 sm:p-6">
              <label className="block">
                <span className="ct-label">Observaciones · opcional</span>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  className="ct-input mt-2"
                  placeholder="Horario de entrega, aclaraciones…"
                />
              </label>
              <div className="flex items-center justify-between border-t border-neutral-300 pt-4">
                <div>
                  <p className="ct-label">Total del pedido</p>
                  <p className="ct-readout text-2xl font-semibold text-neutral-900">{formatCurrency(totalPrice)}</p>
                  <p className="text-xs text-neutral-500">{totalUnits} pizzas</p>
                </div>
                <button type="submit" disabled={submitting || pizzas.length === 0} className="ct-btn-primary disabled:opacity-50">
                  {submitting ? 'Enviando…' : 'Enviar pedido'}
                </button>
              </div>
              {message && <p className={message.startsWith('✅') ? 'ct-note' : 'ct-note-strong'}>{message}</p>}
            </div>
          </form>

          <aside className="ct-panel h-fit">
            <div className="ct-bar">
              <span className="ct-title">Mis pedidos</span>
              <span className="ct-readout text-sm text-neutral-400">{orders.length}</span>
            </div>
            {orders.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-neutral-500">Todavía no hiciste pedidos.</p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {orders.map((o) => (
                  <li key={o.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900">Orden {o.orderNumber}</span>
                      <span className="ct-readout text-sm">{formatCurrency(o.totalPrice)}</span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Pedido {formatFecha(o.orderDate)} · Entrega {formatFecha(o.deliveryDate)} · {o.status}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {(o.items || []).map((i) => `${i.qty} × ${i.name}`).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BrutaOrder;
