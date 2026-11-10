// Reserva → Meta: pasos del embudo con nombres neutros, sin parámetros y una vez por visita.
// Sirve para saber dónde abandonan y para públicos «empezó a reservar y no terminó».
// No envía servicio, fecha, nombre ni celular. La reserva completa la envía patch11 como «Schedule».
(()=>{
  if(typeof window.olanoMeta!=='function'||typeof go!=='function'||typeof openBooking!=='function')return;
  const STEP={2:'ReservaFecha',3:'ReservaDatos',4:'ReservaRevision'};
  const baseOpen=openBooking;
  openBooking=function(){window.olanoMeta('ReservaAbierta',false,true);return baseOpen.apply(this,arguments)};
  const baseGo=go;
  go=function(n){const r=baseGo.apply(this,arguments);const name=STEP[Number(n)];if(name)window.olanoMeta(name,false,true);return r};
  // Quien entra directo a /reserva o /reserva-s ya tiene la reserva abierta.
  if(document.querySelector('#booking.open'))window.olanoMeta('ReservaAbierta',false,true);
})();
