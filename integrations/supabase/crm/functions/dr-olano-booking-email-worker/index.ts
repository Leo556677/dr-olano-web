// Correo de confirmación de citas, SOLO servidor. No desplegar sin proveedor verificado.
// Requiere RESEND_API_KEY, DR_OLANO_BOOKING_FROM y Vault para x-dr-olano-cron.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { renderBookingConfirmationEmail } from './booking-confirmation-template.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

Deno.serve(async request=>{
  if(request.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405);
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('DR_OLANO_BOOKING_FROM');
  const cronSecret=request.headers.get('x-dr-olano-cron')||'';
  if(!url||!key||!cronSecret) return json({error:'NOT_CONFIGURED'},503);

  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:allowed,error:authError}=await admin.rpc('validar_dr_olano_integrations_cron',{p_secret:cronSecret});
  if(authError||allowed!==true)return json({error:'UNAUTHORIZED'},401);

  // Nunca reclamar tareas si no existe un proveedor autorizado para enviar correos.
  if(!provider||!from||!/\b[A-Za-z0-9._%+-]+@doctorolano\.pe\b/i.test(from)){
    return json({error:'MAIL_PROVIDER_NOT_CONFIGURED'},503);
  }

  const {data:jobs,error:claimError}=await admin.rpc('dr_olano_booking_email_claim',{p_limit:10});
  if(claimError)return json({error:'CLAIM_FAILED'},500);
  let processed=0,failed=0,skipped=0;
  for(const job of jobs||[]){
    let sent=false,skip=false,code=null;
    try{
      if(job.appointment_state!=='confirmada'){
        skip=true;
      }else{
        const rendered=renderBookingConfirmationEmail({
          patientName:job.patient_name,
          bookingCode:job.booking_code,
          serviceName:job.service_name,
          startsAt:job.starts_at,
          discount:job.discount_pct===null
            ? null:{verified:true,percent:Number(job.discount_pct)}
        });
        const providerReply=await fetch('https://api.resend.com/emails',{
          method:'POST',
          headers:{
            Authorization:'Bearer '+provider,
            'Content-Type':'application/json',
            'Idempotency-Key':'dr-olano-confirmacion/'+String(job.cita_id),
          },
          body:JSON.stringify({
            from,
            to:[job.recipient_email],
            subject:rendered.subject,
            html:rendered.html,
            text:rendered.text,
          }),
          signal:AbortSignal.timeout(12000),
        });
        if(!providerReply.ok)throw Error('MAIL_HTTP_'+providerReply.status);
        sent=true;
      }
    }catch(e){
      failed++;
      const m=String(e?.message||'');
      code=/^MAIL_HTTP_[0-9]{3}$/.test(m)?m:'MAIL_DELIVERY_FAILED';
      // Evitar nombres, emails y tratamientos en registros.
    }
    const {error:finishError}=await admin.rpc('dr_olano_booking_email_finish',{
      p_cita_id:job.cita_id,p_ok:sent,p_skip:skip,p_error_code:code,
    });
    if(finishError)failed++;
    if(skip)skipped++;
    processed++;
  }
  return json({ok:failed===0,processed,skipped,failed},failed?207:200);
});
