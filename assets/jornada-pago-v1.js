// Jornada de cirugía facial (nov 2026) · pago para separar la cita dentro de la reserva.
// Solo para quien llega desde /jornada (sessionStorage olanoOrigen). Muestra Yape, BCP y CCI
// con botones de copiar en "Revisa tu solicitud" (paso 4) y en "Cita reservada" (paso 5).
(()=>{
  let jornada=false;
  try{jornada=sessionStorage.getItem('olanoOrigen')==='jornada-cirugia-nov-2026'}catch{}
  if(!jornada)return;
  const booking=document.querySelector('#booking');
  if(!booking)return;

  const DATA=[
    {label:'Yape',show:'981 214 007',value:'981214007'},
    {label:'BCP · cuenta',show:'191-90200628044',value:'19190200628044'},
    {label:'CCI · desde otro banco',show:'00219119020062804456',value:'00219119020062804456'}
  ];
  const ICON_WALLET='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>';
  const ICON_COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M4.5 15.5A2 2 0 0 1 3 13.500v-8A2.500 2.500 0 0 1 5.500 3h8a2 2 0 0 1 2 1.500"/></svg>';
  const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  const style=document.createElement('style');
  style.id='olano-jornada-pago-styles';
  style.textContent=`
    .jpago{margin:14px 0 4px;padding:16px 16px 12px;border-radius:20px;background:#0b2e4f;color:#fff;text-align:left}
    .jpago-h{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;align-items:center}
    .jpago-ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(127,227,217,.16);color:#7fe3d9}
    .jpago-ic svg{width:23px;height:23px}
    .jpago-h b{display:block;font-size:1.02rem;line-height:1.25}
    .jpago-h small{display:block;margin-top:2px;font-size:.78rem;line-height:1.35;color:#cfe3ee}
    .jpago-l{list-style:none;margin:12px 0 0;padding:0}
    .jpago-l li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid rgba(255,255,255,.14)}
    .jpago-l small{display:block;font-size:.72rem;color:#bcd0dc}
    .jpago-l b{display:block;font-size:1.02rem;letter-spacing:.01em;overflow-wrap:anywhere}
    .jpago-l b.long{font-size:.8rem;letter-spacing:0}
    .jpago-c{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:104px;min-height:44px;padding:0 14px;border:0;border-radius:999px;background:#7fe3d9;color:#061d33;font-family:inherit;font-weight:700;font-size:.84rem;cursor:pointer;transition:background .2s,color .2s,transform .12s}
    .jpago-c:active{transform:scale(.97)}
    .jpago-c svg{width:16px;height:16px;flex:none}
    .jpago-c.ok{background:#fff;color:#0f827a}
    .jpago-c.busy{pointer-events:none}
    .jpago-c.busy>*{visibility:hidden}
    .jpago-c.busy::after{content:"";position:absolute;width:18px;height:18px;border:2.5px solid rgba(6,29,51,.25);border-top-color:#061d33;border-radius:50%;animation:jpagoSpin .7s linear infinite}
    @keyframes jpagoSpin{to{transform:rotate(360deg)}}
    .jpago-f{margin:8px 0 0;font-size:.76rem;line-height:1.4;color:#cfe3ee}
    .done .jpago{margin:16px 0 14px}
    @media (prefers-reduced-motion:reduce){.jpago-c,.jpago-c.busy::after{transition:none;animation:none}}
  `;
  document.head.appendChild(style);

  function build(id,foot){
    const box=document.createElement('div');
    box.className='jpago';box.id=id;
    box.innerHTML=`<div class="jpago-h"><span class="jpago-ic">${ICON_WALLET}</span><div><b>Separa tu cita con S/&nbsp;20</b><small>Se descuentan de tu evaluación: ese día pagas S/&nbsp;50.</small></div></div>`+
      `<ul class="jpago-l">${DATA.map(d=>`<li><div><small>${d.label}</small><b${d.show.length>16?' class="long"':''}>${d.show}</b></div><button type="button" class="jpago-c" data-jcopy="${d.value}">${ICON_COPY}<span>Copiar</span></button></li>`).join('')}</ul>`+
      `<p class="jpago-f">A nombre de Kamo Martin Olano Paredes. ${foot}</p>`;
    return box;
  }

  function ensure(){
    const summary=booking.querySelector('#summary');
    if(summary&&!booking.querySelector('#jornadaPago4')){
      summary.insertAdjacentElement('afterend',build('jornadaPago4','Al reservar se abre WhatsApp: envía ahí tu constancia para confirmar tu horario.'));
    }
    const wa=booking.querySelector('.step[data-step="5"] #openWhatsApp');
    if(wa&&!booking.querySelector('#jornadaPago5')){
      wa.insertAdjacentElement('beforebegin',build('jornadaPago5','Envía tu constancia por WhatsApp para confirmar tu horario.'));
    }
  }

  function legacyCopy(text){
    const t=document.createElement('textarea');
    t.value=text;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-999px;top:0';
    document.body.appendChild(t);t.select();
    let ok=false;try{ok=document.execCommand('copy')}catch{}
    t.remove();
    return ok?Promise.resolve():Promise.reject(new Error('copy'));
  }

  booking.addEventListener('click',e=>{
    const btn=e.target.closest('[data-jcopy]');
    if(!btn||btn.classList.contains('busy'))return;
    e.preventDefault();
    const value=btn.dataset.jcopy,label=btn.querySelector('span');
    btn.classList.add('busy');
    const done=(navigator.clipboard&&window.isSecureContext)?navigator.clipboard.writeText(value).catch(()=>legacyCopy(value)):legacyCopy(value);
    done.then(()=>{
      btn.classList.remove('busy');btn.classList.add('ok');
      btn.querySelector('svg').outerHTML=ICON_CHECK;label.textContent='¡Copiado!';
    },()=>{
      btn.classList.remove('busy');label.textContent='Mantén presionado el número';
    }).then(()=>setTimeout(()=>{
      btn.classList.remove('ok');
      btn.querySelector('svg').outerHTML=ICON_COPY;label.textContent='Copiar';
    },2000));
  });

  ensure();
  new MutationObserver(()=>ensure()).observe(booking,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
