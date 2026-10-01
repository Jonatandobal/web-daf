// Vercel Serverless Function — pedido del portal de BRUTA (/bruta).
// El pedido ya lo guardó el navegador en Firebase; acá sólo se avisa por mail:
// confirmación al cliente (con lo que pidió y el total) y aviso a DAF.
//
// Se verifica el token de Firebase del que pide: la confirmación sólo sale a la
// dirección de ESA cuenta, nunca a una que mande el navegador (si no, el
// endpoint serviría para mandar mails a cualquiera).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'DAF <noreply@somosdaf.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'administracion@somosdaf.com';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

function fecha(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const order = req.body || {};
    const email = await emailDelToken(order.idToken);
    if (!email) return res.status(401).json({ error: 'Sesión inválida' });

    const items = Array.isArray(order.items) ? order.items : [];
    if (!order.orderNumber || !order.deliveryDate || items.length === 0) {
      return res.status(400).json({ error: 'Pedido incompleto' });
    }

    await sendEmail({ to: email, subject: `Pedido ${order.orderNumber} recibido — BRUTA`, html: htmlCliente(order, items) });
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[BRUTA] Pedido ${order.orderNumber} — entrega ${fecha(order.deliveryDate)} — ${money(order.totalPrice)}`,
      html: htmlAdmin(order, items, email),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en send-bruta:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Devuelve el email de la cuenta dueña del token, o null si el token no sirve.
async function emailDelToken(idToken) {
  if (!idToken || !FIREBASE_API_KEY) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.users?.[0]?.email ?? null;
}

const filas = (items) =>
  items
    .map((i) => `<tr><td style="padding:6px 0;">${esc(i.qty)} × ${esc(i.name)}</td><td style="padding:6px 0;text-align:right;">${money(i.subtotal)}</td></tr>`)
    .join('');

function htmlCliente(order, items) {
  return `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#171717;padding:24px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;">Pedido recibido</h1><p style="color:#a3a3a3;margin:6px 0 0;">BRUTA</p></div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#374151;">Recibimos tu pedido <strong>${esc(order.orderNumber)}</strong>.</p>
      <p style="margin:0 0 16px;color:#374151;">Pedido: ${esc(fecha(order.orderDate))} · Entrega: <strong>${esc(fecha(order.deliveryDate))}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:15px;border-top:1px solid #e5e7eb;">${filas(items)}
        <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;font-weight:700;">Total (${esc(order.totalUnits)} pizzas)</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${money(order.totalPrice)}</td></tr>
      </table>
      ${order.observations ? `<p style="margin:16px 0 0;color:#92400e;font-size:14px;"><strong>Observaciones:</strong> ${esc(order.observations)}</p>` : ''}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;color:#6b7280;font-size:12px;">Dudas o cambios: <a href="mailto:${esc(ADMIN_EMAIL)}">${esc(ADMIN_EMAIL)}</a></div>
  </div></body></html>`;
}

function htmlAdmin(order, items, email) {
  return `<!DOCTYPE html><html lang="es"><body style="font-family:Arial,sans-serif;padding:20px;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
    <h2 style="margin:0 0 12px;">Nuevo pedido de BRUTA</h2>
    <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${esc(email)}</p>
    <p style="margin:0 0 4px;"><strong>Nº de orden:</strong> ${esc(order.orderNumber)}</p>
    <p style="margin:0 0 12px;"><strong>Entrega:</strong> ${esc(fecha(order.deliveryDate))} (pedido el ${esc(fecha(order.orderDate))})</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${filas(items)}
      <tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;font-weight:700;">Total (${esc(order.totalUnits)})</td><td style="padding:8px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${money(order.totalPrice)}</td></tr>
    </table>
    ${order.observations ? `<p style="color:#92400e;"><strong>Observaciones:</strong> ${esc(order.observations)}</p>` : ''}
    <p style="color:#9ca3af;font-size:11px;">ID: ${esc(order.orderId)}</p>
  </div></body></html>`;
}

async function sendEmail({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!response.ok) throw new Error(`Resend error: ${JSON.stringify(await response.json())}`);
  return response.json();
}
