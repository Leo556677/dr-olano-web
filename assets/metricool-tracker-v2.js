(()=>{
  const HASH="ceb5747e54ceed1315bef26305f52473";
  const KEEP_PARAMS=new Set(["utm_source","utm_medium","utm_campaign","utm_content","utm_term","utm_id"]);
  const originalHref=window.location.href;
  const originalState=history.state;

  function safeHref(){
    try{
      const u=new URL(window.location.href);
      const safe=new URL(u.origin+u.pathname);
      for(const [k,v] of u.searchParams.entries()){
        if(KEEP_PARAMS.has(k))safe.searchParams.append(k,v);
      }
      return safe.toString();
    }catch{return window.location.origin+window.location.pathname}
  }

  function restore(expectedSafe){
    try{
      if(window.location.href===expectedSafe&&originalHref!==expectedSafe){
        history.replaceState(originalState,"",originalHref);
      }
    }catch{}
  }

  function start(){
    const safe=safeHref();
    try{
      if(window.location.href!==safe)history.replaceState(history.state,"",safe);
    }catch{}

    const done=()=>{
      try{
        if(window.beTracker&&typeof window.beTracker.t==="function"){
          window.beTracker.t({hash:HASH});
        }
      }finally{
        setTimeout(()=>restore(safe),350);
      }
    };

    if(window.beTracker&&typeof window.beTracker.t==="function"){done();return}
    const s=document.createElement("script");
    s.type="text/javascript";
    s.async=true;
    s.src="https://tracker.metricool.com/resources/be.js";
    s.onload=done;
    s.onreadystatechange=function(){
      if(this.readyState==="loaded"||this.readyState==="complete")done();
    };
    s.onerror=()=>restore(safe);
    document.head.appendChild(s);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }
})();