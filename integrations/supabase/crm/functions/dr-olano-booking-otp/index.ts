// STAGING SOURCE ONLY: desplegar con slug NUEVO dr-olano-booking-otp después de la migración.
// Requiere verify_jwt=false, igual que el endpoint de reservas existente.
// La función verifica el token Auth de OTRO proyecto (app), no el JWT del CRM,
// y exige Turnstile para crear reservas; sin ello el gateway rechazaría solicitudes válidas.
// Se preservan todos los controles de disponibilidad, Turnstile y antispam de la versión 16.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { DateTime } from "npm:luxon@3.5.0";

const BUSINESS_SLUG = "dr-olano";
const EXPECTED_HOSTNAME = "doctorolano.pe";
const TURNSTILE_SITE_KEY = "0x4AAAAAAEquPSErt1V9EL1G";
const ALLOWED_ORIGINS = new Set(["https://doctorolano.pe"]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://doctorolano.pe";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) } });
}
function validOrigin(origin: string | null) { return !origin || ALLOWED_ORIGINS.has(origin); }
function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) return `+51${digits}`;
  if (/^519\d{8}$/.test(digits)) return `+${digits}`;
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return "";
}
function normalizeNote(raw: unknown) { return String(raw ?? "").trim().replace(/\s+/g, " "); }
function b64url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function randomManageToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret: string, value: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getClientIp(req: Request) {
  const direct = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (direct) return direct.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "";
}
async function verifyTurnstile(token: string, ip: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (!secret) return { ok: false, code: "TURNSTILE_NOT_CONFIGURED", status: 503 };
  if (!token || token.length > 2048) return { ok: false, code: "TURNSTILE_REQUIRED", status: 400 };
  const payload: Record<string, string> = { secret, response: token };
  if (ip) payload.remoteip = ip;
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch { return { ok: false, code: "TURNSTILE_UNAVAILABLE", status: 503 }; }
  if (!response.ok) return { ok: false, code: "TURNSTILE_UNAVAILABLE", status: 503 };
  const result: any = await response.json();
  if (result?.success !== true) return { ok: false, code: "TURNSTILE_FAILED", status: 403, errors: result?.["error-codes"] || [] };
  if (String(result?.hostname || "") !== EXPECTED_HOSTNAME) return { ok: false, code: "TURNSTILE_HOSTNAME_MISMATCH", status: 403 };
  if (result?.action && String(result.action) !== "booking") return { ok: false, code: "TURNSTILE_ACTION_MISMATCH", status: 403 };
  return { ok: true, secret };
}
function mapBookingError(message: string) {
  const m = String(message || "");
  if (m.includes("PATIENT_IDENTITY_CHANGE_REQUIRES_REVIEW")) return {
    status: 409,
    code: "PATIENT_PROFILE_REVIEW_REQUIRED",
    message: "Este correo ya tiene una ficha asociada. Contacta al consultorio para validar cualquier cambio en tus datos.",
  };
  if (m.includes("RATE_LIMIT_1H")) return { status: 429, code: "RATE_LIMIT_1H", message: "Ya se registró una cita desde este celular, red o dispositivo. Intenta nuevamente en 1 hora." };
  if (m.includes("HOUR_FULL")) return { status: 409, code: "HOUR_FULL", message: "Esa hora acaba de completar sus 3 cupos. Elige otro horario." };
  if (m.includes("BLOCKED_SLOT")) return { status: 409, code: "BLOCKED_SLOT", message: "Ese horario ya no está disponible." };
  if (m.includes("SLOT_BUSY")) return { status: 409, code: "SLOT_BUSY", message: "Ese horario ya fue ocupado. Elige otro." };
  if (m.includes("OUTSIDE_SCHEDULE")) return { status: 409, code: "OUTSIDE_SCHEDULE", message: "El horario está fuera de la agenda disponible." };
  if (m.includes("SERVICE_DAY_UNAVAILABLE")) return { status: 409, code: "SERVICE_DAY_UNAVAILABLE", message: "Este servicio no está disponible ese día." };
  if (m.includes("INVALID_MODALITY")) return { status: 400, code: "INVALID_MODALITY", message: "Selecciona una modalidad válida para este servicio." };
  if (m.includes("INVALID_NOTE")) return { status: 400, code: "INVALID_NOTE", message: "El comentario es demasiado largo." };
  if (m.includes("TOO_SOON")) return { status: 409, code: "TOO_SOON", message: "Ese horario ya no puede reservarse por la anticipación mínima." };
  if (m.includes("OUT_OF_HORIZON")) return { status: 409, code: "OUT_OF_HORIZON", message: "La fecha está fuera del rango disponible." };
  if (m.includes("INVALID_SLOT_GRID")) return { status: 400, code: "INVALID_SLOT", message: "El horario seleccionado no es válido." };
  return { status: 500, code: "BOOKING_FAILED", message: "No se pudo registrar la cita." };
}
function mapManageError(message: string) {
  const m = String(message || "");
  if (m.includes("INVALID_TOKEN")) return { status: 404, code: "INVALID_TOKEN", message: "El enlace de gestión no es válido o venció." };
  if (m.includes("INVALID_STATE")) return { status: 409, code: "INVALID_STATE", message: "Esta cita ya no puede modificarse." };
  return mapBookingError(m);
}


// Verificamos el token contra el proyecto Auth de la APP, nunca confiamos
// en un correo ni un UUID enviados desde el navegador.
const PATIENT_AUTH_URL = "https://pxccwrhtmwkwrzofuphj.supabase.co";
const PATIENT_AUTH_PUBLISHABLE_KEY = "sb_publishable_kKxqpfyz6MwFPyIrDo7X6w_yWy-OkNb";
async function verifyPatientAppToken(token: string): Promise<string | null> {
  if (!token || token.length > 4096 || !/^[A-Za-z0-9._-]+$/.test(token)) return null;
  const reply = await fetch(PATIENT_AUTH_URL + "/auth/v1/user", {
    headers: {
      apikey: PATIENT_AUTH_PUBLISHABLE_KEY,
      Authorization: "Bearer " + token,
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!reply.ok) return null;
  const user: any = await reply.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(user?.id || "")) || !user?.email || !user?.email_confirmed_at) return null;
  return String(user.id);
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") {
      if (!validOrigin(origin)) return json({ ok: false, code: "ORIGIN_DENIED" }, 403, origin);
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (!validOrigin(origin)) return json({ ok: false, code: "ORIGIN_DENIED" }, 403, origin);
    if (req.method === "GET") return json({ ok: true, service: "dr-olano-booking-otp", version: "1.5.0", site_key: TURNSTILE_SITE_KEY, turnstile_configured: Boolean(Deno.env.get("TURNSTILE_SECRET_KEY")), patient_note_supported: true, self_manage_supported: true }, 200, origin);
    if (req.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405, origin);

    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400, origin); }
    const action = String(body?.action || "").trim();

    const { data: negocio } = await ctx.supabaseAdmin.from("negocios").select("id,zona_horaria,activo").eq("slug", BUSINESS_SLUG).maybeSingle();
    if (!negocio || negocio.activo !== true) return json({ ok: false, code: "BUSINESS_UNAVAILABLE" }, 503, origin);
    const { data: config } = await ctx.supabaseAdmin.from("configuracion_agenda").select("activa,intervalo_inicio_min,anticipacion_min,horizonte_dias,capacidad_por_hora,cooldown_reserva_min").eq("negocio_id", negocio.id).maybeSingle();
    if (!config || config.activa !== true) return json({ ok: false, code: "AGENDA_UNAVAILABLE" }, 503, origin);

    const resolveService = async (serviceCode: string) => {
      const { data } = await ctx.supabaseAdmin.from("servicios")
        .select("id,nombre,activo,codigo_externo,dias_semana_disponibles,requiere_consulta_previa,modalidades_consulta,precio_consulta_pen,visible_web")
        .eq("negocio_id", negocio.id).eq("codigo_externo", serviceCode).maybeSingle();
      return data;
    };

    const resolveResourceForService = async (serviceId: string) => {
      const { data: link } = await ctx.supabaseAdmin.from("servicios_recursos")
        .select("recurso_id").eq("negocio_id", negocio.id).eq("servicio_id", serviceId)
        .limit(1).maybeSingle();
      if (!link?.recurso_id) return null;
      const { data: resource } = await ctx.supabaseAdmin.from("recursos_agenda")
        .select("id,nombre,activo").eq("negocio_id", negocio.id)
        .eq("id", link.recurso_id).eq("activo", true).maybeSingle();
      return resource;
    };

    if (action === "manage_get" || action === "manage_reschedule" || action === "manage_cancel") {
      const rawToken = String(body?.token || "").trim();
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return json({ ok: false, code: "INVALID_TOKEN", message: "El enlace de gestión no es válido." }, 404, origin);
      const tokenHash = await sha256Hex(rawToken);

      if (action === "manage_get") {
        const { data, error } = await ctx.supabaseAdmin.rpc("get_dr_olano_manage_context", { p_token_hash: tokenHash });
        if (error) { const mapped = mapManageError(error.message || error.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.cita_id) return json({ ok: false, code: "INVALID_TOKEN", message: "El enlace de gestión no es válido o venció." }, 404, origin);
        return json({ ok: true, appointment: row }, 200, origin);
      }

      if (action === "manage_cancel") {
        const { data, error } = await ctx.supabaseAdmin.rpc("gestionar_dr_olano_cancelar_cita", { p_token_hash: tokenHash });
        if (error) { const mapped = mapManageError(error.message || error.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
        const row = Array.isArray(data) ? data[0] : data;
        return json({ ok: true, appointment: row }, 200, origin);
      }

      const dateIso = String(body?.date || "").trim();
      const time = String(body?.time || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(time)) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
      const { data: contextData, error: contextErr } = await ctx.supabaseAdmin.rpc("get_dr_olano_manage_context", { p_token_hash: tokenHash });
      if (contextErr) { const mapped = mapManageError(contextErr.message || contextErr.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
      const context = Array.isArray(contextData) ? contextData[0] : contextData;
      const zone = String(context?.zona_horaria || "America/Lima");
      const localStart = DateTime.fromISO(`${dateIso}T${time}:00`, { zone });
      if (!localStart.isValid) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
      const { data, error } = await ctx.supabaseAdmin.rpc("gestionar_dr_olano_reprogramar_cita", { p_token_hash: tokenHash, p_inicio: localStart.toUTC().toISO() });
      if (error) { const mapped = mapManageError(error.message || error.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
      const row = Array.isArray(data) ? data[0] : data;
      return json({ ok: true, appointment: row }, 200, origin);
    }

    if (action === "availability") {
      const serviceCode = String(body?.service_code || "").trim();
      const dateIso = String(body?.date || "").trim();
      if (!/^[a-z0-9-]{1,64}$/.test(serviceCode)) return json({ ok: false, code: "INVALID_SERVICE" }, 400, origin);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return json({ ok: false, code: "INVALID_DATE" }, 400, origin);
      const service: any = await resolveService(serviceCode);
      if (!service || service.activo !== true || service.visible_web === false) return json({ ok: false, code: "INVALID_SERVICE" }, 404, origin);
      const resource = await resolveResourceForService(service.id);
      if (!resource) return json({ ok: false, code: "RESOURCE_UNAVAILABLE" }, 503, origin);
      const zone = String(negocio.zona_horaria || "America/Lima");
      const day = DateTime.fromISO(dateIso, { zone }).startOf("day");
      if (!day.isValid) return json({ ok: false, code: "INVALID_DATE" }, 400, origin);
      const nowLocal = DateTime.now().setZone(zone);
      const horizon = nowLocal.startOf("day").plus({ days: Number(config.horizonte_dias) + 1 });
      const serviceMeta = {
        requires_prior_consultation: service.requiere_consulta_previa === true,
        modalities: Array.isArray(service.modalidades_consulta) ? service.modalidades_consulta : [],
        consultation_price_pen: service.precio_consulta_pen == null ? null : Number(service.precio_consulta_pen),
        allowed_weekdays: Array.isArray(service.dias_semana_disponibles) ? service.dias_semana_disponibles : null,
      };
      if (day < nowLocal.startOf("day") || day >= horizon) return json({ ok: true, service_code: serviceCode, date: dateIso, service_meta: serviceMeta, slots: [] }, 200, origin);
      const { data: schedules, error: schedulesErr } = await ctx.supabaseAdmin.rpc("get_dr_olano_availability_windows", {
        p_negocio_id: negocio.id,
        p_servicio_id: service.id,
        p_recurso_id: resource.id,
        p_date: dateIso,
      });
      if (schedulesErr) return json({ ok: false, code: "AVAILABILITY_CONFIG_ERROR" }, 500, origin);
      const activeSchedules = (schedules || []).filter((s: any) => s.hora_inicio && s.hora_fin && Number(s.intervalo_min) > 0);
      if (!activeSchedules.length) return json({ ok: true, service_code: serviceCode, date: dateIso, service_meta: serviceMeta, slots: [] }, 200, origin);
      const dayEnd = day.plus({ days: 1 });
      const fromUtc = day.toUTC().toISO();
      const toUtc = dayEnd.toUTC().toISO();
      const { data: exceptions } = await ctx.supabaseAdmin.from("excepciones_agenda").select("tipo,inicio,fin").eq("negocio_id", negocio.id).eq("recurso_id", resource.id).lt("inicio", toUtc).gt("fin", fromUtc);
      const { data: appointments } = await ctx.supabaseAdmin.from("citas").select("inicio,fin,estado").eq("negocio_id", negocio.id).eq("recurso_id", resource.id).in("estado", ["pendiente", "confirmada"]).lt("inicio", toUtc).gt("fin", fromUtc);
      const capacity = Number(config.capacidad_por_hora);
      const noticeCutoff = nowLocal.plus({ minutes: Number(config.anticipacion_min) });
      const blocks = (exceptions || []).filter((e: any) => e.tipo === "bloqueo").map((e: any) => ({ start: DateTime.fromISO(String(e.inicio), { setZone: true }).setZone(zone), end: DateTime.fromISO(String(e.fin), { setZone: true }).setZone(zone) }));
      const busy = (appointments || []).map((c: any) => ({ start: DateTime.fromISO(String(c.inicio), { setZone: true }).setZone(zone), end: DateTime.fromISO(String(c.fin), { setZone: true }).setZone(zone) }));
      const hourCounts = new Map<string, number>();
      for (const c of busy) { const key = c.start.startOf("hour").toISO()!; hourCounts.set(key, (hourCounts.get(key) || 0) + 1); }
      const slots: any[] = [];
      const overlaps = (a: DateTime, b: DateTime, x: DateTime, y: DateTime) => a < y && b > x;
      for (const schedule of activeSchedules) {
        const step = Number(schedule.intervalo_min);
        let cursor = DateTime.fromISO(`${dateIso}T${String(schedule.hora_inicio).slice(0, 8)}`, { zone });
        const endWindow = DateTime.fromISO(`${dateIso}T${String(schedule.hora_fin).slice(0, 8)}`, { zone });
        while (cursor.plus({ minutes: step }) <= endWindow) {
          const end = cursor.plus({ minutes: step });
          const hourKey = cursor.startOf("hour").toISO()!;
          const full = (hourCounts.get(hourKey) || 0) >= capacity;
          const blocked = blocks.some((x: any) => overlaps(cursor, end, x.start, x.end));
          const occupied = busy.some((x: any) => overlaps(cursor, end, x.start, x.end));
          if (cursor >= noticeCutoff && !full && !blocked && !occupied) slots.push({ time: cursor.toFormat("HH:mm"), remaining_in_hour: Math.max(0, capacity - (hourCounts.get(hourKey) || 0)) });
          cursor = cursor.plus({ minutes: step });
        }
      }
      return json({ ok: true, service_code: serviceCode, service_name: service.nombre, date: dateIso, service_meta: serviceMeta, slots }, 200, origin);
    }

    if (action === "book") {
      const serviceCode = String(body?.service_code || "").trim();
      const dateIso = String(body?.date || "").trim();
      const time = String(body?.time || "").trim();
      const name = String(body?.name || "").trim().replace(/\s+/g, " ");
      const phone = normalizePhone(String(body?.phone || ""));
      const token = String(body?.turnstile_token || "");
      const deviceId = String(body?.device_id || "").trim();
      const modality = String(body?.modality || "").trim().toLowerCase();
      const note = normalizeNote(body?.note);
      if (!/^[a-z0-9-]{1,64}$/.test(serviceCode)) return json({ ok: false, code: "INVALID_SERVICE" }, 400, origin);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(time)) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
      if (name.length < 3 || name.length > 120) return json({ ok: false, code: "INVALID_NAME" }, 400, origin);
      if (!phone) return json({ ok: false, code: "INVALID_PHONE" }, 400, origin);
      if (deviceId.length < 16 || deviceId.length > 128) return json({ ok: false, code: "INVALID_DEVICE" }, 400, origin);
      if (note.length > 500) return json({ ok: false, code: "INVALID_NOTE", message: "El comentario es demasiado largo." }, 400, origin);
      const ip = getClientIp(req);
      const turnstile = await verifyTurnstile(token, ip);
      if (!turnstile.ok) return json({ ok: false, code: turnstile.code, errors: (turnstile as any).errors || [] }, turnstile.status, origin);
      let appPatientId: string | null = null;
      try { appPatientId = await verifyPatientAppToken(String(body?.app_access_token || "")); }
      catch { return json({ ok: false, code: "EMAIL_VERIFY_UNAVAILABLE" }, 503, origin); }
      if (!appPatientId) return json({
        ok: false, code: "EMAIL_OTP_REQUIRED", message: "Verifica el código enviado a tu correo antes de reservar."
      }, 401, origin);
      const secret = String((turnstile as any).secret);
      const service: any = await resolveService(serviceCode);
      if (!service || service.activo !== true || service.visible_web === false) return json({ ok: false, code: "INVALID_SERVICE" }, 404, origin);
      if (service.requiere_consulta_previa === true) {
        const allowed = Array.isArray(service.modalidades_consulta) ? service.modalidades_consulta : [];
        if (!modality || !allowed.includes(modality)) return json({ ok: false, code: "INVALID_MODALITY", message: "Selecciona una modalidad válida para este servicio." }, 400, origin);
      }
      const resource = await resolveResourceForService(service.id);
      if (!resource) return json({ ok: false, code: "RESOURCE_UNAVAILABLE" }, 503, origin);
      const zone = String(negocio.zona_horaria || "America/Lima");
      const localStart = DateTime.fromISO(`${dateIso}T${time}:00`, { zone });
      if (!localStart.isValid) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
      const ua = req.headers.get("user-agent") || "";
      const lang = req.headers.get("accept-language") || "";
      const phoneHash = await hmacHex(secret, `phone|${phone}`);
      const ipHash = await hmacHex(secret, `ip|${ip || "unavailable"}`);
      const deviceHash = await hmacHex(secret, `device|${deviceId}|${ua}|${lang}`);
      const { data: booking, error: bookingErr } = await ctx.supabaseAdmin.rpc("crear_cita_web_segura_v4", {
        p_negocio_id: negocio.id, p_servicio_id: service.id, p_recurso_id: resource.id, p_nombre: name, p_telefono_e164: phone,
        p_inicio: localStart.toUTC().toISO(), p_phone_hash: phoneHash, p_ip_hash: ipHash, p_device_hash: deviceHash,
        p_modalidad: service.requiere_consulta_previa === true ? modality : null, p_motivo_consulta: note || null,
         p_patient_user_id: appPatientId,
      });
      if (bookingErr) { const mapped = mapBookingError(bookingErr.message || bookingErr.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
      const row = Array.isArray(booking) ? booking[0] : booking;
      if (!row?.cita_id) return json({ ok: false, code: "BOOKING_FAILED" }, 500, origin);

      let manageUrl: string | null = null;
      try {
        const manageToken = randomManageToken();
        const tokenHash = await sha256Hex(manageToken);
        const { error: issueErr } = await ctx.supabaseAdmin.rpc("issue_dr_olano_manage_token", { p_cita_id: row.cita_id, p_token_hash: tokenHash });
        if (!issueErr) manageUrl = `https://doctorolano.pe/gestionar-cita/?t=${encodeURIComponent(manageToken)}`;
      } catch {}

      return json({ ok: true, booking: {
        id: row.cita_id, code: row.codigo_web, cupo_hora: row.cupo_hora, service_code: serviceCode, service_name: service.nombre,
        date: dateIso, time, timezone: zone, modality: service.requiere_consulta_previa === true ? modality : "presencial",
        appointment_type: service.requiere_consulta_previa === true ? "consulta_previa" : "servicio",
        price_pen: service.requiere_consulta_previa === true ? Number(service.precio_consulta_pen) : null,
        note: note || null, manage_url: manageUrl,
      } }, 201, origin);
    }
    return json({ ok: false, code: "INVALID_ACTION" }, 400, origin);
  }),
};