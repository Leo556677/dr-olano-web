// Web de reserva: OTP del MISMO Supabase Auth que usa APP PACIENTES.
// La sesión verificada vive solo en memoria y nunca se guarda en localStorage.
// El servidor de reservas DEBE revalidar el access token contra /auth/v1/user.


const BOOKING_API = 'https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-booking-otp';
const BOOKING_PUBLISHABLE_KEY = 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const AUTH_URL = 'https://pxccwrhtmwkwrzofuphj.supabase.co';
const AUTH_PUBLISHABLE_KEY = 'sb_publishable_kKxqpfyz6MwFPyIrDo7X6w_yWy-OkNb';
let authClient;
async function getPatientAuth() {
  if (authClient) return authClient;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.117.0');
  authClient = createClient(AUTH_URL, AUTH_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return authClient;
}

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
  const accept = byId('patient-otp-accept');
  if (accept) accept.disabled = true;
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
// No exportar credenciales a otros scripts de la web (analytics, publicidad, etc).
// El token solo entra en la solicitud HTTPS al backend al confirmar la reserva.
function getVerifiedIdentity() {
  if (!verified || normalized(byId('patient-booking-email')?.value) !== verified.email) return null;
  if (Date.now() >= verified.expiresAt - 60000) {
    verified = null;
    updateState('La verificación venció. Solicita un código nuevo.', true);
    return null;
  }
  return verified;
}

async function book(body) {
  const identity = getVerifiedIdentity();
  if (!identity) throw new Error('EMAIL_OTP_REQUIRED');
  if (!body || body.action !== 'book') throw new Error('INVALID_BOOKING_ACTION');
  const res = await fetch(BOOKING_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: BOOKING_PUBLISHABLE_KEY },
    body: JSON.stringify({
      ...body,
      app_access_token: identity.accessToken,
      verified_email: identity.email,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || data.code || 'No se pudo completar la operación');
    error.code = data.code || 'API_ERROR';
    error.status = res.status;
    throw error;
  }
  return data;
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
window.OLANO_PATIENT_OTP = {
  isEnabled: () => true, // Solo se carga cuando el flujo OTP está listo.
  isVerified: () => Boolean(getVerifiedIdentity()),
  book,
  focusVerification,
  reset,
};

function confirmForBooking() {
  const dialog = byId('patient-otp-dialog');
  if (!dialog || dialog.open) return Promise.resolve(false);
  dialog.returnValue = '';
  dialog.showModal();
  const field = byId('patient-booking-email');
  field.focus();
  field.select();
  const viewport = window.visualViewport;
  const resize = () => {
    if (!viewport) return;
    dialog.style.maxHeight = Math.max(100, viewport.height - 24) + 'px';
    dialog.style.top = (viewport.offsetTop + viewport.height / 2) + 'px';
  };
  resize();
  viewport?.addEventListener('resize', resize);
  viewport?.addEventListener('scroll', resize);
  return new Promise(resolve => dialog.addEventListener('close', () => {
    viewport?.removeEventListener('resize', resize);
    viewport?.removeEventListener('scroll', resize);
    resolve(dialog.returnValue === 'aceptar' && Boolean(getVerifiedIdentity()));
  }, { once: true }));
}
window.OLANO_PATIENT_OTP.confirmForBooking = confirmForBooking;

const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
const mailboxes = {
  gmail: { label: 'Gmail', web: 'https://mail.google.com/mail/u/0/', android: 'com.google.android.gm', ios: 'googlegmail://' },
  outlook: { label: 'Outlook', web: 'https://outlook.live.com/mail/', android: 'com.microsoft.office.outlook', ios: 'ms-outlook://emails' },
  yahoo: { label: 'Yahoo Mail', web: 'https://mail.yahoo.com/', android: 'com.yahoo.mobile.client.android.mail', ios: 'ymail://' },
};
function getMailbox(domain) {
  if (['gmail.com','googlemail.com'].includes(domain)) return mailboxes.gmail;
  if (['outlook.com','hotmail.com','live.com','msn.com'].includes(domain)) return mailboxes.outlook;
  if (['yahoo.com','yahoo.es','yahoo.com.mx','ymail.com'].includes(domain)) return mailboxes.yahoo;
  return null;
}
function inboxUrl(mailbox, agent) {
  if (/Android/i.test(agent)) {
    const destination = mailbox === mailboxes.outlook ? 'intent://emails/#Intent;scheme=ms-outlook' :
      mailbox.web.replace('https:', 'intent:') + '#Intent;scheme=https';
    return destination + ';package=' + mailbox.android + ';S.browser_fallback_url=' + encodeURIComponent(mailbox.web) + ';end';
  }
  return /iPhone|iPad|iPod/i.test(agent) ? mailbox.ios : mailbox.web;
}

function init() {
  const phone = byId('clientPhone');
  if (!phone || byId('patient-booking-email')) return;
  const phoneField = phone.closest('.field');
  if (!phoneField) return;
  const section = document.createElement('dialog');
  section.id = 'patient-otp-dialog';
  section.className = 'patient-email-otp';
  section.setAttribute('aria-label', 'Verificación de correo para ver la cita en la aplicación');
  section.innerHTML = `
    <h2>Verifica tu correo para solicitar tu cita</h2>
    <label for="patient-booking-email">Correo electrónico <span aria-hidden="true">*</span></label>
    <input id="patient-booking-email" type="email" autocomplete="email" inputmode="email"
      maxlength="254" spellcheck="false" placeholder="ejemplo@correo.com" required>
    <div id="patient-email-domains" hidden role="group" aria-label="Completar dominio del correo">
      ${domains.map(domain => '<button type="button" data-domain="' + domain + '">@' + domain + '</button>').join('')}
    </div>
    <p class="patient-email-hint">Te enviaremos un código a este correo. La cita se confirma cuando el consultorio valida tu adelanto.</p>
    <div class="patient-otp-actions">
      <button id="patient-email-otp-send" type="button">Enviar código</button>
    </div>
    <a id="patient-open-inbox" hidden target="_blank" rel="noopener noreferrer">Abrir mi correo</a>
    <a id="patient-web-inbox" hidden target="_blank" rel="noopener noreferrer">Usar correo web</a>
    <div class="patient-otp-verify">
      <input id="patient-email-otp-code" inputmode="numeric" pattern="[0-9]{6,10}"
        autocomplete="one-time-code" maxlength="10" placeholder="Código recibido"
        aria-label="Código de verificación">
      <button id="patient-email-otp-verify" type="button">Verificar</button>
    </div>
    <p id="patient-email-otp-status" role="status" aria-live="polite"></p>
    <button id="patient-otp-accept" type="button" disabled>Aceptar y continuar a WhatsApp</button>
    <button id="patient-otp-cancel" type="button">Cancelar</button>
  `;
  document.body.appendChild(section);
  const css = document.createElement('style');
  css.textContent = `
    .patient-email-otp:not([open]){display:none!important}
    .patient-email-otp::backdrop{background:rgba(0,26,43,.69);backdrop-filter:blur(5px)}
    .patient-email-otp{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 24px));box-sizing:border-box;overflow:auto;max-height:90dvh;margin:0;padding:14px;border:1px solid #d1e4e4;border-radius:16px;background:#f6fafa}
    .patient-email-otp>label{display:block;font-size:14px;font-weight:700;margin-bottom:8px;color:#123b47}
    .patient-email-otp>input,.patient-otp-verify input{box-sizing:border-box;width:100%;min-width:0;border:1px solid #b2d0d0;border-radius:10px;padding:11px 12px;background:white;color:#123b47;font:inherit}
    .patient-email-hint{font-size:12px;line-height:1.5;margin:8px 0 12px;color:#35545b}
    .patient-otp-actions,.patient-otp-verify{display:flex;gap:8px;align-items:center}
    .patient-otp-verify{margin-top:10px}
    .patient-email-otp button{border:0;border-radius:10px;padding:11px 12px;background:#166d72;color:white;font-weight:700;cursor:pointer;white-space:nowrap}
    .patient-email-otp button:disabled{opacity:.5;cursor:default}
    #patient-email-domains:not([hidden]){display:flex;gap:6px;overflow-x:auto;margin:6px 0;max-width:100%}
    #patient-email-domains button{flex:none;padding:7px 10px;background:#deefee;color:#164f54;font-size:13px}
    #patient-open-inbox:not([hidden]),#patient-web-inbox:not([hidden]){display:inline-block;padding:7px 4px;color:#155d57;font-weight:700}
    #patient-web-inbox:not([hidden]){font-weight:400;font-size:12px;margin-left:8px}
    #patient-email-otp-status{font-size:12px;margin:8px 0 0;min-height:17px;line-height:1.4}
    @media(max-width:380px){.patient-otp-verify{flex-wrap:wrap}.patient-otp-verify button{width:100%}}
  `;
  document.head.appendChild(css);

  const emailInput = byId('patient-booking-email');
  const codeInput = byId('patient-email-otp-code');
  const send = byId('patient-email-otp-send');
  const check = byId('patient-email-otp-verify');
  const inbox = byId('patient-open-inbox');
  const webInbox = byId('patient-web-inbox');
  const choices = byId('patient-email-domains');
  const buttons = Array.from(choices.querySelectorAll('button'));
  choices.onclick = event => {
    const domain = event.target.dataset.domain;
    if (!domains.includes(domain)) return;
    emailInput.value = emailInput.value.trim().split('@')[0] + '@' + domain;
    emailInput.dispatchEvent(new Event('input'));
    emailInput.focus();
  };
  const accept = byId('patient-otp-accept');
  accept.onclick = () => { if (getVerifiedIdentity()) section.close('aceptar'); };
  byId('patient-otp-cancel').onclick = () => section.close();
  emailInput.addEventListener('input', () => {
    requestedEmail = '';
    inbox.hidden = true;
    webInbox.hidden = true;
    const [local, suffix = '', extra] = normalized(emailInput.value).split('@');
    for (const button of buttons) {
      button.hidden = !local || /\s/.test(local) || extra !== undefined ||
        !button.dataset.domain.startsWith(suffix) || button.dataset.domain === suffix;
    }
    choices.hidden = buttons.every(button => button.hidden);
    accept.disabled = true;
    clearVerification();
  });

  send.addEventListener('click', async () => {
    const email = normalized(emailInput.value);
    if (!EMAIL.test(email) || email.length > 254) {
      updateState('Ingresa un correo electrónico válido.', true);
      return;
    }
    if (busy) return;
    if (Date.now() < nextRequestAt) {
      updateState('Espera ' + Math.ceil((nextRequestAt - Date.now()) / 1000) + ' segundos para solicitar otro código.');
      return;
    }
    choices.hidden = true;
    codeInput.focus();
    busy = true;
    send.disabled = true;
    check.disabled = true;
    verified = null;
    accept.disabled = true;
    requestedEmail = '';
    updateState('Enviando código de verificación…');
    try {
      const { error } = await (await getPatientAuth()).auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      if (normalized(emailInput.value) !== email) return;
      requestedEmail = email;
      const mailbox = getMailbox(email.split('@')[1]);
      inbox.hidden = !mailbox;
      if (mailbox) {
        inbox.href = inboxUrl(mailbox, navigator.userAgent);
        inbox.textContent = 'Abrir ' + mailbox.label;
        webInbox.href = mailbox.web;
        webInbox.hidden = inbox.href === mailbox.web;
      }
      nextRequestAt = Date.now() + 60000;
      updateState('Revisa tu correo e ingresa el código recibido.');
      if (section.open && document.activeElement === codeInput) codeInput.scrollIntoView({block:'nearest'});
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
    if (!requestedEmail || email !== requestedEmail || !/^\d{6,10}$/.test(token)) {
      updateState('Solicita primero el código y escribe los dígitos recibidos.', true);
      return;
    }
    if (busy) return;
    busy = true;
    send.disabled = true;
    check.disabled = true;
    updateState('Validando código…');
    try {
      const { data, error } = await (await getPatientAuth()).auth.verifyOtp({ email, token, type: 'email' });
      if (error || !data?.session?.access_token || normalized(data.user?.email) !== email) throw error || Error();
      verified = {
        email,
        accessToken: data.session.access_token,
        expiresAt: Number(data.session.expires_at || 0) * 1000,
      };
      codeInput.value = '';
      if (!getVerifiedIdentity()) throw Error('EXPIRED');
      accept.disabled = false;
      updateState('Correo verificado. Ya puedes continuar a WhatsApp.');
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
