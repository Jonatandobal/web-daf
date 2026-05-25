// Vercel Serverless Function
// Recibe el pedido desde App.jsx, lo guarda en Airtable y manda el email de confirmación

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'tblVtrGQ22DObyTkO';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'DAF Coffee Break <noreply@somosdaf.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'administracion@somosdaf.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const order = req.body;

  if (!order || !order.email || !order.eventDate) {
    return res.status(400).json({ error: 'Datos del pedido incompletos' });
  }

  try {
    // 1. Guardar en Airtable
    const airtableRecord = await saveToAirtable(order);

    // 2. Enviar email de confirmación al cliente
    await sendConfirmationEmail(order);

    // 3. Enviar notificación interna al admin
    await sendAdminNotification(order);

    return res.status(200).json({
      success: true,
      airtableId: airtableRecord.id,
    });
  } catch (error) {
    console.error('Error en send-confirmation:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function saveToAirtable(order) {
  // Formatear bocados como texto legible
  const bocadosText = order.selectedBocados && Object.keys(order.selectedBocados).length > 0
    ? Object.entries(order.selectedBocados)
        .filter(([, qty]) => qty > 0)
        .map(([name, qty]) => `${name}: ${qty}`)
        .join(' | ')
    : '';

  const totalBocados = order.selectedBocados
    ? Object.values(order.selectedBocados).reduce((a, b) => a + b, 0)
    : 0;

  let descripcion = `Servicio principal: ${order.packageName} | Precio por persona: $${order.packagePricePerAttendee?.toLocaleString('es-AR')}`;
  if (bocadosText) {
    descripcion += ` | Bocados: ${bocadosText} | Total bocados: ${totalBocados} unidades`;
  }

  const adicionalText = order.addons && order.addons.length > 0
    ? order.addons
        .map(a => `${a.name}: ${a.quantity} ($${a.price?.toLocaleString('es-AR')} c/u = $${(a.quantity * a.price)?.toLocaleString('es-AR')})`)
        .join('; ') + `; Precio total: $${order.totalPrice?.toLocaleString('es-AR')}`
    : `Precio total: $${order.totalPrice?.toLocaleString('es-AR')}`;

  const fields = {
    'Tipo de servicio': order.packageName,
    'Event ID': order.orderId || `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    'Nombre': order.name || 'N/A',
    'Ubicacion': order.eventLocation || 'N/A',
    'Email': order.email,
    'Fecha': order.eventDate,
    'Hora': order.eventTime,
    'PAX': order.attendees,
    'Descripcion de servicio': descripcion,
    'Adicional': adicionalText,
    'Estado del evento': 'Pendiente',
    'Observaciones': order.observations || '',
  };

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airtable error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function sendConfirmationEmail(order) {
  const bocadosHtml = order.selectedBocados && Object.keys(order.selectedBocados).length > 0
    ? `<ul style="margin:8px 0;padding-left:20px;">
        ${Object.entries(order.selectedBocados)
          .filter(([, qty]) => qty > 0)
          .map(([name, qty]) => `<li>${qty} x ${name}</li>`)
          .join('')}
       </ul>`
    : '';

  const addonsHtml = order.addons && order.addons.length > 0
    ? `<ul style="margin:8px 0;padding-left:20px;">
        ${order.addons.map(a => `<li>${a.quantity} x ${a.name} = $${(a.quantity * a.price).toLocaleString('es-AR')}</li>`).join('')}
       </ul>`
    : '<p style="color:#6b7280;">Sin extras adicionales.</p>';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

    <div style="background:#4f46e5; padding:32px 24px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px;">¡Pedido confirmado!</h1>
      <p style="color:#c7d2fe; margin:8px 0 0;">Coffee Break UDESA</p>
    </div>

    <div style="padding:32px 24px;">
      <p style="color:#374151; font-size:16px; margin:0 0 24px;">
        Hola <strong>${order.name || 'cliente'}</strong>, recibimos tu pedido correctamente.
        A continuación el resumen:
      </p>

      <div style="background:#f9fafb; border-radius:8px; padding:20px; margin-bottom:24px;">
        <h2 style="color:#4f46e5; font-size:16px; margin:0 0 16px; border-bottom:1px solid #e5e7eb; padding-bottom:8px;">
          Detalles del evento
        </h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="color:#6b7280; padding:4px 0; width:40%;">Fecha:</td><td style="color:#111827; font-weight:600;">${formatDisplayDate(order.eventDate)} a las ${order.eventTime}</td></tr>
          ${order.eventLocation && order.eventLocation !== 'N/A' ? `<tr><td style="color:#6b7280; padding:4px 0;">Lugar:</td><td style="color:#111827;">${order.eventLocation}</td></tr>` : ''}
          <tr><td style="color:#6b7280; padding:4px 0;">Asistentes:</td><td style="color:#111827; font-weight:600;">${order.attendees} personas</td></tr>
          <tr><td style="color:#6b7280; padding:4px 0;">Referencia:</td><td style="color:#111827; font-size:12px;">${order.orderId || 'N/A'}</td></tr>
        </table>
      </div>

      <div style="background:#f9fafb; border-radius:8px; padding:20px; margin-bottom:24px;">
        <h2 style="color:#4f46e5; font-size:16px; margin:0 0 12px; border-bottom:1px solid #e5e7eb; padding-bottom:8px;">
          Servicio contratado
        </h2>
        <p style="color:#111827; font-weight:600; margin:0 0 4px;">${order.packageName}</p>
        <p style="color:#6b7280; font-size:14px; margin:0 0 12px;">$${order.packagePricePerAttendee?.toLocaleString('es-AR')} por persona</p>
        ${bocadosHtml ? `<p style="color:#374151; font-weight:600; margin:12px 0 4px;">Bocados seleccionados:</p>${bocadosHtml}` : ''}
      </div>

      ${order.addons && order.addons.length > 0 ? `
      <div style="background:#f9fafb; border-radius:8px; padding:20px; margin-bottom:24px;">
        <h2 style="color:#4f46e5; font-size:16px; margin:0 0 12px; border-bottom:1px solid #e5e7eb; padding-bottom:8px;">
          Extras adicionales
        </h2>
        ${addonsHtml}
      </div>` : ''}

      ${order.observations ? `
      <div style="background:#fffbeb; border-left:4px solid #f59e0b; border-radius:4px; padding:16px; margin-bottom:24px;">
        <p style="color:#92400e; font-size:14px; margin:0;"><strong>Observaciones:</strong> ${order.observations}</p>
      </div>` : ''}

      <div style="background:#ecfdf5; border-radius:8px; padding:20px; text-align:center;">
        <p style="color:#065f46; font-size:14px; margin:0 0 8px;">Total estimado</p>
        <p style="color:#059669; font-size:32px; font-weight:800; margin:0;">$${order.totalPrice?.toLocaleString('es-AR')}</p>
        <p style="color:#6b7280; font-size:12px; margin:8px 0 0;">*El precio final puede variar tras la confirmación.</p>
      </div>
    </div>

    <div style="background:#f9fafb; padding:24px; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="color:#6b7280; font-size:13px; margin:0;">
        ¿Dudas o cambios? Respondé este email o contactanos a <a href="mailto:${ADMIN_EMAIL}" style="color:#4f46e5;">${ADMIN_EMAIL}</a>
      </p>
      <p style="color:#9ca3af; font-size:11px; margin:8px 0 0;">DAF — Dirección de Administración y Finanzas, UDESA</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: order.email,
    subject: `Confirmación de pedido — ${order.packageName} — ${formatDisplayDate(order.eventDate)}`,
    html,
  });
}

async function sendAdminNotification(order) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="font-family: Arial, sans-serif; padding:20px; background:#f3f4f6;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; padding:24px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color:#4f46e5; margin:0 0 16px;">Nuevo pedido recibido</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr style="background:#f9fafb;"><td style="padding:8px; color:#6b7280; width:35%;">Cliente:</td><td style="padding:8px; font-weight:600;">${order.name || 'N/A'} (${order.email})</td></tr>
      <tr><td style="padding:8px; color:#6b7280;">Fecha:</td><td style="padding:8px;">${formatDisplayDate(order.eventDate)} a las ${order.eventTime}</td></tr>
      ${order.eventLocation && order.eventLocation !== 'N/A' ? `<tr style="background:#f9fafb;"><td style="padding:8px; color:#6b7280;">Lugar:</td><td style="padding:8px;">${order.eventLocation}</td></tr>` : ''}
      <tr style="background:#f9fafb;"><td style="padding:8px; color:#6b7280;">Asistentes:</td><td style="padding:8px;">${order.attendees}</td></tr>
      <tr><td style="padding:8px; color:#6b7280;">Servicio:</td><td style="padding:8px; font-weight:600;">${order.packageName}</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:8px; color:#6b7280;">Total:</td><td style="padding:8px; font-weight:800; color:#059669; font-size:18px;">$${order.totalPrice?.toLocaleString('es-AR')}</td></tr>
      ${order.observations ? `<tr><td style="padding:8px; color:#6b7280;">Observaciones:</td><td style="padding:8px; color:#92400e;">${order.observations}</td></tr>` : ''}
    </table>
    <p style="color:#9ca3af; font-size:11px; margin:16px 0 0;">ID: ${order.orderId || 'N/A'}</p>
  </div>
</body>
</html>`;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[NUEVO PEDIDO] ${order.name || order.email} — ${formatDisplayDate(order.eventDate)} — $${order.totalPrice?.toLocaleString('es-AR')}`,
    html,
  });
}

async function sendEmail({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

function formatTime12h(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')}${period}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}
