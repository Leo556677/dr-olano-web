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
  assert.equal(response.headers.get('access-control-allow-origin'),origin,
    `CORS bloquea el origen: ${origin}`);
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
  assert.equal(response.headers.get('access-control-allow-origin'),preview);
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
