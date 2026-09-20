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
    if(validHex(b.primary)){root.style.setProperty('--navy',b.primary);root.style.setProperty('--navy2',b.primary);}
    if(validHex(b.secondary)){root.style.setProperty('--teal',b.secondary);root.style.setProperty('--teal2',b.secondary);}
    if(validHex(b.accent))root.style.setProperty('--gold',b.accent);
    if(validHex(b.background))root.style.setProperty('--bg',b.background);
    const theme=document.querySelector('meta[name="theme-color"]');
    if(theme&&validHex(b.primary))theme.setAttribute('content',b.primary);
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
      description:c.description||'',icon_svg:c.icon_svg||null,image_url:c.image_url||null,image_alt:c.image_alt||null,
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
    return (data.categories||[]).find(c=>c.slug===slug)?.icon_svg||'';
  }
  function decorateCatalog(data){
    document.querySelectorAll('[data-v238-category]').forEach(btn=>{
      const slug=btn.getAttribute('data-v238-category');
      const uri=categoryIcon(data,slug);
      const icon=btn.querySelector('.v238-rail-icon');
      if(icon&&uri)icon.innerHTML=uri;
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
      if(icon&&uri)icon.innerHTML=uri;
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
      const photo=c.image_url||KNOWN_IMAGES[c.slug]||'';
      let visual='';
      if(photo)visual='<img src="'+esc(photo)+'" width="1280" height="720" loading="'+(i===0?'eager':'lazy')+'" decoding="async" alt="'+esc(c.image_alt||c.name||'')+'">';
      else if(c.icon_svg)visual='<div class="olano-dynamic-category-icon" aria-hidden="true">'+c.icon_svg+'</div>';
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

  
  function contentSlot(data,key){
    return (data.content||[]).find(x=>x.slot_key===key)||null;
  }
  function setText(el,value){
    if(el&&value!=null&&String(value).trim()!=='')el.textContent=String(value);
  }
  function setButtonText(el,value){
    if(!el||value==null||String(value).trim()==='')return null;
    const icon=el.querySelector('svg');
    el.textContent='';
    if(icon)el.appendChild(icon);
    const span=document.createElement('span');
    span.className='cms-button-label';
    span.textContent=String(value);
    el.appendChild(span);
    return span;
  }
  function cmsMark(el,key,field=null,setting=null){
    if(!el)return null;
    const section=el.closest('[data-cms-slot]')||el;
    if(key&&section)section.dataset.cmsSlot=key;
    if(field)el.dataset.cmsField=field;
    if(setting)el.dataset.cmsSetting=setting;
    return el;
  }
  function cmsSections(){
    const main=document.querySelector('main');
    const blockWithoutId=[...(main?.querySelectorAll(':scope > section.block')||[])].find(x=>!x.id)||null;
    return {
      'site.header':document.querySelector('header.top'),
      'home.hero':main?.querySelector(':scope > section.hero')||document.querySelector('.hero'),
      'home.start':blockWithoutId,
      'home.featured':document.querySelector('#unidades'),
      'home.trust':document.querySelector('#confianza'),
      'home.faq':document.querySelector('#faq'),
      'home.profile':document.querySelector('#perfil-medico'),
      'home.areas':document.querySelector('#areas-medicas'),
      'site.footer':document.querySelector('.site-footer')
    };
  }
  function markCmsSections(){
    const map=cmsSections();
    Object.entries(map).forEach(([key,el])=>{if(el)el.dataset.cmsSlot=key});
    return map;
  }
  function applyLayout(data,map){
    const slots=[...(data.content||[])];
    const main=document.querySelector('main');
    if(main){
      slots.filter(x=>String(x.slot_key||'').startsWith('home.'))
        .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))
        .forEach(slot=>{
          const el=map[slot.slot_key];
          if(!el)return;
          el.style.display=slot.enabled===false?'none':'';
          main.appendChild(el);
        });
    }
    ['site.header','site.footer'].forEach(key=>{
      const slot=contentSlot(data,key),el=map[key];
      if(el&&slot)el.style.display=slot.enabled===false?'none':'';
    });
  }
  function applyContent(data){
    const map=markCmsSections();

    const header=contentSlot(data,'site.header');
    if(header&&map['site.header']){
      const st=header.settings||{};
      const brand=map['site.header'].querySelector('.brand-name');
      setText(brand,st.brand_name||header.title);
      cmsMark(brand,'site.header',null,'brand_name');
      const menuBook=document.querySelector('#menuBook'),menuServices=document.querySelector('#menuServices'),menuFaq=document.querySelector('#menuFaq');
      const mb=setButtonText(menuBook,st.menu_book),ms=setButtonText(menuServices,st.menu_services),mf=setButtonText(menuFaq,st.menu_faq);
      cmsMark(mb,'site.header',null,'menu_book');cmsMark(ms,'site.header',null,'menu_services');cmsMark(mf,'site.header',null,'menu_faq');
    }

    const hero=contentSlot(data,'home.hero');
    if(hero&&map['home.hero']){
      const section=map['home.hero'];
      const eyebrow=section.querySelector('.hero-copy .eyebrow');
      const title=section.querySelector('.hero-copy h1');
      const subtitle=section.querySelector('.hero-copy .hero-focus');
      const body=[...section.querySelectorAll('.hero-copy > p')].find(x=>!x.classList.contains('hero-focus'));
      setText(eyebrow,hero.eyebrow); setText(title,hero.title); setText(subtitle,hero.subtitle); setText(body,hero.body);
      cmsMark(eyebrow,'home.hero','eyebrow'); cmsMark(title,'home.hero','title'); cmsMark(subtitle,'home.hero','subtitle'); cmsMark(body,'home.hero','body');
      const heroBtn=section.querySelector('#heroBook');
      if(heroBtn&&hero.cta_label){
        const label=setButtonText(heroBtn,hero.cta_label);
        cmsMark(label,'home.hero','cta_label');
      }
      const heroImg=section.querySelector('.hero-media img');
      if(heroImg){
        heroImg.dataset.cmsField='image_url';
        if(hero.image_url){heroImg.removeAttribute('data-optimized');heroImg.src=hero.image_url;}
        if(hero.image_alt)heroImg.alt=hero.image_alt;
      }
    }

    const start=contentSlot(data,'home.start');
    if(start&&map['home.start']){
      const section=map['home.start'],st=start.settings||{};
      const title=section.querySelector('.section-head h2');
      setText(title,start.title); cmsMark(title,'home.start','title');
      const r1=section.querySelector('#routeDirect'),r2=section.querySelector('#routeExplore');
      const r1t=r1?.querySelector('b'),r1b=r1?.querySelector('small'),r2t=r2?.querySelector('b'),r2b=r2?.querySelector('small');
      setText(r1t,st.option_1_title);setText(r1b,st.option_1_body);setText(r2t,st.option_2_title);setText(r2b,st.option_2_body);
      cmsMark(r1t,'home.start',null,'option_1_title');cmsMark(r1b,'home.start',null,'option_1_body');
      cmsMark(r2t,'home.start',null,'option_2_title');cmsMark(r2b,'home.start',null,'option_2_body');
    }

    const featured=contentSlot(data,'home.featured');
    const featuredHead=map['home.featured']?.querySelector('.section-head');
    if(featuredHead){
      const h=featuredHead.querySelector('h2'),p=featuredHead.querySelector('p');
      setText(h,featured?.title);setText(p,featured?.body);
      cmsMark(h,'home.featured','title');cmsMark(p,'home.featured','body');
    }

    const trust=contentSlot(data,'home.trust');
    if(trust&&map['home.trust']){
      const section=map['home.trust'],st=trust.settings||{};
      const title=section.querySelector('.trust-pro h2'),p=section.querySelector('.trust-pro p');
      setText(title,trust.title);cmsMark(title,'home.trust','title');
      if(p){
        p.textContent='';
        const strong=document.createElement('strong'); strong.textContent=st.lead||''; strong.dataset.cmsSetting='lead';
        const span=document.createElement('span'); span.textContent=(st.lead?' ':'')+(trust.body||''); span.dataset.cmsField='body';
        p.append(strong,span);
      }
    }

    const faq=contentSlot(data,'home.faq');
    if(faq&&map['home.faq']){
      const section=map['home.faq'],items=Array.isArray(faq.settings?.items)?faq.settings.items:[];
      let heading=section.querySelector(':scope > .wrap > h2');
      if(!heading&&faq.title){
        heading=document.createElement('h2');heading.className='cms-faq-title';section.querySelector('.wrap')?.prepend(heading);
      }
      setText(heading,faq.title);cmsMark(heading,'home.faq','title');
      const details=[...section.querySelectorAll('details')];
      items.forEach((item,i)=>{
        let d=details[i];
        if(!d){
          d=document.createElement('details');d.innerHTML='<summary></summary><p></p>';section.querySelector('.wrap')?.appendChild(d);
        }
        const q=d.querySelector('summary'),a=d.querySelector('p');
        setText(q,item?.q);setText(a,item?.a);
        cmsMark(q,'home.faq',null,'faq.'+i+'.q');cmsMark(a,'home.faq',null,'faq.'+i+'.a');
      });
      details.slice(items.length).forEach(d=>d.style.display=items.length?'none':'');
    }

    const profile=contentSlot(data,'home.profile');
    const profileHead=map['home.profile']?.querySelector('.section-head');
    if(profileHead){
      const h=profileHead.querySelector('h2'),p=profileHead.querySelector('p');
      setText(h,profile?.title);setText(p,profile?.body);
      cmsMark(h,'home.profile','title');cmsMark(p,'home.profile','body');
    }

    const areas=contentSlot(data,'home.areas');
    const areasHead=map['home.areas']?.querySelector('.section-head');
    if(areasHead){
      const h=areasHead.querySelector('h2'),p=areasHead.querySelector('p');
      setText(h,areas?.title);setText(p,areas?.body);
      cmsMark(h,'home.areas','title');cmsMark(p,'home.areas','body');
    }

    const footer=contentSlot(data,'site.footer');
    if(footer&&map['site.footer']){
      const section=map['site.footer'],st=footer.settings||{};
      const brand=section.querySelector('.footer-brand');
      if(brand){
        let span=brand.querySelector('.cms-footer-brand-text');
        if(!span){
          [...brand.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
          span=document.createElement('span');span.className='cms-footer-brand-text';brand.appendChild(span);
        }
        setText(span,footer.title);cmsMark(span,'site.footer','title');
      }
      const wa=section.querySelector('.footer-wa'),book=section.querySelector('.footer-book'),note=section.querySelector('.footer-note');
      const wal=setButtonText(wa,st.whatsapp_label),bookl=setButtonText(book,st.booking_label);setText(note,st.note);
      cmsMark(wal,'site.footer',null,'whatsapp_label');cmsMark(bookl,'site.footer',null,'booking_label');cmsMark(note,'site.footer',null,'note');
    }

    applyLayout(data,map);
  }


  function builderDevice(){
    if(['desktop','tablet','mobile'].includes(window.__OLANO_PREVIEW_DEVICE))return window.__OLANO_PREVIEW_DEVICE;
    const w=window.innerWidth||document.documentElement.clientWidth||1200;
    if(w<=560)return 'mobile';
    if(w<=950)return 'tablet';
    return 'desktop';
  }
  function builderPalette(data){
    const b=data?.branding||{};
    return {
      primary:validHex(b.primary)?b.primary:'#0b2e4f',
      secondary:validHex(b.secondary)?b.secondary:'#1aa79d',
      accent:validHex(b.accent)?b.accent:'#d7ab33',
      background:validHex(b.background)?b.background:'#f4f7f8',
      white:'#ffffff',
      transparent:'transparent'
    };
  }
  function tokenColor(palette,token){
    return palette?.[token]||palette?.primary||'#0b2e4f';
  }
  function clearBuilderStyle(el){
    if(!el)return;
    ['translate','width','height','borderRadius','padding','opacity','background','backgroundColor','borderColor','borderStyle','borderWidth'].forEach(p=>el.style[p]='');
  }
  function resetBuilderElementTextStyles(){
    document.querySelectorAll('[data-builder-element-text-style="1"]').forEach(el=>{
      el.style.fontSize='';el.style.fontFamily='';el.style.fontWeight='';el.style.color='';
      el.removeAttribute('data-builder-element-text-style');
      el.removeAttribute('data-builder-colored');
      (el.tagName==='svg'?[...el.querySelectorAll('*')]:[...el.querySelectorAll('svg *')]).forEach(n=>{n.style.stroke='';n.style.fill='';});
    });
  }
  function applyBuilderElementStyle(el,cfg={},palette={}){
    if(!el)return;
    clearBuilderStyle(el);
    const num=(v)=>Number.isFinite(Number(v))?Number(v):null;
    const x=num(cfg.x),y=num(cfg.y),w=num(cfg.w),h=num(cfg.h),fs=num(cfg.fontSize),radius=num(cfg.radius),padding=num(cfg.padding),opacity=num(cfg.opacity);
    if(x!==null||y!==null)el.style.translate=(x||0)+'px '+(y||0)+'px';
    if(w!==null&&w>0)el.style.width=w+'px';
    if(h!==null&&h>0)el.style.height=h+'px';
    if(fs!==null&&fs>0){el.style.fontSize=fs+'px';el.dataset.builderElementTextStyle='1';}
    if(cfg.fontFamily){el.style.fontFamily=String(cfg.fontFamily);el.dataset.builderElementTextStyle='1';}
    if(cfg.fontWeight){el.style.fontWeight=String(cfg.fontWeight);el.dataset.builderElementTextStyle='1';}
    if(radius!==null&&radius>=0)el.style.borderRadius=radius+'px';
    if(padding!==null&&padding>=0)el.style.padding=padding+'px';
    if(opacity!==null)el.style.opacity=String(Math.max(.1,Math.min(1,opacity/100)));
    const bgMode=String(cfg.bgMode||'').toLowerCase();
    const from=tokenColor(palette,cfg.bgFrom||'primary');
    const to=tokenColor(palette,cfg.bgTo||'secondary');
    if(bgMode==='none')el.style.background='transparent';
    if(bgMode==='solid')el.style.background=from;
    if(bgMode==='gradient'){
      const angle=Math.max(0,Math.min(360,Number(cfg.gradientAngle)||135));
      el.style.background='linear-gradient('+angle+'deg,'+from+','+to+')';
    }
    if(cfg.colorToken){
      const color=tokenColor(palette,cfg.colorToken);
      el.style.color=color;
      el.dataset.builderColored='true';
      el.dataset.builderElementTextStyle='1';
      (el.tagName==='svg'?[...el.querySelectorAll('*')]:[...el.querySelectorAll('svg *')]).forEach(n=>{
        const stroke=n.getAttribute('stroke');
        const fill=n.getAttribute('fill');
        if(stroke!==null&&stroke!=='none')n.style.stroke='currentColor';
        if(fill!==null&&fill!=='none'&&fill!=='transparent')n.style.fill='currentColor';
      });
    }
    if(cfg.borderToken==='none'){
      el.style.borderWidth='0px';
    } else if(cfg.borderToken){
      el.style.borderColor=tokenColor(palette,cfg.borderToken);
      el.style.borderStyle='solid';
      if(!el.style.borderWidth)el.style.borderWidth='1px';
    }
    const textTag=/^(H1|H2|H3|H4|P|SPAN|B|STRONG|SMALL|SUMMARY|LABEL)$/.test(el.tagName);
    let textTarget=textTag?el:null;
    if(!textTarget&&el.matches?.('button,a'))textTarget=el.querySelector('.cms-button-label,.builder-action-label,.v240-cta');
    if(textTarget){
      if(textTarget.dataset.builderBaseText==null)textTarget.dataset.builderBaseText=String(textTarget.textContent||'');
      textTarget.textContent=cfg.textOverride!=null?String(cfg.textOverride):textTarget.dataset.builderBaseText;
    }
    if(el.tagName==='IMG'){
      if(!el.dataset.builderBaseSrc)el.dataset.builderBaseSrc=el.currentSrc||el.src||'';
      if(el.dataset.builderBaseAlt==null)el.dataset.builderBaseAlt=el.alt||'';
      if(cfg.srcOverride){
        el.removeAttribute('data-optimized');
        el.src=String(cfg.srcOverride);
        if(cfg.altOverride!=null)el.alt=String(cfg.altOverride);
      }else if(el.dataset.builderBaseSrc){
        el.src=el.dataset.builderBaseSrc;
        el.alt=el.dataset.builderBaseAlt||'';
      }
    }
  }
  function markBuilderElement(slot,key,el,label){
    if(!el)return;
    el.dataset.cmsElement=key;
    if(label)el.dataset.cmsElementLabel=label;
    if(slot&&!el.closest('[data-cms-slot]'))el.dataset.cmsSlotOwner=slot;
  }
  function ensureDirectActionLabel(el){
    if(!el||el.querySelector('.cms-button-label,.builder-action-label'))return el?.querySelector('.cms-button-label,.builder-action-label')||null;
    const nodes=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent||'').trim());
    if(!nodes.length)return null;
    const span=document.createElement('span');
    span.className='builder-action-label';
    span.textContent=nodes.map(n=>String(n.textContent||'').trim()).join(' ');
    nodes.forEach(n=>n.remove());
    el.appendChild(span);
    return span;
  }
  function registerVisualElements(data){
    const slots=cmsSections();
    Object.entries(slots).forEach(([slot,root])=>{
      if(!root)return;
      markBuilderElement(slot,'section',root,'Fondo / sección');
    });

    const header=slots['site.header'];
    markBuilderElement('site.header','logo',header?.querySelector('.brand-logo'),'Logo');
    markBuilderElement('site.header','brand',header?.querySelector('.brand-name'),'Nombre de marca');
    markBuilderElement('site.header','menu',header?.querySelector('.menu'),'Botón de menú');
    markBuilderElement('site.header','menu_icon',header?.querySelector('.menu svg'),'Icono del menú');

    const hero=slots['home.hero'];
    markBuilderElement('home.hero','eyebrow',hero?.querySelector('.hero-copy .eyebrow'),'Etiqueta superior');
    markBuilderElement('home.hero','title',hero?.querySelector('.hero-copy h1'),'Título');
    markBuilderElement('home.hero','subtitle',hero?.querySelector('.hero-copy .hero-focus'),'Texto destacado');
    const heroBody=[...(hero?.querySelectorAll('.hero-copy > p')||[])].find(x=>!x.classList.contains('hero-focus'));
    markBuilderElement('home.hero','body',heroBody,'Texto de apoyo');
    markBuilderElement('home.hero','primary_button',hero?.querySelector('#heroBook'),'Botón Agendar');
    markBuilderElement('home.hero','primary_icon',hero?.querySelector('#heroBook svg'),'Icono Agendar');
    markBuilderElement('home.hero','whatsapp_button',hero?.querySelector('#heroWhatsApp'),'Botón WhatsApp');
    markBuilderElement('home.hero','whatsapp_icon',hero?.querySelector('#heroWhatsApp svg'),'Icono WhatsApp');
    markBuilderElement('home.hero','trust',hero?.querySelector('.trust'),'Datos rápidos');
    markBuilderElement('home.hero','image',hero?.querySelector('.hero-media img'),'Imagen principal');
    markBuilderElement('home.hero','caption',hero?.querySelector('.hero-caption'),'Texto sobre imagen');

    const start=slots['home.start'];
    markBuilderElement('home.start','heading',start?.querySelector('.section-head h2'),'Título de sección');
    const o1=start?.querySelector('#routeDirect'),o2=start?.querySelector('#routeExplore');
    markBuilderElement('home.start','option_1',o1,'Opción 1');
    markBuilderElement('home.start','option_1_icon',o1?.querySelector('.route-icon'),'Icono opción 1');
    markBuilderElement('home.start','option_2',o2,'Opción 2');
    markBuilderElement('home.start','option_2_icon',o2?.querySelector('.route-icon'),'Icono opción 2');

    const featured=slots['home.featured'];
    markBuilderElement('home.featured','heading',featured?.querySelector('.section-head h2'),'Título de sección');
    markBuilderElement('home.featured','subheading',featured?.querySelector('.section-head p'),'Texto de sección');
    featured?.querySelectorAll('[data-v240-category]').forEach(card=>{
      const slug=card.getAttribute('data-v240-category')||'item';
      markBuilderElement('home.featured','card.'+slug,card,'Tarjeta · '+slug);
      markBuilderElement('home.featured','media.'+slug,card.querySelector('.v240-media'),'Imagen · '+slug);
      markBuilderElement('home.featured','title.'+slug,card.querySelector('.v240-copy b'),'Título · '+slug);
      markBuilderElement('home.featured','cta.'+slug,card.querySelector('.v240-cta'),'Botón · '+slug);
    });

    const trust=slots['home.trust'];
    markBuilderElement('home.trust','card',trust?.querySelector('.trust-pro'),'Contenedor');
    markBuilderElement('home.trust','icon',trust?.querySelector('.trust-pro-icon'),'Icono');
    markBuilderElement('home.trust','title',trust?.querySelector('.trust-pro h2'),'Título');
    markBuilderElement('home.trust','body',trust?.querySelector('.trust-pro p'),'Texto');
    markBuilderElement('home.trust','chips',trust?.querySelector('.trust-chips'),'Datos rápidos');

    const faq=slots['home.faq'];
    markBuilderElement('home.faq','heading',faq?.querySelector('.cms-faq-title'),'Título');
    faq?.querySelectorAll('details').forEach((item,i)=>{
      markBuilderElement('home.faq','item.'+i,item,'Pregunta '+(i+1));
      markBuilderElement('home.faq','question.'+i,item.querySelector('summary'),'Pregunta '+(i+1));
      markBuilderElement('home.faq','answer.'+i,item.querySelector('p'),'Respuesta '+(i+1));
    });

    const profile=slots['home.profile'];
    markBuilderElement('home.profile','heading',profile?.querySelector('.section-head'),'Encabezado');
    markBuilderElement('home.profile','card',profile?.querySelector('.route'),'Tarjeta de perfil');

    const areas=slots['home.areas'];
    markBuilderElement('home.areas','heading',areas?.querySelector('.section-head'),'Encabezado');
    areas?.querySelectorAll('.route').forEach((card,i)=>{
      markBuilderElement('home.areas','card.'+i,card,'Tarjeta de área '+(i+1));
      markBuilderElement('home.areas','icon.'+i,card.querySelector('.route-icon'),'Icono área '+(i+1));
    });

    const footer=slots['site.footer'];
    markBuilderElement('site.footer','logo',footer?.querySelector('.footer-brand img'),'Logo');
    markBuilderElement('site.footer','brand',footer?.querySelector('.cms-footer-brand-text'),'Nombre');
    markBuilderElement('site.footer','meta',footer?.querySelector('.footer-meta'),'Datos');
    markBuilderElement('site.footer','whatsapp_button',footer?.querySelector('.footer-wa'),'Botón WhatsApp');
    markBuilderElement('site.footer','whatsapp_icon',footer?.querySelector('.footer-wa svg'),'Icono WhatsApp');
    markBuilderElement('site.footer','booking_button',footer?.querySelector('.footer-book'),'Botón Agendar');
    markBuilderElement('site.footer','booking_icon',footer?.querySelector('.footer-book svg'),'Icono Agendar');
    markBuilderElement('site.footer','note',footer?.querySelector('.footer-note'),'Nota');

    Object.entries(slots).forEach(([slot,root])=>{
      if(!root)return;
      root.querySelectorAll('button,a').forEach(ensureDirectActionLabel);
      const register=(selector,prefix,label)=>{
        let n=0;
        root.querySelectorAll(selector).forEach(el=>{
          if(el.dataset.cmsElement)return;
          markBuilderElement(slot,prefix+'.'+(n++),el,label+' '+n);
        });
      };
      register('button,a','action','Botón / enlace');
      register('.cms-button-label,.builder-action-label,.v240-cta','action_label','Texto de botón');
      register('img','image','Imagen');
      register('svg.icon,.route-icon,.trust-pro-icon','icon','Icono');
      register('article,.route,.unit,details,.trust-chip,.trust > div','container','Contenedor');
    });
  }
  function builderSlotOfElement(el){
    const root=el?.closest('[data-cms-slot]');
    return root?.dataset.cmsSlot||el?.dataset.cmsSlotOwner||null;
  }
  function textNodesForTypography(root){
    if(!root)return[];
    const selector='h1,h2,h3,h4,p,span,b,strong,small,a,button,summary,label';
    const nodes=[...root.querySelectorAll(selector)];
    if(root.matches?.(selector))nodes.unshift(root);
    return [...new Set(nodes)].filter(el=>!el.closest('svg'));
  }
  function resetTypographyTouched(root=document){
    root.querySelectorAll?.('[data-builder-typography-touched="1"]').forEach(el=>{
      const base=el.dataset.builderTypographyBase;
      if(base){
        try{
          const x=JSON.parse(base);
          el.style.fontFamily=x.fontFamily||'';
          el.style.fontWeight=x.fontWeight||'';
          el.style.fontSize=x.fontSize||'';
          el.style.color=x.color||'';
        }catch{}
      }
      delete el.dataset.builderTypographyTouched;
      delete el.dataset.builderTypographyBase;
    });
  }
  function applyTypographyScope(root,cfg,palette){
    if(!root||!cfg||typeof cfg!=='object')return;
    const scale=Number(cfg.fontScale);
    for(const el of textNodesForTypography(root)){
      if(!el.dataset.builderTypographyBase){
        el.dataset.builderTypographyBase=JSON.stringify({
          fontFamily:el.style.fontFamily||'',
          fontWeight:el.style.fontWeight||'',
          fontSize:el.style.fontSize||'',
          color:el.style.color||''
        });
      }
      el.dataset.builderTypographyTouched='1';
      if(cfg.fontFamily)el.style.fontFamily=String(cfg.fontFamily);
      if(cfg.fontWeight)el.style.fontWeight=String(cfg.fontWeight);
      if(cfg.colorToken)el.style.color=tokenColor(palette,cfg.colorToken);
      if(Number.isFinite(scale)&&scale>0){
        const current=parseFloat(getComputedStyle(el).fontSize)||16;
        const baseAttr=el.dataset.builderTypographyComputedBase;
        const base=baseAttr?Number(baseAttr):current;
        if(!baseAttr)el.dataset.builderTypographyComputedBase=String(base);
        el.style.fontSize=(base*scale/100)+'px';
      }
    }
  }
  function applyTypographySettings(data){
    const device=builderDevice(),palette=builderPalette(data);
    resetTypographyTouched(document);
    const globalSlot=contentSlot(data,'site.header');
    const globalCfg=globalSlot?.settings?.globalTypography?.[device]||null;
    if(globalCfg)applyTypographyScope(document.body,globalCfg,palette);
    for(const slot of data.content||[]){
      const cfg=slot?.settings?.sectionTypography?.[device]||null;
      if(!cfg)continue;
      const root=document.querySelector('[data-cms-slot="'+CSS.escape(slot.slot_key)+'"]');
      if(root)applyTypographyScope(root,cfg,palette);
    }
  }
  function applyVisualElementStyles(data){
    resetBuilderElementTextStyles();
    applyTypographySettings(data);
    const device=builderDevice(),palette=builderPalette(data);
    document.querySelectorAll('[data-cms-element]').forEach(el=>{
      const slotKey=builderSlotOfElement(el);
      const slot=contentSlot(data,slotKey);
      const styleCfg=slot?.settings?.builder?.[device]?.[el.dataset.cmsElement]||{};
      const contentCfg=slot?.settings?.builderContent?.[el.dataset.cmsElement]||{};
      applyBuilderElementStyle(el,{...contentCfg,...styleCfg},palette);
    });
  }
  let builderResizeTimer=null;
  function bindBuilderResponsive(data){
    if(window.__olanoBuilderResponsiveBound)return;
    window.__olanoBuilderResponsiveBound=true;
    window.addEventListener('resize',()=>{
      clearTimeout(builderResizeTimer);
      builderResizeTimer=setTimeout(()=>applyVisualElementStyles(window.OLANO_BUSINESS_CONFIG||data),120);
    });
  }
  window.OLANO_BUILDER_API={
    builderDevice,
    builderPalette,
    applyBuilderElementStyle,
    applyTypographySettings,
    registerVisualElements,
    applyVisualElementStyles,
    builderSlotOfElement
  };

function addStyles(){
    if(document.getElementById('olano-business-config-styles'))return;
    const st=document.createElement('style');
    st.id='olano-business-config-styles';
    st.textContent='.v238-rail-icon svg,.v238-category-title-icon svg{width:100%;height:100%;display:block;color:var(--navy)}'+
      '#unidades .v240-media.dynamic-icon{display:grid!important;place-items:center!important;background:linear-gradient(145deg,#edf8f6,#f8fbfb)!important}'+
      '#unidades .olano-dynamic-category-icon{width:34%!important;height:34%!important;display:grid!important;place-items:center!important;color:var(--navy)}'+
      '#unidades .olano-dynamic-category-icon svg{width:100%!important;height:100%!important;display:block!important;animation:none!important}';
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
      applyContent(data);
      registerVisualElements(data);
      applyVisualElementStyles(data);
      bindBuilderResponsive(data);
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