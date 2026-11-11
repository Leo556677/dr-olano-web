import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const ALLOWED_ORIGINS = new Set(["https://doctorolano.pe"]);
const EVENTS = new Set(["landing_view","service_selected","offer_accepted","offer_declined","booking_started","booking_registered","whatsapp_opened"]);
const SOURCES = new Set(["direct","meta","tiktok","google","organic","other","unknown"]);
// Caracteres de control. Se escriben con \x (no \u) para que ningún escape doble
// convierta la clase en «backslash, u, dígitos, A-Z…», que era lo que borraba la «u» y los números.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://doctorolano.pe";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: Record<string, unknown>, status=200, origin: string | null=null){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}});
}
function validOrigin(origin: string | null){ return !origin || ALLOWED_ORIGINS.has(origin); }
function cleanText(value: unknown, max: number){
  const s=String(value??"").replace(CONTROL_CHARS," ").trim().replace(/\s+/g," ");
  return s ? s.slice(0,max) : null;
}
function cleanId(value: unknown){
  const s=String(value??"").trim();
  if(!s || s.length>128 || !/^[A-Za-z0-9._:-]+$/.test(s)) return null;
  return s;
}

export default {
  fetch: withSupabase({auth:"none"}, async (req,ctx)=>{
    const origin=req.headers.get("origin");
    if(req.method==="OPTIONS"){
      if(!validOrigin(origin)) return json({ok:false,code:"ORIGIN_DENIED"},403,origin);
      return new Response(null,{status:204,headers:cors(origin)});
    }
    if(req.method!=="POST") return json({ok:false,code:"METHOD_NOT_ALLOWED"},405,origin);
    if(!validOrigin(origin)) return json({ok:false,code:"ORIGIN_DENIED"},403,origin);

    let body:any;
    try{ body=await req.json(); }catch{ return json({ok:false,code:"INVALID_JSON"},400,origin); }
    const sessionId=String(body?.session_id||"").trim();
    const eventName=String(body?.event_name||"").trim();
    const sourceRaw=String(body?.source||"unknown").trim().toLowerCase();
    const source=SOURCES.has(sourceRaw)?sourceRaw:"other";
    const bookingId=body?.booking_id==null?null:String(body.booking_id).trim();
    const a=body?.attribution && typeof body.attribution==="object" ? body.attribution : {};

    if(!/^[A-Za-z0-9_-]{16,100}$/.test(sessionId)) return json({ok:false,code:"INVALID_SESSION"},400,origin);
    if(!EVENTS.has(eventName)) return json({ok:false,code:"INVALID_EVENT"},400,origin);
    if(bookingId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId)) return json({ok:false,code:"INVALID_BOOKING"},400,origin);

    const row:any={
      session_id:sessionId,event_name:eventName,source,
      utm_source:cleanText(a.utm_source,80),
      utm_medium:cleanText(a.utm_medium,80),
      utm_campaign:cleanText(a.utm_campaign,300),
      utm_content:cleanText(a.utm_content,300),
      utm_term:cleanText(a.utm_term,300),
      utm_id:cleanId(a.utm_id),
      campaign_id:cleanId(a.campaign_id),
      campaign_name:cleanText(a.campaign_name,300),
      adgroup_id:cleanId(a.adgroup_id),
      adgroup_name:cleanText(a.adgroup_name,300),
      ad_id:cleanId(a.ad_id),
      ad_name:cleanText(a.ad_name,300),
      creative_id:cleanId(a.creative_id),
      creative_name:cleanText(a.creative_name,300),
      placement:cleanText(a.placement,80)
    };
    if(bookingId) row.booking_id=bookingId;
    const {error}=await ctx.supabaseAdmin.from("dr_olano_funnel_events").upsert(row,{onConflict:"session_id,event_name"});
    if(error) return json({ok:false,code:"FUNNEL_WRITE_FAILED"},500,origin);
    return json({ok:true},200,origin);
  })
};
