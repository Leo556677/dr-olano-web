import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://xnlzsgulskqyecfgzhwa.supabase.co','sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const ORDER=['landing_view','service_selected','offer_accepted','offer_declined','booking_started','booking_registered','whatsapp_opened','attended','no_show'];
const LABEL={landing_view:'Visitas',service_selected:'Servicio elegido',offer_accepted:'Oferta aceptada',offer_declined:'Oferta rechazada',booking_started:'Reserva iniciada',booking_registered:'Cita registrada',whatsapp_opened:'WhatsApp abierto',attended:'Paciente atendido',no_show:'No asistió'};
function ensure(){
  if(document.getElementById('funnelCard'))return document.getElementById('funnelCard');
  const target=document.querySelector('main#app .grid');if(!target)return null;
  const card=document.createElement('section');card.id='funnelCard';card.className='card';
  card.style.gridColumn='1/-1';
  card.innerHTML='<div class="section-title"><h2>Embudo de conversión · 30 días</h2><span id="funnelUpdated" class="sub"></span></div><div id="funnelGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin-top:12px"></div><div class="sub" style="margin-top:10px">Medición propia: no guarda nombre, celular, comentario ni servicio médico en este embudo.</div>';
  target.insertAdjacentElement('afterend',card);return card;
}
async function load(){
  const card=ensure();if(!card)return;
  const {data:{session}}=await sb.auth.getSession();if(!session){card.style.display='none';return}card.style.display='block';
  const {data,error}=await sb.rpc('admin_dr_olano_funnel_resumen',{p_days:30});
  const grid=document.getElementById('funnelGrid');if(!grid)return;
  if(error){grid.innerHTML='<div class="sub">No se pudo cargar el embudo.</div>';return}
  const totals=Object.fromEntries(ORDER.map(x=>[x,0]));
  const sources={meta:0,tiktok:0,google:0,direct:0,organic:0,other:0,unknown:0};
  for(const r of data||[]){if(r.event_name in totals)totals[r.event_name]+=Number(r.total||0);if(r.event_name==='landing_view'&&r.source in sources)sources[r.source]+=Number(r.total||0)}
  const main=['landing_view','service_selected','booking_started','booking_registered','whatsapp_opened','attended'];
  grid.innerHTML=main.map(k=>`<div style="border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff"><strong style="font-size:22px;color:var(--navy);display:block">${totals[k]}</strong><span class="sub">${LABEL[k]}</span></div>`).join('');
  const extra=document.createElement('div');extra.style.cssText='grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;margin-top:2px';
  const offer=`Oferta: ${totals.offer_accepted} aceptaron · ${totals.offer_declined} rechazaron`;
  const src=`Origen visitas: Meta ${sources.meta} · TikTok ${sources.tiktok} · Google ${sources.google} · Directo ${sources.direct} · Otros ${sources.organic+sources.other+sources.unknown}`;
  extra.innerHTML=`<span class="badge b-confirmada">${offer}</span><span class="badge b-pendiente">${src}</span><span class="badge b-no_asistio">No asistieron ${totals.no_show}</span>`;grid.appendChild(extra);
  const u=document.getElementById('funnelUpdated');if(u)u.textContent='Actualizado '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}
window.addEventListener('load',()=>setTimeout(load,700));
setInterval(load,60000);