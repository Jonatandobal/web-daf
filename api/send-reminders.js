// Vercel Serverless Function — ejecutada por Cron Job
// Busca en Airtable los eventos de mañana y manda recordatorios

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'tblVtrGQ22DObyTkO';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'DAF Coffee Break <noreply@somosdaf.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'administracion@somosdaf.com';
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Verificar autenticación del cron
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calcular "mañana" en Argentina (UTC-3)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const tomorrowDay = tomorrow.getUTCDate();
    const tomorrowMonth = tomorrow.getUTCMonth() + 1;
    const tomorrowYear = tomorrow.getUTCFullYear();

    console.log(`Buscando eventos del ${tomorrowDay}/${tomorrowMonth}/${tomorrowYear}`);

    // Obtener todos los registros pendientes sin recordatorio enviado
    const records = await getAirtableRecords();

    const eventsToRemind = records.filter(record => {
      const fields = record.fields;

      // Saltear si ya se envió el recordatorio 24hr
      if (fields['Recordatorio 24hr']) return false;

      // Saltear cancelados
      if (fields['Estado del evento'] === 'Cancelado') return false;

      // Parsear la fecha del campo "Fecha calendario" (ej: "2/12/2025 6:45pm")
      const fechaCalendario = fields['Fecha calendario'];
      if (!fechaCalendario) return false;

      const parsed = parseAirtableDate(fechaCalendario);
      if (!parsed) return false;

      return (
        parsed.day === tomorrowDay &&
        parsed.month === tomorrowMonth &&
        parsed.year === tomorrowYear
      );
    });

    console.log(`Encontrados ${eventsToRemind.length} eventos para mañana`);

    const results = [];

    for (const record of eventsToRemind) {
      const fields = record.fields;
      try {
        await sendReminderEmail(fields);
        await markReminderSent(record.id);
        results.push({ id: record.id, email: fields['Email'], status: 'sent' });
        console.log(`Recordatorio enviado a ${fields['Email']}`);
      } catch (err) {
        console.error(`Error enviando recordatorio para ${record.id}:`, err);
        results.push({ id: record.id, email: fields['Email'], status: 'error', error: err.message });
      }
    }

    return res.status(200).json({
      date: `${tomorrowDay}/${tomorrowMonth}/${tomorrowYear}`,
      processed: eventsToRemind.length,
      results,
    });

  } catch (error) {
    console.error('Error en send-reminders:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getAirtableRecords() {
  const allRecords = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`);
    url.searchParams.set('filterByFormula', `AND({Estado del evento} != "Cancelado", {Recordatorio 24hr} = "")`);
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Airtable fetch error: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  return allRecords;
}

async function markReminderSent(recordId) {
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Recordatorio 24hr': new Date().toISOString(),
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Airtable patch error: ${JSON.stringify(err)}`);
  }
}

async function sendReminderEmail(fields) {
  const clientEmail = fields['Email'];
  const nombre = fields['Nombre'] || 'cliente';
  const tipoServicio = fields['Tipo de servicio'] || '';
  const fechaCalendario = fields['Fecha calendario'] || '';
  const hora = fields['Hora'] || '';
  const ubicacion = fields['Ubicacion'] || '';
  const pax = fields['PAX'] || '';
  const descripcion = fields['Descripcion de servicio'] || '';
  const adicional = fields['Adicional'] || '';
  const observaciones = fields['Observaciones'] || '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

    <div style="background:#f59e0b; padding:32px 24px; text-align:center;">
      <p style="color:#78350f; font-size:32px; margin:0 0 8px;">⏰</p>
      <h1 style="color:white; margin:0; font-size:22px;">Recordatorio: tu evento es mañana</h1>
      <p style="color:#fef3c7; margin:8px 0 0; font-size:14px;">Coffee Break UDESA</p>
    </div>

    <div style="padding:32px 24px;">
      <p style="color:#374151; font-size:16px; margin:0 0 24px;">
        Hola <strong>${nombre}</strong>, te recordamos que mañana tenés programado un servicio de coffee break.
      </p>

      <div style="background:#fffbeb; border-radius:8px; padding:20px; margin-bottom:24px; border:1px solid #fde68a;">
        <h2 style="color:#92400e; font-size:16px; margin:0 0 16px; border-bottom:1px solid #fde68a; padding-bottom:8px;">
          Detalles del evento
        </h2>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="color:#6b7280; padding:6px 0; width:35%;">Fecha y hora:</td><td style="color:#111827; font-weight:600;">${fechaCalendario} — ${hora}hs</td></tr>
          ${ubicacion && ubicacion !== 'N/A' ? `<tr><td style="color:#6b7280; padding:6px 0;">Lugar:</td><td style="color:#111827;">${ubicacion}</td></tr>` : ''}
          <tr><td style="color:#6b7280; padding:6px 0;">Asistentes:</td><td style="color:#111827; font-weight:600;">${pax} personas</td></tr>
          <tr><td style="color:#6b7280; padding:6px 0;">Servicio:</td><td style="color:#111827; font-weight:600;">${tipoServicio}</td></tr>
        </table>
      </div>

      ${descripcion ? `
      <div style="background:#f9fafb; border-radius:8px; padding:16px; margin-bottom:24px;">
        <h3 style="color:#374151; font-size:14px; margin:0 0 8px;">Detalle del servicio:</h3>
        <p style="color:#6b7280; font-size:13px; margin:0; line-height:1.6;">${descripcion.replace(/\|/g, '<br>')}</p>
      </div>` : ''}

      ${adicional ? `
      <div style="background:#f9fafb; border-radius:8px; padding:16px; margin-bottom:24px;">
        <h3 style="color:#374151; font-size:14px; margin:0 0 8px;">Extras / Adicionales:</h3>
        <p style="color:#6b7280; font-size:13px; margin:0;">${adicional.replace(/;/g, '<br>')}</p>
      </div>` : ''}

      ${observaciones ? `
      <div style="background:#fff; border-left:4px solid #f59e0b; padding:16px; margin-bottom:24px; border-radius:4px;">
        <p style="color:#92400e; font-size:14px; margin:0;"><strong>Observaciones:</strong> ${observaciones}</p>
      </div>` : ''}

      <div style="background:#ecfdf5; border-radius:8px; padding:16px; text-align:center;">
        <p style="color:#065f46; font-size:14px; margin:0;">
          ¿Necesitás hacer algún cambio de último momento?<br>
          <strong>Contactanos a <a href="mailto:${ADMIN_EMAIL}" style="color:#059669;">${ADMIN_EMAIL}</a></strong>
        </p>
      </div>
    </div>

    <div style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:11px; margin:0;">DAF — Dirección de Administración y Finanzas, UDESA</p>
    </div>
  </div>
</body>
</html>`;

  // Email al cliente
  await sendEmail({
    to: clientEmail,
    subject: `Recordatorio: tu coffee break es mañana — ${fechaCalendario}`,
    html,
  });

  // Copia al admin
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[RECORDATORIO ENVIADO] ${nombre} (${clientEmail}) — ${fechaCalendario} ${hora}hs`,
    html: `<p>Se envió recordatorio automático a <strong>${clientEmail}</strong> para el evento del <strong>${fechaCalendario} a las ${hora}hs</strong>.<br>Servicio: ${tipoServicio} — ${pax} PAX — ${ubicacion}</p>`,
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

// Parsea "2/12/2025 6:45pm" → { day:2, month:12, year:2025 }
function parseAirtableDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return {
    day: parseInt(match[1]),
    month: parseInt(match[2]),
    year: parseInt(match[3]),
  };
}
