(()=>{
  const API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-funnel';
  const SESSION_KEY='olanoFunnelSessionV1';
  const SOURCE_KEY='olanoFunnelSourceV1';
  const ATTR_KEY='olanoFunnelAttributionV2';
  const VALID_EVENTS=new Set(['landing_view','service_selected','offer_accepted','offer_declined','booking_started','booking_registered','whatsapp_opened']);
  const currentState=()=>typeof state!=='undefined'?state:null;

  function getSession(){
    try{
      let id=sessionStorage.getItem(SESSION_KEY);
      if(!id){id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(SESSION_KEY,id)}
      return id;
    }catch{return `${Date.now()}_${Math.random().toString(36).slice(2)}`}
  }
  function clean(value,max=300){
    const s=String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().replace(/\s+/g,' ');
    if(!s||/^__[^_]+.*__$/.test(s))return '';
    return s.slice(0,max);
  }
  function queryParams(){
    try{
      const raw=typeof window.__olanoAttributionQuery==='string'?window.__olanoAttributionQuery:location.search;
      return new URLSearchParams(raw||'');
    }catch{return new URLSearchParams()}
  }
  function captureAttribution(){
    let saved={};
    try{saved=JSON.parse(sessionStorage.getItem(ATTR_KEY)||'{}')||{}}catch{}
    const p=queryParams();
    const pick=(...keys)=>{for(const k of keys){const v=clean(p.get(k));if(v)return v}return ''};
    const incoming={
      utm_source:pick('utm_source'),
      utm_medium:pick('utm_medium'),
      utm_campaign:pick('utm_campaign'),
      utm_content:pick('utm_content'),
      utm_term:pick('utm_term'),
      utm_id:pick('utm_id'),
      campaign_id:pick('tt_campaign_id','campaign_id'),
      campaign_name:pick('tt_campaign_name','campaign_name'),
      adgroup_id:pick('tt_adgroup_id','adgroup_id'),
      adgroup_name:pick('tt_adgroup_name','adgroup_name'),
      ad_id:pick('tt_ad_id','ad_id'),
      ad_name:pick('tt_ad_name','ad_name'),
      creative_id:pick('tt_creative_id','creative_id'),
      creative_name:pick('tt_creative_name','creative_name'),
      placement:pick('tt_placement','placement')
    };
    if(!incoming.campaign_id&&/^\d+$/.test(incoming.utm_id))incoming.campaign_id=incoming.utm_id;
    if(!incoming.campaign_name&&incoming.utm_campaign)incoming.campaign_name=incoming.utm_campaign;
    const hasIncoming=Object.values(incoming).some(Boolean);
    const merged=hasIncoming?{...saved,...Object.fromEntries(Object.entries(incoming).filter(([,v])=>v))}:saved;
    try{if(Object.keys(merged).length)sessionStorage.setItem(ATTR_KEY,JSON.stringify(merged))}catch{}
    return merged;
  }
  const attribution=captureAttribution();

  function sourceFrom(value){
    const u=String(value||'').toLowerCase();
    if(/facebook|instagram|meta|\bfb\b|\big\b/.test(u))return 'meta';
    if(/tiktok/.test(u))return 'tiktok';
    if(/google/.test(u))return 'google';
    return u?'other':'';
  }
  function inferSource(){
    try{
      const current=sourceFrom(attribution.utm_source);
      if(current){sessionStorage.setItem(SOURCE_KEY,current);return current}
      const saved=sessionStorage.getItem(SOURCE_KEY);if(saved)return saved;
      let s='unknown';
      if(!document.referrer)s='direct';
      else{
        const h=new URL(document.referrer).hostname.toLowerCase();
        if(/facebook|instagram/.test(h))s='meta';
        else if(/tiktok/.test(h))s='tiktok';
        else if(/google/.test(h))s='google';
        else if(h===location.hostname)s='organic';
        else s='other';
      }
      sessionStorage.setItem(SOURCE_KEY,s);return s;
    }catch{return 'unknown'}
  }
  const sessionId=getSession(),source=inferSource();

  function track(eventName,extra={}){
    if(!VALID_EVENTS.has(eventName))return Promise.resolve();
    const body={session_id:sessionId,event_name:eventName,source,attribution};
    if(extra?.booking_id)body.booking_id=String(extra.booking_id);
    try{return fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{})}catch{return Promise.resolve()}
  }
  window.olanoFunnelTrack=track;
  window.olanoFunnelSessionId=sessionId;
  window.olanoFunnelAttribution=Object.freeze({...attribution});
  track('landing_view');

  if(!window.__olanoFunnelFetchWrapped){
    window.__olanoFunnelFetchWrapped=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const response=await nativeFetch(input,init);
      try{
        const url=typeof input==='string'?input:String(input?.url||'');
        if(url.includes('/functions/v1/dr-olano-booking')&&String(init?.method||'GET').toUpperCase()==='POST'){
          let requestBody={};try{requestBody=JSON.parse(String(init?.body||'{}'))}catch{}
          if(requestBody?.action==='book'&&response.ok){
            response.clone().json().then(data=>{
              const id=data?.booking?.id;
              if(id){window.__olanoLastBookingId=String(id);track('booking_registered',{booking_id:id})}
            }).catch(()=>{});
          }
        }
      }catch{}
      return response;
    };
  }

  function appointmentCopy(){
    const s=currentState()?.service;if(!s)return '';
    const id=String(s.id||'');
    const isConsult=id==='consulta'||id==='novare-consulta'||String(s.name||'').toLowerCase().startsWith('consulta');
    return isConsult?'Reserva de consulta / evaluación médica.':'Servicio sujeto a evaluación médica.';
  }
  function renderAppointmentHint(){
    const banner=document.querySelector('#v252SelectedServiceBanner');
    const copy=banner?.querySelector('.v252-selected-copy');
    if(!copy)return;
    let hint=copy.querySelector('.olano-appointment-hint');
    if(!hint){hint=document.createElement('span');hint.className='olano-appointment-hint';copy.appendChild(hint)}
    const text=appointmentCopy();
    if(hint.textContent!==text)hint.textContent=text;
  }
  if(!document.getElementById('olano-audit-v8-style')){
    const st=document.createElement('style');st.id='olano-audit-v8-style';
    st.textContent='#v252SelectedServiceBanner .olano-appointment-hint{display:block!important;margin-top:4px!important;color:rgba(255,255,255,.82)!important;font-size:.60rem!important;line-height:1.22!important;font-weight:650!important;letter-spacing:.01em!important}@media(max-width:760px){#v252SelectedServiceBanner .olano-appointment-hint{font-size:.58rem!important}}';
    document.head.appendChild(st);
  }

  const booking=document.querySelector('#booking');
  if(!booking)return;
  let serviceTracked=false,bookingTracked=false,waTracked=false;
  function inspect(){
    renderAppointmentHint();
    if(!serviceTracked&&currentState()?.service){serviceTracked=true;track('service_selected')}
    if(!bookingTracked&&booking.querySelector('.step[data-step="2"].active')){bookingTracked=true;track('booking_started')}
    if(!waTracked&&window.__olanoLastBookingId&&booking.querySelector('.step[data-step="5"].active')){waTracked=true;track('whatsapp_opened',{booking_id:window.__olanoLastBookingId})}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-v238-service],[data-svc]')){serviceTracked=true;track('service_selected');setTimeout(renderAppointmentHint,0)}
    if(e.target.closest('#offer10Accept,#offer10ConfirmApply'))track('offer_accepted');
    if(e.target.closest('#offer10ConfirmReject'))track('offer_declined');
    if(e.target.closest('#openWhatsApp')&&!waTracked){waTracked=true;track('whatsapp_opened',{booking_id:window.__olanoLastBookingId||null})}
  },true);
  new MutationObserver(()=>queueMicrotask(inspect)).observe(booking,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(inspect,1000);
  inspect();
})();