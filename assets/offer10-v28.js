(()=>{
  if(typeof state==='undefined'||typeof CONFIG==='undefined'||typeof openBooking!=='function')return;

  const API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-offer';
  const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
  const MAP='https://maps.app.goo.gl/avA3W5SDPHi3XNqd6';
  const ADDRESS='Av. Pacayal 1243, Carabayllo 15319 - CARABAYLLO';
  const DIR=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}&travelmode=driving`;
  const STORE='olanoOffer10V2';
  let wait=null,tickTimer=null,lastWa='';

  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>Number.isFinite(Number(n))?`S/ ${Number(n).toFixed(2).replace(/\.00$/,'')}`:'Según evaluación médica';
  const couponSvg=()=>`<svg class="offer10-coupon-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 0 6.5 5H19a1 1 0 0 1 1 1v3a2.5 2.5 0 0 0 0 5v4a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 16.5v-9Z"/><path d="M9 9h.01M15 15h.01M10 14l4-4"/></svg>`;
  const starSvg=()=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.75 5.57 6.15.89-4.45 4.34 1.05 6.13L12 16.64l-5.5 2.89 1.05-6.13L3.1 9.06l6.15-.89L12 2.6Z"/></svg>`;

  function read(){try{return JSON.parse(sessionStorage.getItem(STORE)||'null')}catch{return null}}
  function save(o){try{sessionStorage.setItem(STORE,JSON.stringify(o))}catch{}}
  function left(o){return Math.max(0,new Date(o?.claim?.expires_at||0).getTime()-Date.now())}
  function duration(o){
    const start=new Date(o?.claim?.issued_at||0).getTime();
    const end=new Date(o?.claim?.expires_at||0).getTime();
    return Math.max(1,end-start);
  }
  function prices(o){const c=o?.claim||{};return c.regular_price_pen==null?{old:'Según evaluación médica',now:'10% menos sobre el valor final evaluado'}:{old:money(c.regular_price_pen),now:money(c.discounted_price_pen)}}

  async function call(body,keepalive=false){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify(body),keepalive});
    const d=await r.json();
    if(!r.ok||!d?.ok){const e=new Error(d?.code||'OFFER_FAILED');e.data=d;throw e}
    return d;
  }

  function mount(){
    if(!$('#offer10Overlay'))document.body.insertAdjacentHTML('beforeend',`
      <div id="offer10Overlay" aria-hidden="true">
        <div id="offer10Dialog" role="dialog" aria-modal="true" aria-labelledby="offer10Title" tabindex="-1">
          <button class="offer10-close" id="offer10Close" type="button" aria-label="Cerrar">×</button>
          <span class="offer10-kicker">${couponSvg()}BENEFICIO ESPECIAL</span>
          <h2 class="offer10-title" id="offer10Title">ACTIVA TU <span class="offer10-title-accent">10%</span> DE DESCUENTO</h2>
          <p class="offer10-service" id="offer10Service"></p>
          <div class="offer10-prices">
            <div class="offer10-price"><small>PRECIO REGULAR REFERENCIAL</small><div class="offer10-old" id="offer10Old"></div></div>
            <div class="offer10-price"><small>CON TU 10% APLICADO</small><div class="offer10-new" id="offer10New"></div></div>
          </div>
          <div class="offer10-countdown">
            <div class="offer10-countdown-head"><span class="offer10-countdown-label">OFERTA RESERVADA POR TIEMPO LIMITADO</span><span class="offer10-timer" id="offer10Timer"></span></div>
            <div class="offer10-progress" role="progressbar" aria-label="Tiempo restante del beneficio" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
              <div class="offer10-progress-fill" id="offer10ProgressFill"><div class="offer10-progress-stars">${starSvg()}${starSvg()}${starSvg()}${starSvg()}${starSvg()}</div><div class="offer10-progress-shine"></div></div>
            </div>
          </div>
          <div class="offer10-primary-wrap"><button class="btn btn-primary pulse" id="offer10Accept" type="button">APLICAR MI 10%</button></div>
          <button class="offer10-secondary" id="offer10Decline" type="button">Continuar sin el beneficio</button>
          <p class="offer10-note">El valor mostrado es referencial. El importe final depende de la evaluación médica cuando corresponda. El beneficio queda asociado al servicio elegido y puede verificarse mediante un comprobante del sistema.</p>
        </div>
      </div>`);

    if(!$('#offer10ConfirmOverlay'))document.body.insertAdjacentHTML('beforeend',`
      <div id="offer10ConfirmOverlay" aria-hidden="true">
        <div id="offer10ConfirmDialog" role="dialog" aria-modal="true" aria-labelledby="offer10ConfirmTitle" tabindex="-1">
          <div class="offer10-confirm-icon">${couponSvg()}</div>
          <h3 class="offer10-confirm-title" id="offer10ConfirmTitle">¿Estás seguro de perder tu 10% de descuento?</h3>
          <p class="offer10-confirm-copy">Puedes mantener el beneficio y continuar directamente al calendario, o seguir sin la oferta.</p>
          <div class="offer10-confirm-actions">
            <button id="offer10ConfirmApply" type="button">APLICAR OFERTA 10%</button>
            <button id="offer10ConfirmReject" type="button">NO QUIERO OFERTA</button>
          </div>
        </div>
      </div>`);

    if(!$('#offer10Strip'))$('#booking .booking-inner')?.insertAdjacentHTML('afterbegin','<div id="offer10Strip"><div class="offer10-strip-copy"><b></b><small></small></div><div class="offer10-strip-time"></div></div>');

    $('#offer10Accept')?.addEventListener('click',()=>accept(true));
    $('#offer10Decline')?.addEventListener('click',showDeclineConfirm);
    $('#offer10Close')?.addEventListener('click',showDeclineConfirm);
    $('#offer10Overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)showDeclineConfirm()});
    $('#offer10ConfirmApply')?.addEventListener('click',()=>accept(true));
    $('#offer10ConfirmReject')?.addEventListener('click',()=>decline(true));
    injectLocation();
  }

  function injectLocation(){
    if($('#olanoLocation'))return;
    const footer=$('footer.site-footer');if(!footer)return;
    const el=document.createElement('section');el.id='olanoLocation';el.className='olano-location';
    el.innerHTML=`<div class="wrap"><div class="olano-location-card"><h2>¿Dónde te atendemos?</h2><p><strong>${esc(ADDRESS)}</strong><br>Google Maps puede calcular la ruta y el tiempo estimado desde la ubicación disponible en tu dispositivo.</p><div class="olano-location-actions"><a class="olano-route" href="${DIR}" target="_blank" rel="noopener">Cómo llegar desde mi ubicación</a><a class="olano-map" href="${MAP}" target="_blank" rel="noopener">Ver en Google Maps</a></div></div></div>`;
    footer.parentNode.insertBefore(el,footer);
  }

  function hideMain(){const el=$('#offer10Overlay');if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}}
  function hideConfirm(){const el=$('#offer10ConfirmOverlay');if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}}
  function showDeclineConfirm(){const el=$('#offer10ConfirmOverlay');if(!el)return;el.classList.add('show');el.setAttribute('aria-hidden','false');setTimeout(()=>$('#offer10ConfirmApply')?.focus(),20)}

  function show(o){
    const p=prices(o);
    $('#offer10Service').textContent=o.claim.service_name;
    $('#offer10Old').textContent=p.old;
    $('#offer10New').textContent=p.now;
    $('#offer10Accept').disabled=left(o)<=0;
    $('#offer10Overlay').classList.add('show');
    $('#offer10Overlay').setAttribute('aria-hidden','false');
    startTick();
    setTimeout(()=>$('#offer10Accept')?.focus(),30);
    try{trackEvent('offer10_view')}catch{}
  }

  function renderStrip(){
    const strip=$('#offer10Strip'),o=read();
    if(!strip||!o?.accepted||o.claim?.service_code!==state.service?.id){strip?.classList.remove('show');return}
    const p=prices(o);
    strip.querySelector('b').textContent=`10% aplicado · ${o.claim.service_name}`;
    strip.querySelector('small').textContent=o.claim.regular_price_pen==null?p.now:`${p.old} → ${p.now}`;
    strip.classList.add('show');
  }

  function updateTick(){
    const o=read();if(!o)return;
    const ms=o.redeemed?0:left(o),s=Math.ceil(ms/1000),mm=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');
    const txt=o.redeemed?'APLICADO A TU RESERVA':ms>0?`${mm}:${ss}`:'BENEFICIO VENCIDO';
    if($('#offer10Timer'))$('#offer10Timer').textContent=txt;
    const fill=$('#offer10ProgressFill'),progress=$('.offer10-progress');
    if(fill&&progress){const pct=o.redeemed?100:Math.max(0,Math.min(100,(ms/duration(o))*100));fill.style.width=`${pct}%`;progress.setAttribute('aria-valuenow',String(Math.round(pct)))}
    const t=$('#offer10Strip .offer10-strip-time');if(t)t.textContent=o.redeemed?'✓ APLICADO':ms>0?`${mm}:${ss}`:'VENCIDO';
    if(ms<=0&&!o.redeemed&&$('#offer10Accept'))$('#offer10Accept').disabled=true;
    renderStrip();
  }
  function startTick(){clearInterval(tickTimer);updateTick();tickTimer=setInterval(updateTick,500)}

  async function issue(service){
    if(!service?.id)return;
    const old=read();
    if(old?.claim?.service_code===service.id&&left(old)>0){if(!old.accepted&&!old.declined)show(old);return}
    try{
      const d=await call({action:'issue',service_code:service.id});
      if(state.service?.id!==service.id||!$('#booking')?.classList.contains('open'))return;
      const o={token:d.token,proof_url:d.proof_url,claim:d.claim,accepted:false,declined:false,redeemed:false};save(o);show(o);
    }catch(e){console.warn('offer10',e.message)}
  }
  function schedule(service){if(!service?.id)return;clearTimeout(wait);const id=service.id;wait=setTimeout(()=>{if(state.service?.id===id&&$('#booking')?.classList.contains('open'))issue(state.service)},2000)}
  function goCalendar(){hideConfirm();hideMain();try{go(2)}catch(e){console.warn('offer calendar',e)}}
  function accept(goNext=false){
    const o=read();if(!o||left(o)<=0)return;
    o.accepted=true;o.declined=false;save(o);hideConfirm();hideMain();renderStrip();startTick();try{trackEvent('offer10_accepted')}catch{}
    if(goNext)goCalendar();
  }
  function decline(goNext=false){
    const o=read();if(o){o.accepted=false;o.declined=true;save(o)}
    hideConfirm();hideMain();renderStrip();try{trackEvent('offer10_declined')}catch{}
    if(goNext)goCalendar();
  }

  function enhanceSummary(){
    const o=read(),box=$('#summary');if(!box||!o?.accepted||o.claim?.service_code!==state.service?.id)return;
    const p=prices(o);if(box.querySelector('[data-offer10-summary]'))return;
    box.insertAdjacentHTML('beforeend',`<div class="summary-row" data-offer10-summary><span class="summary-key">🎁 Beneficio</span><b>10% aplicado · ${esc(o.claim.regular_price_pen==null?p.now:p.old+' → '+p.now)}</b></div><div class="summary-row" data-offer10-summary><span class="summary-key">Tipo de cita</span><b>${esc(o.claim.appointment_type)}</b></div>`);
  }
  function manageToken(){try{if(!state.manageUrl)return'';return new URL(state.manageUrl).searchParams.get('t')||''}catch{return''}}
  function redeem(o){
    if(!o?.accepted||o.redeemed||left(o)<=0||o.claim?.service_code!==state.service?.id)return;
    const mt=manageToken();if(!mt)return;
    call({action:'redeem',token:o.token,manage_token:mt,booking_code:state.id},true).then(d=>{o.redeemed=true;o.claim=d.claim||o.claim;o.proof_url=d.proof_url||o.proof_url;save(o);updateTick()}).catch(e=>console.warn('offer redeem',e.message));
  }
  function enhanceWa(){
    const done=$('#booking .step[data-step="5"].active'),a=$('#openWhatsApp');if(!done||!a?.href||!state.id||lastWa===state.id)return;
    lastWa=state.id;const o=read();if(o?.accepted)redeem(o);
    try{
      const u=new URL(a.href);let text=u.searchParams.get('text')||'';
      if(o?.accepted&&o.claim?.service_code===state.service?.id){const p=prices(o);text+=`\n\n🎁 *Beneficio: 10% de descuento*`;text+=o.claim.regular_price_pen==null?`\n💰 10% sobre el valor final determinado tras evaluación.`:`\n💰 Precio referencial: ${p.old} → *${p.now}*`;text+=`\n📌 Tipo de cita: ${o.claim.appointment_type}`;text+=`\n🔎 Verificar beneficio: ${o.proof_url}`}
      text+=`\n\n📍 Dirección: ${ADDRESS}\n🗺️ Google Maps: ${MAP}`;u.searchParams.set('text',text);a.href=u.toString();state.url=a.href;queueMicrotask(()=>location.replace(a.href));
    }catch(e){console.warn('wa enhance',e)}
    try{const k=`olanoMetaSchedule:${state.id}`;if(typeof fbq==='function'&&sessionStorage.getItem(k)!=='1'){fbq('track','Schedule');sessionStorage.setItem(k,'1')}}catch{}
  }

  mount();
  document.addEventListener('click',e=>{if(e.target.closest('[data-v238-service],[data-svc]'))setTimeout(()=>state.service&&schedule(state.service),0)},true);
  const ob=openBooking;openBooking=function(){const r=ob.apply(this,arguments);setTimeout(()=>state.service&&schedule(state.service),120);return r};
  const gb=go;go=function(){const r=gb.apply(this,arguments);renderStrip();if(Number(arguments[0])===4)setTimeout(enhanceSummary,0);return r};
  new MutationObserver(enhanceWa).observe($('#booking'),{subtree:true,attributes:true,attributeFilter:['class']});
  startTick();
  if($('#booking')?.classList.contains('open')&&state.service)schedule(state.service);
})();
