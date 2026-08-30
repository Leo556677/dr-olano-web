(()=>{
  'use strict';

  const specs=[
    {sel:'.unit.estetica .unit-media img',parts:['assets/v20/e0.b64','assets/v20/e1.b64','assets/v20/e2.b64']},
    {sel:'.unit.dolor .unit-media img',parts:['assets/v20/d0.b64','assets/v20/d1.b64','assets/v20/d2.b64']},
    {sel:'.unit.metabolismo .unit-media img',parts:['assets/v20/m0.b64','assets/v20/m1.b64','assets/v20/m2.b64']}
  ];

  async function loadBase64(parts){
    const chunks=await Promise.all(parts.map(async path=>{
      const response=await fetch(path+'?v=20',{cache:'force-cache'});
      if(!response.ok) throw new Error(path+': HTTP '+response.status);
      return (await response.text()).replace(/\s+/g,'');
    }));
    return chunks.join('');
  }

  function base64ToBlobUrl(encoded){
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  }

  async function apply(spec){
    const img=document.querySelector(spec.sel);
    if(!img) return;
    try{
      const encoded=await loadBase64(spec.parts);
      const objectUrl=base64ToBlobUrl(encoded);
      img.removeAttribute('data-optimized');
      img.loading='lazy';
      img.decoding='async';
      img.addEventListener('load',()=>URL.revokeObjectURL(objectUrl),{once:true});
      img.src=objectUrl;
    }catch(error){
      console.error('Dr. Olano V20 image load failed:',spec.sel,error);
    }
  }

  function run(){ specs.forEach(apply); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
