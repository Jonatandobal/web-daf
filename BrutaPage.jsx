// /bruta — pedido de pizzas BRUTA para eventos. Misma cuenta y mismo estilo que
// el pedido de Coffee Break; cambia la carta (solo los gustos de Bruta) y el
// destino: el pedido entra a Blixi como catering del local BRUTA.
import React, { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db as firestore, appId } from './firebase.js';
import { BRUTA_GUSTOS, BRUTA_PRECIOS, BRUTA_TIPOS, armarPedidoBruta } from './bruta.js';

const CONFIRMATION_API_URL = '/api/send-confirmation';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const getMinDate = () => new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

const Step = ({ n, title, hint }) => (
  <div className="flex items-baseline gap-3 border-b border-neutral-900 pb-2">
    <span className="ct-readout text-xs font-semibold text-neutral-400">{n}</span>
    <h3 className="ct-title text-neutral-900">{title}</h3>
    {hint && <span className="ml-auto text-xs text-neutral-500">{hint}</span>}
  </div>
);

const vacio = () => Object.fromEntries(BRUTA_GUSTOS.map((g) => [g.name, 0]));

const BrutaPage = ({ user, onLogout }) => {
  const minDate = useMemo(() => getMinDate(), []);
  const [form, setForm] = useState({
    name: '',
    email: user?.email || '',
    eventDate: minDate,
    eventTime: '',
    eventLocation: '',
    observations: '',
    billName: '',
    billCuit: '',
  });
  const [cantidades, setCantidades] = useState(vacio);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const pedido = useMemo(() => armarPedidoBruta(cantidades), [cantidades]);

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const cambiar = (name, delta) =>
    setCantidades((prev) => ({ ...prev, [name]: Math.max(0, Math.min(1000, (prev[name] || 0) + delta)) }));
  const escribir = (name, value) =>
    setCantidades((prev) => ({ ...prev, [name]: Math.max(0, Math.min(1000, parseInt(value, 10) || 0)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (pedido.pizzas === 0) {
      setMessage('❌ Elegí al menos una pizza.');
      return;
    }
    const cuit = form.billCuit.replace(/\D/g, '');
    if (cuit && cuit.length !== 11) {
      setMessage('❌ El CUIT tiene que tener 11 dígitos.');
      return;
    }
    // Blixi lee los datos de facturación de las observaciones: el encargado los
    // carga al confirmar la venta.
    const facturar = cuit || form.billName.trim()
      ? `Facturar a: ${form.billName.trim() || '(sin razón social)'} — CUIT ${cuit || '(sin CUIT)'}`
      : '';
    const observations = [facturar, form.observations.trim()].filter(Boolean).join('\n');
    setIsSubmitting(true);
    try {
      // Colección propia: el backfill de Coffee Break lee `artifacts/<appId>/users/`
      // y no tiene que arrastrar pedidos de Bruta al local UDESA.
      const ordersRef = collection(firestore, `artifacts/${appId}-bruta/users/${user.uid}/orders`);
      const docRef = doc(ordersRef);

      const orderData = {
        brand: 'bruta',
        orderId: docRef.id,
        name: form.name || 'N/A',
        email: form.email,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        eventLocation: form.eventLocation || 'N/A',
        attendees: pedido.attendees,
        packageName: pedido.packageName,
        packagePricePerAttendee: pedido.packagePricePerAttendee,
        addons: pedido.addons,
        selectedBocados: pedido.gustos,
        totalPrice: pedido.total,
        observations,
        billing: cuit || form.billName.trim() ? { name: form.billName.trim(), cuit } : null,
        status: 'Pendiente',
        userId: user.uid,
        userEmail: user.email,
        appId: `${appId}-bruta`,
        timestamp: new Date().toISOString(),
      };

      // Firestore es un respaldo: el pedido ya viaja completo al servidor, que
      // lo guarda en Airtable y lo manda a Blixi. Si las reglas no dejan
      // escribir esta colección, el pedido igual entra.
      try {
        await setDoc(docRef, { ...orderData, createdAt: serverTimestamp() });
      } catch (err) {
        console.warn('No se pudo guardar el respaldo en Firestore:', err);
      }

      const res = await fetch(CONFIRMATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error('No pudimos registrar el pedido. Probá de nuevo en unos minutos.');

      setCantidades(vacio());
      setForm((prev) => ({ ...prev, eventLocation: '', observations: '', billName: '', billCuit: '' }));
      setMessage(`✅ ¡Pedido realizado con éxito! Total: ${formatCurrency(pedido.total)}`);
    } catch (error) {
      console.error('Error al enviar el pedido de Bruta:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ct-shell p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="ct-panel">
          <div className="ct-bar">
            <span className="ct-title">Bruta · Pizzas para eventos</span>
            <button onClick={onLogout} className="ct-btn-inv !px-3 !py-1.5">Salir</button>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Armá tu pedido de pizzas</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Elegí cuántas pizzas de cada gusto. Simples {formatCurrency(BRUTA_PRECIOS.simple)} · Especiales {formatCurrency(BRUTA_PRECIOS.especial)}.
              </p>
            </div>
            <div className="text-right">
              <p className="ct-label">Usuario</p>
              <p className="mt-0.5 text-sm text-neutral-700">{user.email}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
            <div className="ct-panel space-y-5 p-4 sm:p-6">
              <Step n="01" title="Datos del evento" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="ct-label">Fecha</span>
                  <input type="date" name="eventDate" value={form.eventDate} onChange={onChange} required min={minDate} className="ct-input-num mt-2" />
                </label>
                <label className="block">
                  <span className="ct-label">Hora</span>
                  <input type="time" name="eventTime" value={form.eventTime} onChange={onChange} required className="ct-input-num mt-2" />
                </label>
                <label className="block md:col-span-2">
                  <span className="ct-label">Lugar</span>
                  <input type="text" name="eventLocation" value={form.eventLocation} onChange={onChange} placeholder="Ej: Sala de conferencias A, Piso 3" className="ct-input mt-2" />
                </label>
              </div>

              <Step n="02" title="Contacto" />
              <div className="grid grid-cols-1 gap-4">
                <label className="block">
                  <span className="ct-label">Email · obligatorio</span>
                  <input type="email" name="email" value={form.email} onChange={onChange} required className="ct-input mt-2" />
                </label>
                <label className="block">
                  <span className="ct-label">Nombre · opcional</span>
                  <input type="text" name="name" value={form.name} onChange={onChange} placeholder="Ej: Juan Pérez" className="ct-input mt-2" />
                </label>
              </div>
            </div>

            {['simple', 'especial'].map((tipo, i) => (
              <div key={tipo} className="ct-panel space-y-4 p-4 sm:p-6">
                <Step n={`0${i + 3}`} title={`${BRUTA_TIPOS[tipo].label}s`} hint={`${formatCurrency(BRUTA_PRECIOS[tipo])} c/u`} />
                <div className="space-y-3">
                  {BRUTA_GUSTOS.filter((g) => g.tipo === tipo).map((g) => (
                    <div key={g.name} className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{g.name}</p>
                        <p className="text-xs text-neutral-500">{g.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => cambiar(g.name, -1)} aria-label={`Menos ${g.name}`} className="ct-btn-inv !px-3 !py-1.5">−</button>
                        <input
                          type="number"
                          min="0"
                          value={cantidades[g.name]}
                          onChange={(e) => escribir(g.name, e.target.value)}
                          aria-label={`Cantidad de ${g.name}`}
                          className="ct-input-num w-16 text-center"
                        />
                        <button type="button" onClick={() => cambiar(g.name, 1)} aria-label={`Más ${g.name}`} className="ct-btn-inv !px-3 !py-1.5">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="ct-panel space-y-4 p-4 sm:p-6">
              <Step n="05" title="Facturación y observaciones" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="ct-label">Razón social · para la factura</span>
                  <input type="text" name="billName" value={form.billName} onChange={onChange} placeholder="Ej: Empresa S.A." className="ct-input mt-2" />
                </label>
                <label className="block">
                  <span className="ct-label">CUIT</span>
                  <input type="text" inputMode="numeric" name="billCuit" value={form.billCuit} onChange={onChange} placeholder="30-12345678-9" className="ct-input-num mt-2" />
                </label>
              </div>
              <textarea name="observations" value={form.observations} onChange={onChange} rows={3} placeholder="Alergias, horario de entrega, indicaciones…" className="ct-input" />
            </div>

            {message && <p className="text-sm text-neutral-800" role="status">{message}</p>}
            <button type="submit" disabled={isSubmitting || pedido.pizzas === 0} className="ct-btn w-full">
              {isSubmitting ? 'Enviando pedido…' : `Enviar pedido · ${formatCurrency(pedido.total)}`}
            </button>
          </form>

          <aside className="ct-panel h-fit space-y-3 p-4 sm:p-6">
            <Step n="==" title="Resumen" />
            {pedido.pizzas === 0 ? (
              <p className="text-sm text-neutral-500">Todavía no elegiste pizzas.</p>
            ) : (
              <>
                <ul className="space-y-1 text-sm text-neutral-800">
                  {Object.entries(pedido.gustos).map(([name, qty]) => (
                    <li key={name} className="flex justify-between"><span>{qty} × {name}</span></li>
                  ))}
                </ul>
                <p className="text-sm text-neutral-500">{pedido.pizzas} pizza{pedido.pizzas === 1 ? '' : 's'}</p>
              </>
            )}
            <p className="ct-readout text-2xl font-semibold text-neutral-900">{formatCurrency(pedido.total)}</p>
            <p className="text-xs text-neutral-500">*El precio final puede variar tras la confirmación.</p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BrutaPage;
