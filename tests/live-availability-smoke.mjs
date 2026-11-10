import test from 'node:test';
import assert from 'node:assert/strict';

const API = 'https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1';
const PUBLISHABLE = 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const preview = 'https://49aa77b8.dr-olano-web.pages.dev';
const official = 'https://doctorolano.pe';
const sample = { action:'availability', service_code:'botox', date:'2026-11-13' };

async function checkAvailability(endpoint, origin) {
  const response = await fetch(`${API}/${endpoint}`,{
    method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json',apikey:PUBLISHABLE},
    body:JSON.stringify(sample),
    signal:AbortSignal.timeout(16000),
  });
  const data = await response.json().catch(()=>({code:'INVALID_JSON'}));
  // El gateway de Supabase puede responder con '*' para endpoints sin cookies.
  // Un navegador acepta '*' con credentials:omit; el backend además valida Origin.
  const allowed = response.headers.get('access-control-allow-origin');
  assert.ok(allowed === '*' || allowed === origin,
    `CORS bloquea el origen: ${origin}, ACAO=${allowed}`);
  assert.equal(response.status,200,`${endpoint}: ${data.code || response.status}`);
  assert.equal(data.ok,true);
  assert.ok(Array.isArray(data.slots));
  for(const slot of data.slots){
    assert.match(slot.time,/^\d{2}:\d{2}$/);
  }
  console.log(`${endpoint}: HTTP 200, fecha=2026-11-13, slots=${data.slots.length}`);
}

test('El origen de la vista previa es aceptado en preflight CORS',async()=>{
  const response=await fetch(`${API}/dr-olano-booking-otp`,{
    method:'OPTIONS',
    headers:{Origin:preview,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,apikey'},
    signal:AbortSignal.timeout(12000),
  });
  assert.equal(response.status,204);
  const allowed=response.headers.get('access-control-allow-origin');
  assert.ok(allowed==='*' || allowed===preview);
});
test('La vista previa puede consultar horarios reales sin crear citas',async()=>{
  await checkAvailability('dr-olano-booking-otp',preview);
});
test('El dominio oficial conserva la consulta histórica',async()=>{
  await checkAvailability('dr-olano-booking',official);
});
test('Una vista previa no puede modificar ni crear reservas',async()=>{
  const response=await fetch(`${API}/dr-olano-booking-otp`,{
    method:'POST',
    headers:{Origin:preview,'Content-Type':'application/json',apikey:PUBLISHABLE},
    body:JSON.stringify({action:'manage_get'}),
    signal:AbortSignal.timeout(12000),
  });
  const data=await response.json();
  assert.equal(response.status,403);
  assert.equal(data.code,'PREVIEW_READ_ONLY');
});


test('El flujo OTP permanece desactivado hasta configurar un correo real', async () => {
  const response=await fetch(`${API}/dr-olano-booking-otp`,{
    method:'GET',headers:{Origin:official,apikey:PUBLISHABLE},signal:AbortSignal.timeout(12000)
  });
  const data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.otp_enabled,false);
});
test('El endpoint OTP no crea una cita si el proveedor no está habilitado', async () => {
  const response=await fetch(`${API}/dr-olano-booking-otp`,{
    method:'POST',
    headers:{Origin:official,'Content-Type':'application/json',apikey:PUBLISHABLE},
    body:JSON.stringify({action:'book',service_code:'botox',date:'2026-11-13',time:'09:00'}),
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json();
  assert.equal(response.status,503);
  assert.equal(data.code,'OTP_BOOKING_NOT_READY');
});
