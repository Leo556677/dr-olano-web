import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/booking-email-otp-v1.js', import.meta.url), 'utf8')
  .replace(/^import \{ createClient \} from .*;\r?\n/m, '');
const bookingPatch = readFileSync(new URL('../_includes/v28/patch06-booking-real.html', import.meta.url), 'utf8');
const server = readFileSync(new URL('../integrations/supabase/crm/functions/dr-olano-booking-otp/index.ts', import.meta.url), 'utf8');
const whatsAppTemplate = readFileSync(new URL('../assets/whatsapp-template-v8.js', import.meta.url), 'utf8');

function element(value = '') {
  const events = new Map();
  return {
    value, disabled: false, textContent: '', style: {},
    events, addEventListener: (type, callback) => events.set(type, callback),
    setAttribute() {}, scrollIntoView() {}, focus() {},
  };
}

function harness({ userEmail = 'paciente@ejemplo.pe', rejected = false } = {}) {
  const fields = new Map();
  const email = element('  Paciente@Ejemplo.Pe ');
  const code = element();
  const send = element();
  const verify = element();
  const status = element();
  fields.set('patient-booking-email', email);
  fields.set('patient-email-otp-code', code);
  fields.set('patient-email-otp-send', send);
  fields.set('patient-email-otp-verify', verify);
  fields.set('patient-email-otp-status', status);

  let mounted = false;
  const fieldContainer = { insertAdjacentElement: () => { mounted = true; } };
  const phone = element();
  phone.closest = () => fieldContainer;
  fields.set('clientPhone', phone);

  const document = {
    readyState: 'complete',
    head: { appendChild() {} },
    createElement: () => ({ setAttribute() {}, innerHTML: '', textContent: '' }),
    getElementById: id => {
      if (id === 'patient-booking-email' && !mounted) return null;
      return fields.get(id) ?? null;
    },
  };
  const windowEvents = new Map();
  const window = { addEventListener: (name, callback) => windowEvents.set(name, callback) };
  const otpCalls = [];
  const fetchCalls = [];
  const fakeFetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return { ok: true, status: 201, json: async () => ({ ok: true, booking: { id: 'test-reserva' } }) };
  };
  const auth = {
    signInWithOtp: async args => {
      otpCalls.push({ action: 'request', args });
      return { error: rejected ? Error('MAILER_UNAVAILABLE') : null };
    },
    verifyOtp: async args => {
      otpCalls.push({ action: 'verify', args });
      return {
        error: rejected ? Error('INVALID_OTP') : null,
        data: {
          user: { email: userEmail },
          session: {
            access_token: 'test-bearer-not-secret',
            expires_at: Math.floor(Date.now()/1000) + 3600,
          },
        },
      };
    },
  };

  vm.runInNewContext(source, {
    document, window, console,
    setTimeout, clearTimeout,
    createClient: () => ({ auth }),
    fetch: fakeFetch,
  }, { filename: 'booking-email-otp-v1.js', timeout: 1000 });

  return { email, code, send, verify, status, otpCalls, fetchCalls, window,
    windowEvents, identity: window.OLANO_PATIENT_OTP };
}

test('El módulo OTP y el parche de reserva son JS sintácticamente válidos', () => {
  new vm.Script(source);
  new vm.Script(bookingPatch);
});

test('Nunca valida por escribir email; exige OTP de Auth de la APP', async () => {
  const h = harness();
  assert.equal(h.identity.isVerified(), false);
  await h.send.events.get('click')();
  assert.equal(h.otpCalls.length, 1);
  assert.equal(h.otpCalls[0].args.email, 'paciente@ejemplo.pe');
  assert.equal(h.otpCalls[0].args.options.shouldCreateUser, true);
  h.code.value = '123';
  await h.verify.events.get('click')();
  assert.equal(h.otpCalls.length, 1, 'Nunca llama verifyOtp con código inválido');
  assert.equal(h.identity.isVerified(), false);
  h.code.value = '12345678';
  await h.verify.events.get('click')();
  assert.equal(h.otpCalls[1].args.type, 'email');
  assert.equal(h.identity.isVerified(), true);
  assert.equal(Object.hasOwn(h.identity, 'getVerifiedIdentity'), false, 'Nunca exportar bearer a analytics');
  await h.identity.book({ action: 'book', service_code: 'consulta' });
  assert.equal(h.fetchCalls.length, 1);
  assert.equal(h.fetchCalls[0].url,
    'https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-booking-otp');
  assert.equal(JSON.parse(h.fetchCalls[0].init.body).app_access_token, 'test-bearer-not-secret');
  assert.equal(h.code.value, '', 'No conserva el código OTP tras comprobarlo');
});

test('El OTP no puede verificar otro correo distinto', async () => {
  const h = harness({ userEmail: 'otra@ejemplo.pe' });
  await h.send.events.get('click')();
  h.code.value = '12345678';
  await h.verify.events.get('click')();
  assert.equal(h.identity.isVerified(), false);
});

test('La verificación se invalida al cambiar el correo y al cerrar la página', async () => {
  const h = harness();
  await h.send.events.get('click')();
  h.code.value = '12345678';
  await h.verify.events.get('click')();
  assert.equal(h.identity.isVerified(), true);
  h.email.value = 'nuevo@ejemplo.pe';
  h.email.events.get('input')();
  assert.equal(h.identity.isVerified(), false);
  h.windowEvents.get('pagehide')();
  assert.equal(h.identity.isVerified(), false);
});

test('Un error de proveedor no puede autorizar una reserva', async () => {
  const h = harness({ rejected: true });
  await h.send.events.get('click')();
  h.code.value = '12345678';
  await h.verify.events.get('click')();
  assert.equal(h.identity.isVerified(), false);
});

test('El backend exige identidad validada antes de ejecutar la reserva transaccional', () => {
  assert.match(server, /verifyPatientAppToken\(String\(body\?\.app_access_token/);
  assert.match(server, /"\/auth\/v1\/user"/);
  assert.match(server, /user\?\.email_confirmed_at/);
  assert.match(server, /"EMAIL_OTP_REQUIRED"/);
  assert.match(server, /"crear_cita_web_segura_v4"/);
  assert.match(bookingPatch, /otp\.book\(\{action:"book"/);
  assert.doesNotMatch(bookingPatch, /app_access_token:/, 'El token no sale del módulo OTP');
  assert.doesNotMatch(source, /OLANO_PATIENT_OTP = \{ getVerifiedIdentity/,
    'La API global no permite extraer el token');
    assert.doesNotMatch(bookingPatch, /localStorage\.setItem\([^\n]*app_access_token/);
});


test('un paciente puede terminar reserva sin abrir WhatsApp ni esperar su WABA', () => {
  new vm.Script(whatsAppTemplate);
  assert.doesNotMatch(bookingPatch, /window\.__olanoWaGo\(waUrl,1\)/);
  assert.doesNotMatch(whatsAppTemplate, /apply\(true\)/);
  assert.match(whatsAppTemplate, /apply\(false\)/);
  assert.match(whatsAppTemplate, /document\.addEventListener\('click'/);
});
