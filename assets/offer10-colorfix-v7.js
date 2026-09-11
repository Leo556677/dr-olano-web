(()=>{
  if(typeof state==='undefined')return;

  const STORE='olanoOffer10V2';
  const STYLE_ID='offer10-colorfix-v7';

  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @property --offer10-c1{syntax:'<color>';inherits:false;initial-value:#0f827a}
      @property --offer10-c2{syntax:'<color>';inherits:false;initial-value:#67d2c8}
      @property --offer10-shadow-color{syntax:'<color>';inherits:false;initial-value:#0f827a}

      #v252SelectedServiceBanner .offer10-inline-offer{
        --offer10-c1:#0f827a;
        --offer10-c2:#67d2c8;
        --offer10-shadow-color:#0f827a;
        background:linear-gradient(135deg,var(--offer10-c1) 0%,var(--offer10-c2) 100%)!important;
        box-shadow:0 8px 20px -13px var(--offer10-shadow-color)!important;
        transition:--offer10-c1 .85s linear,--offer10-c2 .85s linear,--offer10-shadow-color .85s linear,border-color .85s linear!important;
      }

      .offer10-progress-fill{
        --offer10-c1:#0f827a;
        --offer10-c2:#67d2c8;
        --offer10-shadow-color:#0f827a;
        background:linear-gradient(90deg,var(--offer10-c1) 0%,var(--offer10-c2) 100%)!important;
        box-shadow:0 0 20px color-mix(in srgb,var(--offer10-shadow-color) 32%,transparent)!important;
        transition:width .42s linear,--offer10-c1 .85s linear,--offer10-c2 .85s linear,--offer10-shadow-color .85s linear!important;
      }
    `;
    document.head.appendChild(style);
  }

  function read(){
    try{return JSON.parse(sessionStorage.getItem(STORE)||'null')}catch{return null}
  }
  function left(o){return Math.max(0,new Date(o?.claim?.expires_at||0).getTime()-Date.now())}
  function duration(o){
    const a=new Date(o?.claim?.issued_at||0).getTime();
    const b=new Date(o?.claim?.expires_at||0).getTime();
    return Math.max(1,b-a);
  }
  function mix(a,b,t){return Math.round(a+(b-a)*t)}
  function hexRgb(h){const x=h.replace('#','');return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]}
  function rgbHex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')}
  function mixHex(a,b,t){
    const x=hexRgb(a),y=hexRgb(b);
    return rgbHex([mix(x[0],y[0],t),mix(x[1],y[1],t),mix(x[2],y[2],t)]);
  }

  // 5:00 teal → 3:00 amarillo → 2:00 naranja → 1:00 rojo → 0:00 rojo profundo.
  const STOPS=[
    {p:1.00,a:'#0f827a',b:'#67d2c8'},
    {p:.60,a:'#c0a313',b:'#e3ca49'},
    {p:.40,a:'#c86c14',b:'#ef9634'},
    {p:.20,a:'#b42c32',b:'#e24e42'},
    {p:0.00,a:'#7e1721',b:'#be2832'}
  ];

  function urgency(o){
    if(o?.redeemed)return {a:'#0f827a',b:'#67d2c8'};
    const ratio=Math.max(0,Math.min(1,left(o)/duration(o)));
    let hi=STOPS[0],lo=STOPS[STOPS.length-1],t=0;
    for(let i=0;i<STOPS.length-1;i++){
      if(ratio<=STOPS[i].p&&ratio>=STOPS[i+1].p){
        hi=STOPS[i];lo=STOPS[i+1];
        t=(hi.p-ratio)/(hi.p-lo.p);
        break;
      }
    }
    return {a:mixHex(hi.a,lo.a,t),b:mixHex(hi.b,lo.b,t)};
  }

  function apply(){
    const o=read();
    if(!o)return;

    const expired=(left(o)<=0||o.expired===true)&&!o.redeemed;
    const u=expired?{a:'#7e1721',b:'#be2832'}:urgency(o);

    document.querySelectorAll('#v252SelectedServiceBanner .offer10-inline-offer').forEach(el=>{
      el.style.setProperty('--offer10-c1',u.a);
      el.style.setProperty('--offer10-c2',u.b);
      el.style.setProperty('--offer10-shadow-color',u.a);
    });

    const fill=document.querySelector('#offer10ProgressFill');
    if(fill){
      fill.style.setProperty('--offer10-c1',u.a);
      fill.style.setProperty('--offer10-c2',u.b);
      fill.style.setProperty('--offer10-shadow-color',u.a);
    }
  }

  const booking=document.querySelector('#booking');
  if(booking){
    new MutationObserver(()=>queueMicrotask(apply)).observe(booking,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }

  apply();
  setInterval(apply,250);
})();