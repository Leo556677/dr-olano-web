// Activa el formulario OTP sólo cuando el CRM ha pasado el checklist de producción.
// Mientras no esté habilitado, la web conserva las reservas normales y WhatsApp.
(async () => {
  const URL='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-booking-otp';
  const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
  const pilot=window.OLANO_BOOKING_PILOT===true || new URLSearchParams(location.search).get('prueba_otp')==='1';
  const state={enabled:pilot,ready:false,error:false};
  window.OLANO_OTP_BOOTSTRAP=state;
  try {
    if(!pilot){
    const response=await fetch(URL,{
      method:'GET',
      headers:{apikey:KEY},
      cache:'no-store',
      signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)throw new Error('OTP_STATUS_UNAVAILABLE');
    const result=await response.json();
    if(result?.otp_enabled!==true)return;
    }
    state.enabled=true;
    await import('/assets/booking-email-otp-v1.js?v=20261111d');
    if(!window.OLANO_PATIENT_OTP?.isVerified || !window.OLANO_PATIENT_OTP?.confirmForBooking){
      throw new Error('OTP_MODULES_UNAVAILABLE');
    }
    state.ready=true;
    window.dispatchEvent(new Event('olano-otp-ready'));
  }catch{
    state.error=true;
    // Sin confirmar estado de backend, no se pretende que OTP esté activo.
    // El propio backend bloquea reservas sin verificación si el flag ya está activado.
  }
})();
