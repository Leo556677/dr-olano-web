/**
 * Correo transaccional Dr. Olano. HTML + CSS compatible con clientes de correo.
 * NO incluir JavaScript en emails: los proveedores lo bloquean por seguridad.
 * El descuento solo aparece si el servidor verificó una promoción VINCULADA a la cita.
 */
const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])
);

function safeManageUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw));
    return url.protocol === 'https:' && url.hostname === 'doctorolano.pe' &&
      url.pathname.startsWith('/gestionar-cita') ? url.href : null;
  } catch { return null; }
}

function dateInLima(iso) {
  const timestamp = new Date(iso);
  if (Number.isNaN(timestamp.getTime())) throw new Error('INVALID_START_TIME');
  const date = new Intl.DateTimeFormat('es-PE',{
    timeZone:'America/Lima',dateStyle:'full'
  }).format(timestamp);
  const time = new Intl.DateTimeFormat('es-PE',{
    timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:true
  }).format(timestamp);
  return { date, time };
}

function discountPercent(input) {
  // 'verified' SOLO puede proceder del servidor después de consultar la reserva.
  if (input?.verified !== true) return null;
  const value = Number(input.percent);
  return Number.isInteger(value) && value > 0 && value <= 100 ? value : null;
}

export function renderBookingConfirmationEmail({
  patientName,bookingCode,serviceName,startsAt,manageUrl,
  discount = null
}) {
  if (!patientName || !bookingCode || !serviceName) throw new Error('INVALID_BOOKING_EMAIL');
  const {date,time} = dateInLima(startsAt);
  const percent = discountPercent(discount);
  const manage = safeManageUrl(manageUrl);
  const subject = 'Dr. Olano | Confirmación de tu cita | ' + String(bookingCode);
  const nameSafe = htmlEscape(patientName);
  const codeSafe = htmlEscape(bookingCode);
  const serviceSafe = htmlEscape(serviceName);
  const dateSafe = htmlEscape(date);
  const timeSafe = htmlEscape(time);
  const promoHtml = percent == null ? '' : [
    '<tr><td style="padding:0 28px 18px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6f8f3;border:1px solid #b5e2d3;border-radius:14px">',
    '<tr><td style="padding:18px 20px;color:#0b6259">',
    '<div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Promoción validada</div>',
    '<div style="font-size:30px;font-weight:800;margin:4px 0">',String(percent),' % de descuento</div>',
    '<div style="font-size:13px;line-height:1.55">Beneficio asociado a esta reserva. El importe final y la aplicación del descuento dependen de la evaluación médica y de los términos de la promoción.</div>',
    '</td></tr></table></td></tr>'
  ].join('');
  const action = manage ?
    '<tr><td align="center" style="padding:4px 28px 24px"><a href="' +
    htmlEscape(manage) +
    '" style="display:inline-block;padding:14px 26px;background:#087f79;color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700">Ver o gestionar mi cita</a></td></tr>' : '';
  const subjectSafe = htmlEscape(subject);
  const html = [
    '<!doctype html><html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<title>',subjectSafe,'</title>',
    '<style>@media only screen and (max-width:540px){.booking-shell{width:100%!important}.booking-pad{padding:24px 18px!important}}</style>',
    '</head><body style="margin:0;padding:0;background-color:#edf4f4;color:#19364b;font-family:Arial,Helvetica,sans-serif">',
    '<div style="display:none;font-size:1px;color:#edf4f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">',
    'Tu cita con el Dr. Olano quedó registrada. Revisa la fecha y la hora.',
    '</div>',
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#edf4f4;padding:28px 10px">',
    '<tr><td align="center">',
    '<table class="booking-shell" role="presentation" cellspacing="0" cellpadding="0" width="520" style="width:520px;max-width:100%;border:1px solid #d4e3e5;border-radius:18px;overflow:hidden;background:#fff">',
    '<tr><td class="booking-pad" style="padding:30px 28px;background:#0b3650;color:#fff">',
    '<div style="font-size:22px;font-weight:800;letter-spacing:.2px">DR. OLANO</div>',
    '<div style="margin-top:5px;color:#b7e7df;font-size:12px;letter-spacing:1px">ATENCIÓN MÉDICA Y ESTÉTICA</div>',
    '</td></tr>',
    '<tr><td class="booking-pad" style="padding:28px 28px 18px">',
    '<div style="display:inline-block;background:#e2f6f0;color:#0c6c61;border-radius:999px;padding:7px 12px;font-weight:700;font-size:12px">✓ CITA REGISTRADA</div>',
    '<h1 style="font-size:25px;line-height:1.2;margin:18px 0 10px;color:#0b3049">Tu cita está confirmada</h1>',
    '<p style="font-size:15px;line-height:1.65;color:#3e5a62;margin:0">Hola, <strong>',nameSafe,
    '</strong>. Hemos registrado tu cita. Conserva este correo como comprobante de los datos de la reserva.</p>',
    '</td></tr>',
    '<tr><td style="padding:4px 28px 22px">',
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #d9e6e7;border-radius:12px;overflow:hidden">',
    '<tr><td style="padding:13px 16px;background:#f5faf9;color:#62777d;font-size:12px">CÓDIGO DE RESERVA</td></tr>',
    '<tr><td style="padding:2px 16px 15px;background:#f5faf9;color:#0a3850;font-size:21px;font-weight:800">',codeSafe,'</td></tr>',
    '<tr><td style="border-top:1px solid #dce9e9;padding:12px 16px;font-size:14px;color:#19364b"><strong>Fecha:</strong> ',dateSafe,'</td></tr>',
    '<tr><td style="border-top:1px solid #dce9e9;padding:12px 16px;font-size:14px;color:#19364b"><strong>Hora:</strong> ',timeSafe,' (hora de Perú)</td></tr>',
    '<tr><td style="border-top:1px solid #dce9e9;padding:12px 16px;font-size:14px;color:#19364b"><strong>Servicio:</strong> ',serviceSafe,'</td></tr>',
    '</table></td></tr>',
    promoHtml,
    action,
    '<tr><td style="padding:20px 28px;background:#f5faf9;border-top:1px solid #dce9e9">',
    '<p style="margin:0 0 9px;font-size:13px;line-height:1.6;color:#3d5d64">',
    'Para consultar tus citas en la aplicación del Dr. Olano, inicia sesión con <strong>el mismo correo verificado</strong> que utilizaste al reservar.</p>',
    '<p style="margin:0;font-size:12px;line-height:1.6;color:#587078">',
    'Este mensaje se envía por una reserva realizada en doctorolano.pe. No compartas códigos de inicio de sesión ni enlaces privados de gestión. ',
    'No respondas con información médica sensible a este correo.</p>',
    '</td></tr></table>',
    '<div style="max-width:520px;padding:16px;font-size:11px;line-height:1.5;color:#60777f;text-align:center">',
    '© Dr. Olano · Confirmación de reserva · doctorolano.pe',
    '</div></td></tr></table></body></html>'
  ].join('');
  const lines = [
    'DR. OLANO | CONFIRMACIÓN DE CITA',
    '',
    'Hola, ' + String(patientName).trim() + '.',
    'Tu cita quedó registrada.',
    'Código: ' + String(bookingCode),
    'Fecha: ' + date,
    'Hora: ' + time + ' (Perú)',
    'Servicio: ' + String(serviceName)
  ];
  if (percent != null) lines.push('Promoción validada: ' + String(percent) + ' % de descuento. Sujeta a evaluación médica y condiciones.');
  if (manage) lines.push('Gestionar cita: ' + manage);
  lines.push('', 'Entra a la app con tu mismo correo verificado.', 'Dr. Olano · doctorolano.pe');
  return {subject, html, text:lines.join('\n')};
}
