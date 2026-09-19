(()=>{
  const API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-site-config';
  const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
  const KNOWN_IMAGES={
    estetica:'/assets/categoria-estetica-v25.webp',
    novare:'/assets/categoria-novare-v25.webp',
    dolor:'/assets/categoria-dolor-v25.webp',
    regenerativa:'/assets/categoria-regenerativa-v25.webp',
    metabolismo:'/assets/metabolismo-v21.webp',
    consulta:'/assets/dr-olano-hero-v22.webp'
  };
  const TONES=['navy','teal','aqua','green','blue','deep'];

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',maximumFractionDigits:2}).format(Number(n)).replace('PEN','S/');
  const servicePrice=s=>{
    if(s?.price_pen==null)return 'Según evaluación';
    return (s.price_from?'Desde ':'')+money(s.price_pen);
  };
  const categoryById=(data,id)=>(data.categories||[]).find(c=>c.id===id);
  const unique=a=>[...new Set(a)];

  function formatIntervals(hours){
    return unique((hours||[]).map(h=>String(h.start||'').slice(0,5)+'–'+String(h.end||'').slice(0,5))).join(' · ');
  }
  function scheduleByDay(booking){
    const map=new Map(Array.from({length:7},(_,i)=>[i,[]]));
    for(const r of booking?.resources||[]){
      for(const h of r.hours||[]){
        const d=Number(h.weekday);
        if(map.has(d))map.get(d).push(h);
      }
    }
    return map;
  }
  function scheduleSummary(booking){
    if(booking?.has_scoped_availability)return 'Horarios según servicio · revisa disponibilidad';
    const map=scheduleByDay(booking);
    const values=Array.from({length:7},(_,d)=>formatIntervals(map.get(d)));
    const nonEmpty=values.filter(Boolean);
    if(!nonEmpty.length)return 'Horarios por confirmar';
    if(nonEmpty.length===7&&new Set(nonEmpty).size===1)return 'Lun–Dom · '+nonEmpty[0];
    const monSat=[1,2,3,4,5,6].map(d=>values[d]);
    if(monSat.every(Boolean)&&new Set(monSat).size===1&&!values[0])return 'Lun–Sáb · '+monSat[0];
    return 'Horarios según servicio · revisa disponibilidad';
  }
  function updateScheduleCopy(data){
    const summary=scheduleSummary(data.booking);
    try{
      if(typeof CONFIG!=='undefined'){
        if(Number(data.booking?.start_interval_min)>0)CONFIG.slot=Number(data.booking.start_interval_min);
        if(Number(data.booking?.horizon_days)>0)CONFIG.maxDays=Number(data.booking.horizon_days);
      }
    }catch{}
    const pieces=summary.split(' · ');
    const trust=document.querySelectorAll('.hero-copy .trust > div');
    if(trust[0])trust[0].innerHTML='<b>'+esc(pieces[0]||'Horario')+'</b><span>'+esc(pieces.slice(1).join(' · ')||'según disponibilidad')+'</span>';
    if(trust[1]){
      if(data.booking?.has_scoped_availability)trust[1].innerHTML='<b>Variable</b><span>según servicio</span>';
      else if(Number(data.booking?.start_interval_min)>0)trust[1].innerHTML='<b>'+Number(data.booking.start_interval_min)+' min</b><span>intervalos</span>';
    }
    document.querySelectorAll('.trust-chip').forEach(el=>{
      const t=el.textContent||'';
      if(/Lun|Mar|Mié|Jue|Vie|Sáb|Dom|09:00|21:00|horario/i.test(t))el.textContent=summary;
    });
    document.querySelectorAll('.footer-meta span').forEach(el=>{
      const t=el.textContent||'';
      if(/Lunes|Martes|Miércoles|Jueves|Viernes|sábado|domingo|09:00|21:00/i.test(t))el.textContent=summary;
    });
  }

  function validHex(v){ return /^#[0-9a-f]{6}$/i.test(String(v||'')); }
  function applyBranding(data){
    const b=data?.branding||{};
    const root=document.documentElement;
    if(validHex(b.primary))root.style.setProperty('--navy',b.primary);
    if(validHex(b.secondary))root.style.setProperty('--teal',b.secondary);
    if(validHex(b.accent))root.style.setProperty('--gold',b.accent);
    if(validHex(b.background))root.style.setProperty('--bg',b.background);
    if(b.logo_url){
      document.querySelectorAll('img[src*="logo-isotipo"]').forEach(img=>{
        img.removeAttribute('data-optimized');
        img.src=b.logo_url;
      });
      document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{ link.href=b.logo_url; });
    }
  }

  function applyCatalog(data){
    const services=(data.services||[]).filter(s=>s?.service_code&&s?.name&&categoryById(data,s.category_id));
    const usedCategoryIds=new Set(services.map(s=>s.category_id));
    const categories=(data.categories||[]).filter(c=>c?.slug&&c?.name&&usedCategoryIds.has(c.id));
    const mappedCategories=categories.map((c,i)=>({
      id:c.slug,label:c.name,tone:TONES[i%TONES.length],
      description:c.description||'',icon_data_uri:c.icon_data_uri||null,
      featured:c.featured===true,order:Number(c.order||0),source_id:c.id
    }));
    const mappedServices=services.map(s=>{
      const c=categoryById(data,s.category_id);
      return {
        id:s.service_code,
        category:c.slug,
        unit:c.name,
        name:s.name,
        price:servicePrice(s),
        description:s.description||'',
        duration_min:s.duration_min,
        price_pen:s.price_pen,
        price_from:s.price_from===true,
        source_id:s.id
      };
    });
    try{
      if(typeof V23_CATEGORIES!=='undefined')V23_CATEGORIES.splice(0,V23_CATEGORIES.length,...mappedCategories);
      if(typeof V23_SERVICES!=='undefined')V23_SERVICES.splice(0,V23_SERVICES.length,...mappedServices);
      if(typeof SERVICES!=='undefined')SERVICES.splice(0,SERVICES.length,...mappedServices);
      if(typeof state!=='undefined'&&state.service){
        const current=mappedServices.find(s=>s.id===state.service.id);
        state.service=current||null;
      }
    }catch(e){console.warn('catalog config',e)}
  }

  function categoryIcon(data,slug){
    return (data.categories||[]).find(c=>c.slug===slug)?.icon_data_uri||'';
  }
  function decorateCatalog(data){
    document.querySelectorAll('[data-v238-category]').forEach(btn=>{
      const slug=btn.getAttribute('data-v238-category');
      const uri=categoryIcon(data,slug);
      const icon=btn.querySelector('.v238-rail-icon');
      if(icon&&uri)icon.innerHTML='<img src="'+esc(uri)+'" alt="" aria-hidden="true">';
    });
    document.querySelectorAll('.v238-category-title').forEach(title=>{
      const panel=title.closest('.v238-category-panel');
      const selected=panel?.querySelector('[data-v238-service]');
      const serviceId=selected?.getAttribute('data-v238-service');
      let slug='';
      try{slug=(typeof SERVICES!=='undefined'?SERVICES.find(s=>s.id===serviceId)?.category:'')||''}catch{}
      if(!slug&&typeof state!=='undefined')slug=state.service?.category||'';
      const uri=categoryIcon(data,slug);
      const icon=title.querySelector('.v238-category-title-icon');
      if(icon&&uri)icon.innerHTML='<img src="'+esc(uri)+'" alt="" aria-hidden="true">';
    });
  }
  function wrapCatalogRenderer(data){
    if(typeof renderServices!=='function'||window.__olanoDynamicRenderWrapped)return;
    window.__olanoDynamicRenderWrapped=true;
    const base=renderServices;
    renderServices=function(){
      const out=base.apply(this,arguments);
      queueMicrotask(()=>decorateCatalog(data));
      return out;
    };
    try{renderServices()}catch{}
  }

  function renderFeaturedCategories(data){
    const section=document.querySelector('#unidades');
    const grid=section?.querySelector('.units');
    const head=section?.querySelector('.section-head');
    if(!grid)return;
    const featured=(data.categories||[]).filter(c=>c.featured).slice(0,6);
    if(!featured.length)return;
    if(head)head.innerHTML='<h2>Atención especializada</h2><p>Elige un área para ver sus servicios y agendar.</p>';
    grid.classList.add('v240-featured-grid');
    grid.innerHTML=featured.map((c,i)=>{
      const photo=KNOWN_IMAGES[c.slug]||'';
      let visual='';
      if(photo)visual='<img src="'+esc(photo)+'" width="1280" height="720" loading="'+(i===0?'eager':'lazy')+'" decoding="async" alt="">';
      else if(c.icon_data_uri)visual='<img class="olano-dynamic-category-icon" src="'+esc(c.icon_data_uri)+'" width="128" height="128" loading="lazy" decoding="async" alt="">';
      return '<article class="unit v240-unit" data-v240-category="'+esc(c.slug)+'">'+
        '<button type="button" class="v240-card-hit" aria-label="Ver servicios de '+esc(c.name)+'">'+
        '<div class="unit-media v240-media '+(photo?'':'dynamic-icon')+'">'+visual+'</div>'+
        '<div class="unit-copy v240-copy"><b>'+esc(c.name)+'</b><p>'+esc(c.description||'Consulta opciones y disponibilidad.')+'</p>'+
        '<span class="v240-cta">Ver servicios y agendar <span aria-hidden="true">→</span></span></div></button></article>';
    }).join('');
    grid.querySelectorAll('[data-v240-category]').forEach(card=>{
      const hit=card.querySelector('.v240-card-hit');
      if(!hit)return;
      hit.onclick=()=>{
        try{if(typeof markScheduleInteraction==='function')markScheduleInteraction()}catch{}
        try{if(typeof state!=='undefined')state.service=null}catch{}
        if(typeof openBooking!=='function')return;
        openBooking();
        setTimeout(()=>{
          if(typeof renderServices==='function')renderServices();
          const slug=card.dataset.v240Category;
          const btn=[...document.querySelectorAll('[data-v238-category]')].find(x=>x.getAttribute('data-v238-category')===slug);
          if(btn)btn.click();
        },140);
      };
    });
  }

  function addStyles(){
    if(document.getElementById('olano-business-config-styles'))return;
    const st=document.createElement('style');
    st.id='olano-business-config-styles';
    st.textContent='.v238-rail-icon img,.v238-category-title-icon img{width:100%;height:100%;display:block;object-fit:contain}'+
      '#unidades .v240-media.dynamic-icon{display:grid!important;place-items:center!important;background:linear-gradient(145deg,#edf8f6,#f8fbfb)!important}'+
      '#unidades .v240-media.dynamic-icon img.olano-dynamic-category-icon{width:34%!important;height:34%!important;object-fit:contain!important;animation:none!important}';
    document.head.appendChild(st);
  }

  async function load(){
    try{
      const r=await fetch(API,{headers:{apikey:KEY},cache:'no-store'});
      const data=await r.json();
      if(!r.ok||data?.ok!==true)throw new Error(data?.code||'SITE_CONFIG_FAILED');
      window.OLANO_BUSINESS_CONFIG=data;
      addStyles();
      applyBranding(data);
      applyCatalog(data);
      updateScheduleCopy(data);
      wrapCatalogRenderer(data);
      renderFeaturedCategories(data);
      document.dispatchEvent(new CustomEvent('olano:business-config',{detail:data}));
      return data;
    }catch(e){
      console.warn('Dr. Olano business config fallback',e);
      window.OLANO_BUSINESS_CONFIG=null;
      return null;
    }
  }

  window.olanoBusinessConfigReady=load();
})();