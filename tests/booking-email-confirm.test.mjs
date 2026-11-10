import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {renderBookingConfirmationEmail} from '../integrations/email/booking-confirmation-template.mjs';

const modal=readFileSync(new URL('../assets/booking-email-confirm-v1.js',import.meta.url),'utf8');
const booking=readFileSync(new URL('../_includes/v28/patch06-booking-real.html',import.meta.url),'utf8');
const form=readFileSync(new URL('../_includes/v28/part04.html',import.meta.url),'utf8');
const backend=readFileSync(new URL('../integrations/supabase/crm/functions/dr-olano-booking-otp/index.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../integrations/supabase/crm/migrations/20261110192000_reserva_dni_privado.sql',import.meta.url),'utf8');
const args={
  patientName:'Paciente de prueba',bookingCode:'DO-TEST1234',
  serviceName:'Evaluación médica',startsAt:'2026-11-18T19:00:00Z',
  manageUrl:'https://doctorolano.pe/gestionar-cita/?t=token_de_prueba',
};

test('Diseño móvil de correo: modal sombreado, editable y adaptación al teclado',()=>{
  new vm.Script(modal);
  new vm.Script(booking);
  assert.match(modal,/aria-modal="true"/);
  assert.match(modal,/type="email"/);
  assert.match(modal,/inputmode="email"/);
  assert.match(modal,/window\.visualViewport/);
  assert.match(modal,/requestAnimationFrame\(/);
  assert.match(modal,/backdrop-filter:blur/);
  assert.match(modal,/Correo electrónico del paciente/);
  assert.match(modal,/Aquí recibirás la confirmación de tu cita/);
  assert.match(modal,/Modificar y verificar correo/);
});
test('Cambio de correo invalida OTP y vuelve al paso de verificación',()=>{
  assert.match(booking,/await confirm\(emailField.value,bookingPromoPreview\(\)\)/);
  assert.match(booking,/if\(confirmed.changed\)/);
  assert.match(booking,/emailField\.dispatchEvent\(new Event\("input"/);
  assert.match(booking,/otp\.reset\?\.\(\)/);
  assert.match(booking,/go\(3\)/);
  assert.match(backend,/EMAIL_MISMATCH/);
  assert.match(backend,/verifiedPatient\.email/);
  assert.match(backend,/p_verified_email: verifiedEmail/);
});
test('La reserva mantiene un solo campo de nombres y apellidos y DNI de 8 dígitos',()=>{
  assert.match(form,/>Nombres y apellidos<\/label>/);
  assert.equal((form.match(/id="clientName"/g)||[]).length,1);
  assert.equal((form.match(/id="clientDni"/g)||[]).length,1);
  assert.match(booking,/getBookingDni\(\)/);
  assert.match(booking,/maskedBookingDni\(\)/);
  assert.match(backend,/INVALID_DNI/);
  assert.match(migration,/private\.dr_olano_booking_identity/);
});
test('Plantilla HTML: hora Perú, código de reserva y texto alternativo',()=>{
  const result=renderBookingConfirmationEmail(args);
  assert.match(result.subject,/DO-TEST1234/);
  assert.doesNotMatch(result.subject,/Evaluación médica/);
  assert.match(result.html,/DR\. OLANO/);
  assert.match(result.html,/DO-TEST1234/);
  assert.match(result.html,/2026|noviembre/i);
  assert.match(result.html,/hora de Perú/i);
  assert.match(result.text,/Paciente de prueba/);
  assert.match(result.html,/Ver o gestionar mi cita/);
});
test('Sin promoción verificada, el correo NUNCA inventa porcentajes',()=>{
  const none=renderBookingConfirmationEmail({...args,discount:{percent:50,verified:false}});
  assert.doesNotMatch(none.html,/50 % de descuento/);
  assert.doesNotMatch(none.text,/50 % de descuento/);
  assert.doesNotMatch(none.html,/Promoción validada/);
  const ten=renderBookingConfirmationEmail({...args,discount:{percent:10,verified:true}});
  assert.match(ten.html,/10 % de descuento/);
  assert.match(ten.text,/10 % de descuento/);
  const fifty=renderBookingConfirmationEmail({...args,discount:{percent:50,verified:true}});
  assert.match(fifty.html,/50 % de descuento/);
});
test('El nombre del paciente se escapa y no se inyecta JavaScript en el email',()=>{
  const output=renderBookingConfirmationEmail({
    ...args,patientName:'<img src=x onerror=alert(1)>',
    serviceName:'Tratamiento & <script>alert(1)</script>',
    manageUrl:'https://malicioso.invalid/phishing',
  });
  assert.doesNotMatch(output.html,/<script>|<img src=x/);
  assert.match(output.html,/&lt;img/);
  assert.match(output.html,/&lt;script&gt;/);
  assert.doesNotMatch(output.html,/malicioso.invalid/);
  assert.doesNotMatch(output.html,/<script/i);
});
test('La cola de confirmación solo contiene correo verificado y reclama descuentos canjeados',()=>{
  assert.match(migration,/dr_olano_booking_email_outbox/);
  assert.match(migration,/p_verified_email/);
  assert.match(migration,/claim\.status='redeemed'/);
  assert.match(migration,/claim\.redeemed_at is not null/);
  assert.match(migration,/grant execute on function public\.dr_olano_booking_email_claim/);
});
