(()=>{
  if(typeof state==='undefined'||typeof CONFIG==='undefined')return;
  const ADDRESS='Av. Pacayal 1243, Carabayllo 15319 - CARABAYLLO';
  const MAP='https://maps.app.goo.gl/avA3W5SDPHi3XNqd6';
  const OFFER_STORE='olanoOffer10V2';
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
  const DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  let redirectedCode='';

  function offer(){try{return JSON.parse(sessionStorage.getItem(OFFER_STORE)||'null')}catch{return null}}
  function left(o){return Math.max(0,new Date(o?.claim?.expires_at||0).getTime()-Date.now())}
  function money(n){return `S/ ${Number(n).toFixed(2).replace(/\.00$/,'')}`}
  function validOffer(o){return !!(o&&o.claim?.service_code===state.service?.id&&(o.redeemed||(o.accepted&&left(o)>0)))}
  function fmtDate(iso){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));if(!m)return String(iso||'');
    const y=Number(m[1]),mo=Number(m[2])-1,d=Number(m[3]),dt=new Date(y,mo,d,12,0,0);
    return `${DAYS[dt.getDay()]}, ${d} de ${MONTHS[mo]} de ${y}`;
  }
  function build(){
    const phone=String(CONFIG?.phone||'').replace(/\D/g,'');if(!phone||!state.id||!state.service)return '';
    const serviceName=String(state.service?.name||state.service?.id||'');
    const regular=String(state.service?.price||'').trim();
    const o=offer(),hasOffer=validOffer(o),p=o?.claim||{};
    let valueLine=regular?`💰 Valor referencial: ${regular}`:'';
    if(hasOffer&&p.regular_price_pen!=null&&p.discounted_price_pen!=null){
      valueLine=`💰 Valor referencial: Desde ${money(p.regular_price_pen)} → *Desde ${money(p.discounted_price_pen)} con 10%*`;
    }
    const lines=[
      '✅ *Cita registrada · Dr. Olano*',
      `📋 Código: ${state.id}`,
      `👤 Paciente: ${state.name||''}`,
      `🩺 Servicio: ${serviceName}`,
      valueLine,
    ].filter(Boolean);
    if(hasOffer){
      if(p.regular_price_pen==null)lines.push('🎁 Beneficio: *10% aplicado sobre el valor final evaluado*');
      if(o.proof_url)lines.push(`🔎 Verificar oferta: ${o.proof_url}`);
    }
    let jornada=false;try{jornada=sessionStorage.getItem('olanoOrigen')==='jornada-cirugia-nov-2026'}catch{}
    if(jornada)lines.push('🏥 *Evaluación para la Jornada de cirugía facial (18, 19 y 20 de noviembre)*');
    lines.push('> ℹ️ El valor final está sujeto a evaluación médica.','',`📅 Fecha: ${fmtDate(state.date)}`,`🕐 Hora: ${state.time||''}`);
    if(state.manageUrl)lines.push('',`🔗 Gestionar / reprogramar / cancelar: ${state.manageUrl}`);
    if(jornada)lines.push('','💳 Para separar tu horario: envía *S/ 20* por Yape (981 214 007) o BCP (191-90200628044) y la constancia en este chat. Se descuentan de tu evaluación y aseguran tu *50 % de descuento* en la jornada.');
    lines.push('',`📍 Dirección: ${ADDRESS}`,`🗺️ Google Maps: ${MAP}`);
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }
  function safeBase(){
    const phone=String(CONFIG?.phone||'').replace(/\D/g,'');
    return phone?`https://wa.me/${phone}`:'#';
  }
  function apply(autoRedirect=false){
    const done=document.querySelector('#booking .step[data-step="5"].active');if(!done)return;
    const a=document.querySelector('#openWhatsApp');if(!a)return;
    const url=build();if(!url)return;
    a.dataset.olanoWaUrl=url;
    const safe=safeBase();if(a.getAttribute('href')!==safe)a.setAttribute('href',safe);
    state.url=url;
    if(autoRedirect&&state.id&&redirectedCode!==state.id){
      redirectedCode=state.id;
      if(window.__olanoWaGo)window.__olanoWaGo(url,3);else queueMicrotask(()=>location.replace(url));
    }
  }
  const booking=document.querySelector('#booking');
  if(booking)new MutationObserver(()=>queueMicrotask(()=>apply(true))).observe(booking,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    const a=e.target.closest('#openWhatsApp');if(!a)return;
    apply(false);
    const url=a.dataset.olanoWaUrl;
    if(url){e.preventDefault();location.assign(url)}
  },true);
  setInterval(()=>apply(false),750);
})();