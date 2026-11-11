// Reserva v17: identidad documental privada por cita, sin afectar el calendario
// ni la salida automática a WhatsApp. La app autentica solamente por correo OTP.
// v1.6.0 · Jornada de cirugía facial: acciones book_jornada (reserva 1, sin tope por hora),
// jornada_estado y book_evaluacion_jornada (reserva 2, enlazada por token). Las acciones
// availability y book originales no cambian, salvo que availability no aplica tope por hora
// al servicio «jornada».
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { DateTime } from "npm:luxon@3.5.0";

const BUSINESS_SLUG = "dr-olano";
const EXPECTED_HOSTNAME = "doctorolano.pe";
const TURNSTILE_SITE_KEY = "0x4AAAAAAEquPSErt1V9EL1G";
const ALLOWED_ORIGINS = new Set(["https://doctorolano.pe"]);
// Jornada de cirugía facial · mismos textos que muestra /jornada
const JORNADA_DAYS = new Set(["2026-11-18", "2026-11-19", "2026-11-20"]);
const JORNADA_PROCEDURES = new Set([
  "Blefaroplastia superior", "Blefaroplastia inferior", "Rinoplastia", "Otoplastia", "Lip lift",
  "Lipopapada", "Lifting facial", "Bichectomía", "Injerto de grasa facial", "Aún no sé, que me oriente el médico",
]);

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
  if (m.includes("CLIENT_DAILY_LIMIT")) return { status: 409, code: "CLIENT_DAILY_LIMIT", message: "Con este celular ya tienes una cita registrada ese día. Elige otro día." };
  if (m.includes("MANUAL_REVIEW_REQUIRED")) return { status: 409, code: "MANUAL_REVIEW_REQUIRED", message: "Para registrar esta cita escríbenos por WhatsApp y te ayudamos." };
  if (m.includes("RESCHEDULE_LIMIT")) return { status: 409, code: "RESCHEDULE_LIMIT", message: "Esta cita ya alcanzó el máximo de reprogramaciones." };
  if (m.includes("INVALID_DNI")) return { status: 400, code: "INVALID_DNI", message: "Ingresa un DNI válido de 8 dígitos." };
  if (m.includes("JORNADA_ALREADY_BOOKED")) return { status: 409, code: "JORNADA_ALREADY_BOOKED", message: "Con este celular ya separaste un día de jornada. Si necesitas cambiarlo, escríbenos por WhatsApp." };
  if (m.includes("RATE_LIMIT_JORNADA")) return { status: 429, code: "RATE_LIMIT_JORNADA", message: "Hubo muchas reservas desde esta red en poco tiempo. Intenta de nuevo en unos minutos." };
  if (m.includes("INVALID_PROCEDURE")) return { status: 400, code: "INVALID_PROCEDURE", message: "Elige un procedimiento de interés." };
  if (m.includes("JORNADA_TOKEN_INVALID")) return { status: 404, code: "JORNADA_TOKEN_INVALID", message: "No encontramos tu reserva de jornada. Vuelve a elegir tu día." };
  if (m.includes("EVALUACION_ALREADY_BOOKED")) return { status: 409, code: "EVALUACION_ALREADY_BOOKED", message: "Ya tienes tu evaluación reservada." };
  if (m.includes("EVALUACION_AFTER_JORNADA")) return { status: 409, code: "EVALUACION_AFTER_JORNADA", message: "La evaluación debe ser antes de tu día de jornada." };
  if (m.includes("INVALID_SLOT_GRID")) return { status: 400, code: "INVALID_SLOT", message: "El horario seleccionado no es válido." };
  return { status: 500, code: "BOOKING_FAILED", message: "No se pudo registrar la cita." };
}
function mapManageError(message: string) {
  const m = String(message || "");
  if (m.includes("INVALID_TOKEN")) return { status: 404, code: "INVALID_TOKEN", message: "El enlace de gestión no es válido o venció." };
  if (m.includes("INVALID_STATE")) return { status: 409, code: "INVALID_STATE", message: "Esta cita ya no puede modificarse." };
  return mapBookingError(m);
}

// Traza por intento para las acciones de jornada (acierto o error). No guarda nombre, celular, DNI ni correo.
async function tracedBooking(
  ctx: any, action: string, origin: string | null,
  run: (mark: (name: string) => void, setDb: (msg: string) => void, info: Record<string, unknown>) => Promise<Response>,
): Promise<Response> {
  const rid = crypto.randomUUID();
  let step = "inicio";
  let dbMsg: string | null = null;
  const info: Record<string, unknown> = {};
  const mark = (name: string) => { step = name; };
  const setDb = (msg: string) => { dbMsg = String(msg || "").slice(0, 300); };
  let res: Response;
  try { res = await run(mark, setDb, info); }
  catch (e) {
    setDb(String((e as any)?.message || e));
    res = json({ ok: false, code: "BOOKING_EXCEPTION", message: "No se pudo registrar la cita." }, 500, origin);
  }
  try {
    const out: any = await res.clone().json().catch(() => ({}));
    const code = String(out?.code || (res.status === 201 ? "OK" : "SIN_CODIGO"));
    const ok = res.status === 201;
    const detail = { ...info, db_message: dbMsg };
    console.log("[booking-trace]", JSON.stringify({ request_id: rid, action, ok, http_status: res.status, code, last_step: step, detail }));
    await ctx.supabaseAdmin.rpc("dr_olano_log_booking_trace", { p_request_id: rid, p_action: action, p_ok: ok, p_http_status: res.status, p_code: code, p_last_step: step, p_detail: detail });
  } catch (e) { console.error("[booking-trace] no se pudo guardar", String((e as any)?.message || e)); }
  return res;
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") {
      if (!validOrigin(origin)) return json({ ok: false, code: "ORIGIN_DENIED" }, 403, origin);
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (!validOrigin(origin)) return json({ ok: false, code: "ORIGIN_DENIED" }, 403, origin);
    if (req.method === "GET") return json({ ok: true, service: "dr-olano-booking", version: "1.7.0", site_key: TURNSTILE_SITE_KEY, turnstile_configured: Boolean(Deno.env.get("TURNSTILE_SECRET_KEY")), patient_note_supported: true, self_manage_supported: true, jornada_supported: true }, 200, origin);
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
      // Servicio «jornada»: sin tope por hora ni choque entre pacientes (agenda propia).
      const unlimited = service.codigo_externo === "jornada";
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
          const full = !unlimited && (hourCounts.get(hourKey) || 0) >= capacity;
          const blocked = blocks.some((x: any) => overlaps(cursor, end, x.start, x.end));
          const occupied = !unlimited && busy.some((x: any) => overlaps(cursor, end, x.start, x.end));
          if (cursor >= noticeCutoff && !full && !blocked && !occupied) slots.push({ time: cursor.toFormat("HH:mm"), remaining_in_hour: unlimited ? null : Math.max(0, capacity - (hourCounts.get(hourKey) || 0)) });
          cursor = cursor.plus({ minutes: step });
        }
      }
      return json({ ok: true, service_code: serviceCode, service_name: service.nombre, date: dateIso, service_meta: serviceMeta, slots }, 200, origin);
    }

    // ===== Jornada de cirugía facial =====
    // Estado de la reserva 1 por token (sirve para no pedir los datos otra vez en la reserva 2).
    if (action === "jornada_estado") {
      const rawToken = String(body?.jornada_token || "").trim();
      const notFound = () => json({ ok: false, code: "JORNADA_TOKEN_INVALID", message: "No encontramos tu reserva de jornada. Vuelve a elegir tu día." }, 404, origin);
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return notFound();
      const { data, error } = await ctx.supabaseAdmin.rpc("get_dr_olano_jornada_estado_v1", { p_negocio_id: negocio.id, p_token_hash: await sha256Hex(rawToken) });
      if (error) return json({ ok: false, code: "JORNADA_ESTADO_FAILED" }, 500, origin);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row || !["pendiente", "confirmada"].includes(String(row.jornada_estado))) return notFound();
      const zone = String(negocio.zona_horaria || "America/Lima");
      const j = DateTime.fromISO(String(row.inicio), { setZone: true }).setZone(zone);
      const evActive = Boolean(row.evaluacion_cita_id) && ["pendiente", "confirmada"].includes(String(row.evaluacion_estado));
      const ev = evActive ? DateTime.fromISO(String(row.evaluacion_inicio), { setZone: true }).setZone(zone) : null;
      return json({ ok: true, jornada: {
        name: row.nombre, phone: row.celular, procedure: row.procedimiento,
        date: j.toFormat("yyyy-MM-dd"), time: j.toFormat("HH:mm"),
        evaluation: { booked: evActive, date: ev ? ev.toFormat("yyyy-MM-dd") : null, time: ev ? ev.toFormat("HH:mm") : null },
      } }, 200, origin);
    }

    // RESERVA 1 · día de jornada (cita real en la agenda «Jornada · Dr. Aldo Ronquillo», sin tope por hora).
    // No escribe en el guard de 1 hora; por eso la reserva 2 puede seguir de inmediato.
    if (action === "book_jornada") {
      return await tracedBooking(ctx, action, origin, async (mark, setDb, info) => {
        mark("validar_datos");
        const serviceCode = String(body?.service_code || "").trim();
        const dateIso = String(body?.date || "").trim();
        const time = String(body?.time || "").trim();
        const name = String(body?.name || "").trim().replace(/\s+/g, " ");
        const phone = normalizePhone(String(body?.phone || ""));
        const dni = String(body?.dni || "").trim();
        const procedure = String(body?.procedure || "").trim();
        const deviceId = String(body?.device_id || "").trim();
        const token = String(body?.turnstile_token || "");
        Object.assign(info, { service_code: serviceCode, date: dateIso, time, has_dni: Boolean(dni), has_turnstile: Boolean(token), procedure_ok: JORNADA_PROCEDURES.has(procedure) });
        if (serviceCode !== "jornada") return json({ ok: false, code: "INVALID_SERVICE" }, 400, origin);
        if (!JORNADA_DAYS.has(dateIso)) return json({ ok: false, code: "INVALID_DATE", message: "Elige el 18, 19 o 20 de noviembre." }, 400, origin);
        if (!/^\d{2}:00$/.test(time)) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
        if (name.length < 3 || name.length > 120) return json({ ok: false, code: "INVALID_NAME" }, 400, origin);
        if (!phone) return json({ ok: false, code: "INVALID_PHONE" }, 400, origin);
        if (!/^[0-9]{8}$/.test(dni)) return json({ ok: false, code: "INVALID_DNI", message: "Ingresa un DNI válido de 8 dígitos." }, 400, origin);
        if (!JORNADA_PROCEDURES.has(procedure)) return json({ ok: false, code: "INVALID_PROCEDURE", message: "Elige un procedimiento de interés." }, 400, origin);
        if (deviceId.length < 16 || deviceId.length > 128) return json({ ok: false, code: "INVALID_DEVICE" }, 400, origin);
        const ip = getClientIp(req);
        mark("turnstile");
        const turnstile = await verifyTurnstile(token, ip);
        if (!turnstile.ok) return json({ ok: false, code: turnstile.code, errors: (turnstile as any).errors || [] }, turnstile.status, origin);
        const secret = String((turnstile as any).secret);
        mark("servicio_y_recurso");
        const service: any = await resolveService("jornada");
        if (!service || service.activo !== true || service.visible_web === false) return json({ ok: false, code: "INVALID_SERVICE" }, 404, origin);
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
        const rawToken = randomManageToken();
        mark("crear_cita_jornada_rpc");
        const { data: booking, error: bookingErr } = await ctx.supabaseAdmin.rpc("crear_cita_jornada_v1", {
          p_negocio_id: negocio.id, p_servicio_id: service.id, p_recurso_id: resource.id, p_nombre: name, p_telefono_e164: phone,
          p_inicio: localStart.toUTC().toISO(), p_phone_hash: phoneHash, p_ip_hash: ipHash, p_device_hash: deviceHash,
          p_dni: dni, p_procedimiento: procedure, p_token_hash: await sha256Hex(rawToken),
        });
        if (bookingErr) {
          setDb(String(bookingErr.message || bookingErr.details || ""));
          const mapped = mapBookingError(bookingErr.message || bookingErr.details || "");
          return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin);
        }
        const row = Array.isArray(booking) ? booking[0] : booking;
        if (!row?.cita_id) return json({ ok: false, code: "BOOKING_FAILED" }, 500, origin);
        mark("listo");
        return json({ ok: true, booking: {
          id: row.cita_id, code: row.codigo_web, service_code: "jornada", service_name: service.nombre,
          date: dateIso, time, timezone: zone, procedure, jornada_token: rawToken,
        } }, 201, origin);
      });
    }

    // RESERVA 2 · evaluación previa (hasta el 17/11), enlazada a la reserva 1 por token.
    // Los datos (nombre, celular, DNI) salen de la reserva 1: el paciente no los vuelve a escribir.
    // Mantiene el límite de 1 hora, el tope de 3 por hora y el resto de reglas de una cita web normal.
    if (action === "book_evaluacion_jornada") {
      return await tracedBooking(ctx, action, origin, async (mark, setDb, info) => {
        mark("validar_datos");
        const serviceCode = String(body?.service_code || "").trim();
        const dateIso = String(body?.date || "").trim();
        const time = String(body?.time || "").trim();
        const rawToken = String(body?.jornada_token || "").trim();
        const deviceId = String(body?.device_id || "").trim();
        const token = String(body?.turnstile_token || "");
        Object.assign(info, { service_code: serviceCode, date: dateIso, time, has_token: Boolean(rawToken), has_turnstile: Boolean(token) });
        if (serviceCode !== "evaluacion-jornada") return json({ ok: false, code: "INVALID_SERVICE" }, 400, origin);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(time)) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
        if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return json({ ok: false, code: "JORNADA_TOKEN_INVALID", message: "No encontramos tu reserva de jornada. Vuelve a elegir tu día." }, 404, origin);
        if (deviceId.length < 16 || deviceId.length > 128) return json({ ok: false, code: "INVALID_DEVICE" }, 400, origin);
        const ip = getClientIp(req);
        mark("turnstile");
        const turnstile = await verifyTurnstile(token, ip);
        if (!turnstile.ok) return json({ ok: false, code: turnstile.code, errors: (turnstile as any).errors || [] }, turnstile.status, origin);
        const secret = String((turnstile as any).secret);
        mark("estado_jornada");
        const tokenHash = await sha256Hex(rawToken);
        const { data: est, error: estErr } = await ctx.supabaseAdmin.rpc("get_dr_olano_jornada_estado_v1", { p_negocio_id: negocio.id, p_token_hash: tokenHash });
        if (estErr) { setDb(String(estErr.message || "")); return json({ ok: false, code: "JORNADA_ESTADO_FAILED" }, 500, origin); }
        const estRow: any = Array.isArray(est) ? est[0] : est;
        if (!estRow || !["pendiente", "confirmada"].includes(String(estRow.jornada_estado))) return json({ ok: false, code: "JORNADA_TOKEN_INVALID", message: "No encontramos tu reserva de jornada. Vuelve a elegir tu día." }, 404, origin);
        mark("servicio_y_recurso");
        const service: any = await resolveService("evaluacion-jornada");
        if (!service || service.activo !== true || service.visible_web === false) return json({ ok: false, code: "INVALID_SERVICE" }, 404, origin);
        const resource = await resolveResourceForService(service.id);
        if (!resource) return json({ ok: false, code: "RESOURCE_UNAVAILABLE" }, 503, origin);
        const zone = String(negocio.zona_horaria || "America/Lima");
        const localStart = DateTime.fromISO(`${dateIso}T${time}:00`, { zone });
        if (!localStart.isValid) return json({ ok: false, code: "INVALID_SLOT" }, 400, origin);
        const ua = req.headers.get("user-agent") || "";
        const lang = req.headers.get("accept-language") || "";
        const phoneHash = await hmacHex(secret, `phone|${String(estRow.celular)}`);
        const ipHash = await hmacHex(secret, `ip|${ip || "unavailable"}`);
        const deviceHash = await hmacHex(secret, `device|${deviceId}|${ua}|${lang}`);
        mark("crear_evaluacion_rpc");
        const { data: booking, error: bookingErr } = await ctx.supabaseAdmin.rpc("crear_cita_evaluacion_jornada_v1", {
          p_negocio_id: negocio.id, p_servicio_id: service.id, p_recurso_id: resource.id, p_token_hash: tokenHash,
          p_inicio: localStart.toUTC().toISO(), p_phone_hash: phoneHash, p_ip_hash: ipHash, p_device_hash: deviceHash,
        });
        if (bookingErr) {
          setDb(String(bookingErr.message || bookingErr.details || ""));
          const mapped = mapBookingError(bookingErr.message || bookingErr.details || "");
          return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin);
        }
        const row = Array.isArray(booking) ? booking[0] : booking;
        if (!row?.cita_id) return json({ ok: false, code: "BOOKING_FAILED" }, 500, origin);
        mark("token_gestion");
        let manageUrl: string | null = null;
        try {
          const manageToken = randomManageToken();
          const { error: issueErr } = await ctx.supabaseAdmin.rpc("issue_dr_olano_manage_token", { p_cita_id: row.cita_id, p_token_hash: await sha256Hex(manageToken) });
          if (issueErr) info.manage_token_error = String(issueErr.message || "").slice(0, 200);
          else manageUrl = `https://doctorolano.pe/gestionar-cita/?t=${encodeURIComponent(manageToken)}`;
        } catch {}
        mark("listo");
        return json({ ok: true, booking: {
          id: row.cita_id, code: row.codigo_web, cupo_hora: row.cupo_hora, service_code: "evaluacion-jornada", service_name: service.nombre,
          date: dateIso, time, timezone: zone, modality: "presencial", appointment_type: "servicio", price_pen: 70,
          name: estRow.nombre, phone: estRow.celular, manage_url: manageUrl,
        } }, 201, origin);
      });
    }

    if (action === "book") {
      const rid = crypto.randomUUID();
      let step = "inicio";
      let dbMsg: string | null = null;
      const info: Record<string, unknown> = {};
      const mark = (name: string) => { step = name; };
      const run = async (): Promise<Response> => {
      mark("compuerta_otp");
      // Reject legacy bookings when secure OTP is activated, including stale cached browsers.
      const {data:otpEnabled,error:gateError}=await ctx.supabaseAdmin.rpc('dr_olano_otp_booking_enabled');
      if (gateError) return json({ok:false,code:"BOOKING_MODE_UNAVAILABLE"},503,origin);
      if (otpEnabled===true) return json({
        ok:false,code:"EMAIL_OTP_REQUIRED",
        message:"Actualiza la página para verificar tu correo y registrar la cita."
      },409,origin);
      const serviceCode = String(body?.service_code || "").trim();
      const dateIso = String(body?.date || "").trim();
      const time = String(body?.time || "").trim();
      mark("validar_datos");
      Object.assign(info, { service_code: serviceCode, date: dateIso, time, has_dni: Boolean(String(body?.dni || "").trim()), has_turnstile: Boolean(body?.turnstile_token) });
      const name = String(body?.name || "").trim().replace(/\s+/g, " ");
      const phone = normalizePhone(String(body?.phone || ""));
      // El DNI se solicita en la web nueva; se conservan clientes antiguos
      // hasta que se complete la transición de cachés y sesiones abiertas.
      const dni = String(body?.dni || "").trim();
      if (dni && !/^[0-9]{8}$/.test(dni)) return json({
        ok:false, code:"INVALID_DNI", message:"Ingresa un DNI válido de 8 dígitos."
      },400,origin);
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
      mark("turnstile");
      const turnstile = await verifyTurnstile(token, ip);
      if (!turnstile.ok) return json({ ok: false, code: turnstile.code, errors: (turnstile as any).errors || [] }, turnstile.status, origin);
      const secret = String((turnstile as any).secret);
      mark("servicio_y_recurso");
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
      mark("crear_cita_rpc");
      const { data: booking, error: bookingErr } = await ctx.supabaseAdmin.rpc(dni ? "crear_cita_web_segura_v5" : "crear_cita_web_segura_v3", {
        p_negocio_id: negocio.id, p_servicio_id: service.id, p_recurso_id: resource.id, p_nombre: name, p_telefono_e164: phone,
        p_inicio: localStart.toUTC().toISO(), p_phone_hash: phoneHash, p_ip_hash: ipHash, p_device_hash: deviceHash,
        p_modalidad: service.requiere_consulta_previa === true ? modality : null, p_motivo_consulta: note || null,
        ...(dni ? { p_dni: dni } : {}),
      });
      if (bookingErr) { dbMsg = String(bookingErr.message || bookingErr.details || "").slice(0, 300); const mapped = mapBookingError(bookingErr.message || bookingErr.details || ""); return json({ ok: false, code: mapped.code, message: mapped.message }, mapped.status, origin); }
      const row = Array.isArray(booking) ? booking[0] : booking;
      if (!row?.cita_id) return json({ ok: false, code: "BOOKING_FAILED" }, 500, origin);

      mark("token_gestion");
      let manageUrl: string | null = null;
      try {
        const manageToken = randomManageToken();
        const tokenHash = await sha256Hex(manageToken);
        const { error: issueErr } = await ctx.supabaseAdmin.rpc("issue_dr_olano_manage_token", { p_cita_id: row.cita_id, p_token_hash: tokenHash });
        if (issueErr) info.manage_token_error = String(issueErr.message || "").slice(0, 200);
        if (!issueErr) manageUrl = `https://doctorolano.pe/gestionar-cita/?t=${encodeURIComponent(manageToken)}`;
      } catch {}

      mark("listo");
      return json({ ok: true, booking: {
        id: row.cita_id, code: row.codigo_web, cupo_hora: row.cupo_hora, service_code: serviceCode, service_name: service.nombre,
        date: dateIso, time, timezone: zone, modality: service.requiere_consulta_previa === true ? modality : "presencial",
        appointment_type: service.requiere_consulta_previa === true ? "consulta_previa" : "servicio",
        price_pen: service.requiere_consulta_previa === true ? Number(service.precio_consulta_pen) : null,
        note: note || null, manage_url: manageUrl,
      } }, 201, origin);
      };

      let res: Response;
      try { res = await run(); }
      catch (e) {
        dbMsg = String((e as any)?.message || e).slice(0, 300);
        res = json({ ok: false, code: "BOOKING_EXCEPTION", message: "No se pudo registrar la cita." }, 500, origin);
      }
      // Traza de cada intento, con acierto o error. No guarda nombre, celular, DNI ni correo.
      try {
        const out: any = await res.clone().json().catch(() => ({}));
        const code = String(out?.code || (res.status === 201 ? "OK" : "SIN_CODIGO"));
        const row = { request_id: rid, action: "book", ok: res.status === 201, http_status: res.status, code, last_step: step, detail: { ...info, db_message: dbMsg } };
        console.log("[booking-trace]", JSON.stringify(row));
        await ctx.supabaseAdmin.rpc("dr_olano_log_booking_trace", { p_request_id: rid, p_action: "book", p_ok: row.ok, p_http_status: res.status, p_code: code, p_last_step: step, p_detail: row.detail });
      } catch (e) { console.error("[booking-trace] no se pudo guardar", String((e as any)?.message || e)); }
      return res;
    }
    return json({ ok: false, code: "INVALID_ACTION" }, 400, origin);
  }),
};