// Web de reserva: OTP del MISMO Supabase Auth que usa APP PACIENTES.
// La sesión verificada vive solo en memoria y nunca se guarda en localStorage.
// El servidor de reservas DEBE revalidar el access token contra /auth/v1/user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.0';

const AUTH_URL = 'https://pxccwrhtmwkwrzofuphj.supabase.co';
const AUTH_PUBLISHABLE_KEY = 'sb_publishable_kKxqpfyz6MwFPyIrDo7X6w_yWy-OkNb';
const patientAuth = createClient(AUTH_URL, AUTH_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let verified = null;
let requestedEmail = '';
let busy = false;
let nextRequestAt = 0;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalized = value => String(value || '').trim().toLowerCase();
const byId = id => document.getElementById(id);
const errorText = 'No pudimos validar el correo. Revisa los datos e inténtalo de nuevo.';

function clearVerification() {
  verified = null;
  byId('patient-email-otp-code')?.setAttribute('value', '');
  const code = byId('patient-email-otp-code');
  if (code) code.value = '';
  updateState('');
}
function updateState(message, isError = false) {
  const status = byId('patient-email-otp-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#8e2835' : '#155d57';
}
function getVerifiedIdentity() {
  if (!verified || normalized(byId('patient-booking-email')?.value) !== verified.email) return null;
  if (Date.now() >= verified.expiresAt - 60000) {
    verified = null;
    updateState('La verificación venció. Solicita un código nuevo.', true);
    return null;
  }
  return { accessToken: verified.accessToken, email: verified.email };
}
function focusVerification() {
  byId('patient-booking-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  byId('patient-booking-email')?.focus();
}
function reset() {
  clearVerification();
  requestedEmail = '';
  updateState('');
}
window.OLANO_PATIENT_OTP = { getVerifiedIdentity, focusVerification, reset };

function init() {
  const phone = byId('clientPhone');
  if (!phone || byId('patient-booking-email')) return;
  const phoneField = phone.closest('.field');
  if (!phoneField) return;
  const section = document.createElement('section');
  section.className = 'patient-email-otp';
  section.setAttribute('aria-label', 'Verificación de correo para ver la cita en la aplicación');
  section.innerHTML = `
    <label for="patient-booking-email">Correo electrónico <span aria-hidden="true">*</span></label>
    <input id="patient-booking-email" type="email" autocomplete="email" inputmode="email"
      maxlength="254" spellcheck="false" placeholder="ejemplo@correo.com" required>
    <p class="patient-email-hint">Te enviaremos un código a este correo. Utiliza el mismo correo en la aplicación del Dr. Olano para ver tu cita.</p>
    <div class="patient-otp-actions">
      <button id="patient-email-otp-send" type="button">Enviar código</button>
    </div>
    <div class="patient-otp-verify">
      <input id="patient-email-otp-code" inputmode="numeric" pattern="[0-9]{8}"
        autocomplete="one-time-code" maxlength="8" placeholder="Código de 8 dígitos"
        aria-label="Código de verificación">
      <button id="patient-email-otp-verify" type="button">Verificar</button>
    </div>
    <p id="patient-email-otp-status" role="status" aria-live="polite"></p>
  `;
  phoneField.insertAdjacentElement('afterend', section);
  const css = document.createElement('style');
  css.textContent = `
    .patient-email-otp{margin:12px 0;padding:14px;border:1px solid #d1e4e4;border-radius:16px;background:#f6fafa}
    .patient-email-otp>label{display:block;font-size:14px;font-weight:700;margin-bottom:8px;color:#123b47}
    .patient-email-otp>input,.patient-otp-verify input{box-sizing:border-box;width:100%;min-width:0;border:1px solid #b2d0d0;border-radius:10px;padding:11px 12px;background:white;color:#123b47;font:inherit}
    .patient-email-hint{font-size:12px;line-height:1.5;margin:8px 0 12px;color:#35545b}
    .patient-otp-actions,.patient-otp-verify{display:flex;gap:8px;align-items:center}
    .patient-otp-verify{margin-top:10px}
    .patient-email-otp button{border:0;border-radius:10px;padding:11px 12px;background:#166d72;color:white;font-weight:700;cursor:pointer;white-space:nowrap}
    .patient-email-otp button:disabled{opacity:.5;cursor:default}
    #patient-email-otp-status{font-size:12px;margin:8px 0 0;min-height:17px;line-height:1.4}
    @media(max-width:380px){.patient-otp-verify{flex-wrap:wrap}.patient-otp-verify button{width:100%}}
  `;
  document.head.appendChild(css);

  const emailInput = byId('patient-booking-email');
  const codeInput = byId('patient-email-otp-code');
  const send = byId('patient-email-otp-send');
  const check = byId('patient-email-otp-verify');
  emailInput.addEventListener('input', clearVerification);

  send.addEventListener('click', async () => {
    const email = normalized(emailInput.value);
    if (!EMAIL.test(email) || email.length > 254) {
      updateState('Ingresa un correo electrónico válido.', true);
      return;
    }
    if (busy || Date.now() < nextRequestAt) return;
    busy = true;
    send.disabled = true;
    check.disabled = true;
    verified = null;
    requestedEmail = '';
    updateState('Enviando código de verificación…');
    try {
      const { error } = await patientAuth.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      requestedEmail = email;
      nextRequestAt = Date.now() + 60000;
      updateState('Revisa tu correo e ingresa el código de 8 dígitos.');
      codeInput.focus();
    } catch {
      updateState('No pudimos enviar el código. Vuelve a intentarlo.', true);
    } finally {
      busy = false;
      send.disabled = false;
      check.disabled = false;
    }
  });

  check.addEventListener('click', async () => {
    const email = normalized(emailInput.value);
    const token = codeInput.value.trim().replace(/\s/g, '');
    if (!requestedEmail || email !== requestedEmail || !/^\d{8}$/.test(token)) {
      updateState('Solicita primero el código y escribe sus 8 dígitos.', true);
      return;
    }
    if (busy) return;
    busy = true;
    send.disabled = true;
    check.disabled = true;
    updateState('Validando código…');
    try {
      const { data, error } = await patientAuth.auth.verifyOtp({ email, token, type: 'email' });
      if (error || !data?.session?.access_token || normalized(data.user?.email) !== email) throw error || Error();
      verified = {
        email,
        accessToken: data.session.access_token,
        expiresAt: Number(data.session.expires_at || 0) * 1000,
      };
      codeInput.value = '';
      if (!getVerifiedIdentity()) throw Error('EXPIRED');
      updateState('Correo verificado. Tu cita podrá aparecer en la aplicación.');
    } catch {
      verified = null;
      updateState(errorText, true);
    } finally {
      busy = false;
      send.disabled = false;
      check.disabled = false;
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

window.addEventListener('pagehide', () => { verified = null; });
