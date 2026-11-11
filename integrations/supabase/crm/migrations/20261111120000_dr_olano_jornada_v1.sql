-- Jornada de cirugía facial · 18, 19 y 20 de noviembre de 2026
-- ---------------------------------------------------------------------------
-- RESERVA 1  = día de jornada: cita REAL en el recurso «Jornada · Dr. Aldo Ronquillo».
--              Una cita por celular, 18/19/20, cada hora de 9:00 a 18:00, SIN tope por hora
--              y sin bloquear consultas normales.
-- RESERVA 2  = evaluación previa (S/ 70) hasta el 17/11, enlazada a la reserva 1.
--              Usa el mismo recurso «Dr. Olano» y sus mismas reglas (3 por hora).
--
-- Lo que NO se toca: crear_cita_web_segura_v3 / v5 / v6, el límite de 1 hora
-- (private.web_booking_guard, 60 min), la capacidad de 3 por hora ni la verificación de correo.
-- La reserva 1 NO escribe en web_booking_guard; por eso la reserva 2 no choca con el límite de 1 hora.
--
-- Cambio en una restricción compartida (único): citas_recurso_no_solapado excluye al recurso
-- Jornada, porque ahí varios pacientes comparten la misma hora.
-- Reversa: ver 20261111120001_dr_olano_jornada_v1_rollback.sql.txt (no se aplica sola).
-- ---------------------------------------------------------------------------

begin;

-- 1) Tabla de enlace reserva 1 <-> reserva 2 (solo accesible por funciones SECURITY DEFINER)
create table if not exists private.dr_olano_jornada_reserva (
  cita_id uuid primary key references public.citas(id) on delete cascade,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  contacto_id uuid not null references public.contactos(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  procedimiento text not null check (char_length(procedimiento) between 3 and 80),
  ip_hash text not null,
  device_hash text not null,
  evaluacion_cita_id uuid references public.citas(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists dr_olano_jornada_reserva_ip_idx on private.dr_olano_jornada_reserva (negocio_id, ip_hash, created_at);
create index if not exists dr_olano_jornada_reserva_device_idx on private.dr_olano_jornada_reserva (negocio_id, device_hash, created_at);
create index if not exists dr_olano_jornada_reserva_contacto_idx on private.dr_olano_jornada_reserva (contacto_id);
alter table private.dr_olano_jornada_reserva enable row level security;
revoke all on private.dr_olano_jornada_reserva from public, anon, authenticated;

-- 1b) Números de prueba del dueño: sin revisión manual y sin topes por persona.
--     Solo estos números; el resto de pacientes mantiene todas las reglas.
create table if not exists private.dr_olano_test_phones (
  telefono_e164 text primary key check (telefono_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  nota text,
  created_at timestamptz not null default now()
);
alter table private.dr_olano_test_phones enable row level security;
revoke all on private.dr_olano_test_phones from public, anon, authenticated;
insert into private.dr_olano_test_phones(telefono_e164, nota)
values ('+51919012384', 'Leo · pruebas sin límites')
on conflict (telefono_e164) do nothing;

create or replace function private.dr_olano_es_numero_de_prueba(p_telefono text)
returns boolean
language sql stable security definer
set search_path to 'private', 'pg_temp'
as $$ select exists (select 1 from private.dr_olano_test_phones t where t.telefono_e164 = p_telefono) $$;
revoke all on function private.dr_olano_es_numero_de_prueba(text) from public, anon, authenticated;

-- 2) Recurso, servicios, enlaces y horarios (idempotente)
do $mig$
declare
  v_negocio uuid;
  v_dr uuid;
  v_recurso uuid;
  v_srv_jornada uuid;
  v_srv_eval uuid;
  v_cfg uuid;
  v_dia date;
begin
  select id into v_negocio from public.negocios where slug = 'dr-olano';
  if v_negocio is null then raise exception 'NEGOCIO_NO_ENCONTRADO'; end if;

  select id into v_dr from public.recursos_agenda
   where negocio_id = v_negocio and nombre = 'Dr. Olano' and activo = true limit 1;
  if v_dr is null then raise exception 'RECURSO_DR_OLANO_NO_ENCONTRADO'; end if;

  -- Recurso propio de la jornada
  select id into v_recurso from public.recursos_agenda
   where negocio_id = v_negocio and nombre = 'Jornada · Dr. Aldo Ronquillo' limit 1;
  if v_recurso is null then
    insert into public.recursos_agenda(negocio_id, nombre, tipo, activo)
    values (v_negocio, 'Jornada · Dr. Aldo Ronquillo', 'persona', true)
    returning id into v_recurso;
  end if;

  -- Servicio de la reserva 1 (día de jornada)
  select id into v_srv_jornada from public.servicios where negocio_id = v_negocio and codigo_externo = 'jornada';
  if v_srv_jornada is null then
    insert into public.servicios(negocio_id, nombre, descripcion, duracion_min, precio_pen, activo,
                                 codigo_externo, requiere_consulta_previa, calendar_color_hex,
                                 visible_web, orden_web, precio_desde)
    values (v_negocio, 'JORNADA · Día de cirugía facial',
            'Reserva 1 de la jornada con el Dr. Aldo Ronquillo (18, 19 y 20 de noviembre). Sin tope por hora.',
            60, null, true, 'jornada', false, '#F57C00', true, 900, false)
    returning id into v_srv_jornada;
  end if;

  -- Servicio de la reserva 2 (evaluación previa)
  select id into v_srv_eval from public.servicios where negocio_id = v_negocio and codigo_externo = 'evaluacion-jornada';
  if v_srv_eval is null then
    insert into public.servicios(negocio_id, nombre, descripcion, duracion_min, precio_pen, activo,
                                 codigo_externo, requiere_consulta_previa, calendar_color_hex,
                                 visible_web, orden_web, precio_desde)
    values (v_negocio, 'JORNADA · Evaluación previa',
            'Reserva 2 de la jornada: evaluación médica previa (S/ 70), hasta el 17 de noviembre.',
            20, 70, true, 'evaluacion-jornada', false, '#6D4CFF', true, 901, false)
    returning id into v_srv_eval;
  end if;

  insert into public.servicios_recursos(negocio_id, servicio_id, recurso_id)
  select v_negocio, v_srv_jornada, v_recurso
   where not exists (select 1 from public.servicios_recursos where servicio_id = v_srv_jornada and recurso_id = v_recurso);
  insert into public.servicios_recursos(negocio_id, servicio_id, recurso_id)
  select v_negocio, v_srv_eval, v_dr
   where not exists (select 1 from public.servicios_recursos where servicio_id = v_srv_eval and recurso_id = v_dr);

  -- Horario reserva 1: 18, 19 y 20/11, de 9:00 a 19:00, cada 60 min (inicios 9:00 ... 18:00)
  delete from public.agenda_disponibilidad_config
   where negocio_id = v_negocio and alcance = 'service' and servicio_id in (v_srv_jornada, v_srv_eval);

  insert into public.agenda_disponibilidad_config(negocio_id, alcance, servicio_id, intervalo_min,
                                                  vigente_desde, vigente_hasta, reemplaza_general, activo)
  values (v_negocio, 'service', v_srv_jornada, 60, date '2026-11-18', date '2026-11-20', true, true)
  returning id into v_cfg;
  for v_dia in select generate_series(date '2026-11-18', date '2026-11-20', interval '1 day')::date loop
    insert into public.agenda_disponibilidad_bloques(negocio_id, config_id, tipo, fecha, hora_inicio, hora_fin, activo)
    values (v_negocio, v_cfg, 'date', v_dia, time '09:00', time '19:00', true);
  end loop;

  -- Horario reserva 2: 11/11 a 17/11, 9-12 y 14-21, cada 20 min. Fuera de esas fechas queda bloqueado
  -- (reemplaza_general = true y sin bloque para la fecha).
  insert into public.agenda_disponibilidad_config(negocio_id, alcance, servicio_id, intervalo_min,
                                                  vigente_desde, vigente_hasta, reemplaza_general, activo)
  values (v_negocio, 'service', v_srv_eval, 20, null, null, true, true)
  returning id into v_cfg;
  for v_dia in select generate_series(date '2026-11-11', date '2026-11-17', interval '1 day')::date loop
    insert into public.agenda_disponibilidad_bloques(negocio_id, config_id, tipo, fecha, hora_inicio, hora_fin, activo)
    values (v_negocio, v_cfg, 'date', v_dia, time '09:00', time '12:00', true),
           (v_negocio, v_cfg, 'date', v_dia, time '14:00', time '21:00', true);
  end loop;

  -- Varias citas a la misma hora SOLO para el recurso Jornada
  if not exists (
    select 1 from pg_constraint
     where conname = 'citas_recurso_no_solapado' and conrelid = 'public.citas'::regclass
       and pg_get_constraintdef(oid) like '%' || v_recurso::text || '%'
  ) then
    alter table public.citas drop constraint if exists citas_recurso_no_solapado;
    execute format(
      'alter table public.citas add constraint citas_recurso_no_solapado '
      'exclude using gist (recurso_id with =, tstzrange(inicio, fin, ''[)'') with &&) '
      'where (recurso_id is not null and recurso_id <> %L::uuid and estado = any (array[''pendiente'',''confirmada'']))',
      v_recurso);
  end if;
end
$mig$;

-- 2b) Las citas de jornada NO cuentan en el tope de 3 por hora de las consultas normales.
--     Único cambio a crear_cita_web_segura_v3: una condición más en el conteo por hora.
--     Se aplica sobre la definición real y se detiene si esa definición ya no coincide.
do $patch$
declare
  v_oid oid := 'public.crear_cita_web_segura_v3(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text)'::regprocedure;
  v_def text := pg_get_functiondef(v_oid);
  v_anchor text := E'interval ''1 hour''\n    and c.estado in(''pendiente'',''confirmada'');';
  v_new text := E'interval ''1 hour''\n    and c.estado in(''pendiente'',''confirmada'')\n    and c.tipo_cita is distinct from ''jornada'';';
begin
  if position('is distinct from ''jornada''' in v_def) > 0 then
    return; -- ya aplicado
  end if;
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 then
    raise exception 'V3_DEFINICION_CAMBIO: revisar a mano antes de aplicar';
  end if;
  execute replace(v_def, v_anchor, v_new);
end
$patch$;

-- 3) RESERVA 1 · cita de jornada (sin tope por hora, sin fila en web_booking_guard)
create or replace function public.crear_cita_jornada_v1(
  p_negocio_id uuid, p_servicio_id uuid, p_recurso_id uuid,
  p_nombre text, p_telefono_e164 text, p_inicio timestamptz,
  p_phone_hash text, p_ip_hash text, p_device_hash text,
  p_dni text, p_procedimiento text, p_token_hash text
)
returns table(cita_id uuid, codigo_web text)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $fn$
declare
  v_anticipacion integer;
  v_horizonte integer;
  v_tz text;
  v_intervalo integer;
  v_fin timestamptz;
  v_policy record;
  v_risk record;
  v_contacto uuid;
  v_cita uuid;
  v_proc text;
  v_recientes integer;
begin
  if p_negocio_id is null or p_servicio_id is null or p_recurso_id is null or p_inicio is null then raise exception 'INVALID_INPUT'; end if;
  if coalesce(length(trim(p_nombre)), 0) < 3 then raise exception 'INVALID_NAME'; end if;
  if p_telefono_e164 is null or p_telefono_e164 !~ '^[+][1-9][0-9]{7,14}$' then raise exception 'INVALID_PHONE'; end if;
  if coalesce(p_phone_hash, '') = '' or coalesce(p_ip_hash, '') = '' or coalesce(p_device_hash, '') = '' then raise exception 'INVALID_GUARD'; end if;
  if coalesce(p_dni, '') !~ '^[0-9]{8}$' then raise exception 'INVALID_DNI'; end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT'; end if;
  v_proc := nullif(regexp_replace(trim(coalesce(p_procedimiento, '')), '\s+', ' ', 'g'), '');
  if v_proc is null or char_length(v_proc) not between 3 and 80 then raise exception 'INVALID_PROCEDURE'; end if;

  select ca.anticipacion_min, ca.horizonte_dias, n.zona_horaria
    into v_anticipacion, v_horizonte, v_tz
    from public.configuracion_agenda ca
    join public.negocios n on n.id = ca.negocio_id
   where ca.negocio_id = p_negocio_id and ca.activa = true and n.activo = true;
  if not found then raise exception 'AGENDA_INACTIVE'; end if;

  if not exists (
    select 1 from public.servicios s
     where s.id = p_servicio_id and s.negocio_id = p_negocio_id and s.codigo_externo = 'jornada'
       and s.activo = true and s.visible_web = true
  ) then raise exception 'INVALID_SERVICE'; end if;

  if not exists (
    select 1 from public.servicios_recursos sr
      join public.recursos_agenda r on r.id = sr.recurso_id and r.negocio_id = sr.negocio_id
     where sr.negocio_id = p_negocio_id and sr.servicio_id = p_servicio_id
       and sr.recurso_id = p_recurso_id and r.activo = true
  ) then raise exception 'INVALID_RESOURCE'; end if;

  select * into v_risk from public.get_dr_olano_booking_risk(p_negocio_id, p_telefono_e164);
  if coalesce(v_risk.requiere_revision_manual, false) then raise exception 'MANUAL_REVIEW_REQUIRED'; end if;

  if p_inicio < now() + make_interval(mins => v_anticipacion) then raise exception 'TOO_SOON'; end if;
  if p_inicio > now() + make_interval(days => v_horizonte) then raise exception 'OUT_OF_HORIZON'; end if;

  select * into v_policy
    from private.dr_olano_resolve_slot_policy(p_negocio_id, p_servicio_id, p_recurso_id, p_inicio);
  if not coalesce(v_policy.permitido, false) then raise exception 'OUTSIDE_SCHEDULE'; end if;
  v_intervalo := greatest(coalesce(v_policy.intervalo_min, 60), 1);
  v_fin := p_inicio + make_interval(mins => v_intervalo);

  -- El consultorio aún puede bloquear una hora puntual de la jornada
  if exists (
    select 1 from public.excepciones_agenda e
     where e.negocio_id = p_negocio_id and e.recurso_id = p_recurso_id and e.tipo = 'bloqueo'
       and tstzrange(e.inicio, e.fin, '[)') && tstzrange(p_inicio, v_fin, '[)')
  ) then raise exception 'BLOCKED_SLOT'; end if;

  perform pg_advisory_xact_lock(hashtextextended('jn-phone|' || p_negocio_id::text || '|' || p_phone_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('jn-ip|' || p_negocio_id::text || '|' || p_ip_hash, 0));

  -- Freno contra abuso (NO es el límite de 1 hora): máximo 8 reservas de jornada por hora por red o dispositivo
  select count(*) into v_recientes
    from private.dr_olano_jornada_reserva r
   where r.negocio_id = p_negocio_id and r.created_at > now() - interval '1 hour'
     and (r.ip_hash = p_ip_hash or r.device_hash = p_device_hash);
  if v_recientes >= 8 and not private.dr_olano_es_numero_de_prueba(p_telefono_e164) then raise exception 'RATE_LIMIT_JORNADA'; end if;

  insert into public.contactos(negocio_id, nombre, telefono_e164)
  values (p_negocio_id, trim(p_nombre), p_telefono_e164)
  on conflict (negocio_id, telefono_e164) do update set nombre = excluded.nombre, updated_at = now()
  returning id into v_contacto;

  -- Un solo día de jornada activo por celular (los números de prueba no tienen este tope)
  if not private.dr_olano_es_numero_de_prueba(p_telefono_e164) and exists (
    select 1 from private.dr_olano_jornada_reserva r
      join public.citas c on c.id = r.cita_id
     where r.contacto_id = v_contacto and c.estado in ('pendiente', 'confirmada')
  ) then raise exception 'JORNADA_ALREADY_BOOKED'; end if;

  insert into public.citas(
    negocio_id, contacto_id, servicio_id, recurso_id, inicio, fin, estado, origen, notas,
    modalidad, tipo_cita, precio_reserva_pen, motivo_consulta
  ) values (
    p_negocio_id, v_contacto, p_servicio_id, p_recurso_id, p_inicio, v_fin, 'confirmada', 'web',
    'Reserva de día de jornada desde doctorolano.pe',
    'presencial', 'jornada', null, 'Jornada · interés: ' || v_proc
  ) returning id into v_cita;

  insert into private.dr_olano_booking_identity(cita_id, dni) values (v_cita, p_dni);
  insert into private.dr_olano_jornada_reserva(cita_id, negocio_id, contacto_id, token_hash, procedimiento, ip_hash, device_hash)
  values (v_cita, p_negocio_id, v_contacto, p_token_hash, v_proc, p_ip_hash, p_device_hash);

  return query select v_cita, 'DO-' || upper(substr(replace(v_cita::text, '-', ''), 1, 8));
end;
$fn$;

-- 4) RESERVA 2 · evaluación previa enlazada (usa los datos de la reserva 1; mantiene el límite de 1 hora)
create or replace function public.crear_cita_evaluacion_jornada_v1(
  p_negocio_id uuid, p_servicio_id uuid, p_recurso_id uuid,
  p_token_hash text, p_inicio timestamptz,
  p_phone_hash text, p_ip_hash text, p_device_hash text
)
returns table(cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $fn$
declare
  v_link record;
  v_row record;
  v_inicio_jornada timestamptz;
begin
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'JORNADA_TOKEN_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended('jn-eval|' || p_token_hash, 0));

  select r.cita_id, r.contacto_id, r.procedimiento, r.evaluacion_cita_id,
         c.estado as estado_jornada, c.inicio as inicio_jornada,
         ct.nombre, ct.telefono_e164, i.dni
    into v_link
    from private.dr_olano_jornada_reserva r
    join public.citas c on c.id = r.cita_id
    join public.contactos ct on ct.id = r.contacto_id
    left join private.dr_olano_booking_identity i on i.cita_id = r.cita_id
   where r.negocio_id = p_negocio_id and r.token_hash = p_token_hash;
  if not found or v_link.estado_jornada not in ('pendiente', 'confirmada') or v_link.dni is null then
    raise exception 'JORNADA_TOKEN_INVALID';
  end if;
  v_inicio_jornada := v_link.inicio_jornada;

  if v_link.evaluacion_cita_id is not null and not private.dr_olano_es_numero_de_prueba(v_link.telefono_e164) and exists (
    select 1 from public.citas c where c.id = v_link.evaluacion_cita_id and c.estado in ('pendiente', 'confirmada')
  ) then raise exception 'EVALUACION_ALREADY_BOOKED'; end if;

  if not exists (
    select 1 from public.servicios s
     where s.id = p_servicio_id and s.negocio_id = p_negocio_id and s.codigo_externo = 'evaluacion-jornada' and s.activo = true
  ) then raise exception 'INVALID_SERVICE'; end if;

  if p_inicio >= v_inicio_jornada then raise exception 'EVALUACION_AFTER_JORNADA'; end if;

  -- Misma validación que cualquier cita web: horario, 3 por hora, límite de 1 hora, riesgo
  select * into v_row from public.crear_cita_web_segura_v3(
    p_negocio_id, p_servicio_id, p_recurso_id, v_link.nombre, v_link.telefono_e164, p_inicio,
    p_phone_hash, p_ip_hash, p_device_hash, null,
    'Evaluación previa a la jornada · interés: ' || v_link.procedimiento
  );
  if v_row.cita_id is null then raise exception 'BOOKING_FAILED'; end if;

  insert into private.dr_olano_booking_identity(cita_id, dni) values (v_row.cita_id, v_link.dni);
  update private.dr_olano_jornada_reserva jr set evaluacion_cita_id = v_row.cita_id where jr.cita_id = v_link.cita_id;

  return query select v_row.cita_id::uuid, v_row.codigo_web::text, v_row.cupo_hora::integer;
end;
$fn$;

-- 5) Estado de la reserva 1 por token (para prellenar la reserva 2 sin pedir los datos otra vez)
create or replace function public.get_dr_olano_jornada_estado_v1(p_negocio_id uuid, p_token_hash text)
returns table(
  nombre text, celular text, procedimiento text, inicio timestamptz,
  jornada_estado text, evaluacion_cita_id uuid, evaluacion_estado text, evaluacion_inicio timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'private', 'pg_temp'
as $fn$
  select ct.nombre, ct.telefono_e164, r.procedimiento, c.inicio, c.estado,
         r.evaluacion_cita_id, e.estado, e.inicio
    from private.dr_olano_jornada_reserva r
    join public.citas c on c.id = r.cita_id
    join public.contactos ct on ct.id = r.contacto_id
    left join public.citas e on e.id = r.evaluacion_cita_id
   where r.negocio_id = p_negocio_id and r.token_hash = p_token_hash
     and p_token_hash ~ '^[0-9a-f]{64}$';
$fn$;

revoke all on function public.crear_cita_jornada_v1(uuid, uuid, uuid, text, text, timestamptz, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.crear_cita_evaluacion_jornada_v1(uuid, uuid, uuid, text, timestamptz, text, text, text) from public, anon, authenticated;
revoke all on function public.get_dr_olano_jornada_estado_v1(uuid, text) from public, anon, authenticated;
grant execute on function public.crear_cita_jornada_v1(uuid, uuid, uuid, text, text, timestamptz, text, text, text, text, text, text) to service_role;
grant execute on function public.crear_cita_evaluacion_jornada_v1(uuid, uuid, uuid, text, timestamptz, text, text, text) to service_role;
grant execute on function public.get_dr_olano_jornada_estado_v1(uuid, text) to service_role;

-- 4a) Revisión manual por cancelaciones / inasistencias: envoltorio que no depende del texto de la función.
--     La función original pasa a private.dr_olano_booking_risk_base y la pública conserva nombre, firma y permisos.
do $wrap$
begin
  if not exists (select 1 from pg_proc where proname = 'dr_olano_booking_risk_base' and pronamespace = 'private'::regnamespace) then
    alter function public.get_dr_olano_booking_risk(uuid, text) set schema private;
    alter function private.get_dr_olano_booking_risk(uuid, text) rename to dr_olano_booking_risk_base;
  end if;
end
$wrap$;
create or replace function public.get_dr_olano_booking_risk(p_negocio_id uuid, p_telefono_e164 text)
returns table(no_shows_180 integer, cancelaciones_60 integer, completadas_180 integer, requiere_revision_manual boolean, motivo text)
language plpgsql security definer
set search_path to 'public', 'private', 'pg_temp'
as $fn$
begin
  if private.dr_olano_es_numero_de_prueba(p_telefono_e164) then
    return query select 0, 0, 0, false, null::text;
    return;
  end if;
  return query select * from private.dr_olano_booking_risk_base(p_negocio_id, p_telefono_e164);
end;
$fn$;
revoke all on function public.get_dr_olano_booking_risk(uuid, text) from public, anon, authenticated;
grant execute on function public.get_dr_olano_booking_risk(uuid, text) to service_role;
revoke all on function private.dr_olano_booking_risk_base(uuid, text) from public, anon, authenticated;

-- 4) Números de prueba en las reglas compartidas (cada parche se detiene si la definición real ya no coincide)
do $patch_prueba$
declare
  v_def text; v_oid oid; v_a text; v_n text;
begin
  -- 4a) (la revisión manual se resuelve fuera de este bloque, con un envoltorio)

  -- 4b) Cita web normal: límite de 1 hora (no se consulta ni se escribe guard para estos números)
  v_oid := 'public.crear_cita_web_segura_v3(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text)'::regprocedure;
  v_def := pg_get_functiondef(v_oid);
  if position('dr_olano_es_numero_de_prueba' in v_def) = 0 then
    v_a := E'  if exists(\n    select 1 from private.web_booking_guard g';
    v_n := E'  if not private.dr_olano_es_numero_de_prueba(p_telefono_e164) and exists(\n    select 1 from private.web_booking_guard g';
    if (length(v_def) - length(replace(v_def, v_a, ''))) / length(v_a) <> 1 then raise exception 'V3_GUARD_DEFINICION_CAMBIO'; end if;
    v_def := replace(v_def, v_a, v_n);
    v_a := E'  insert into private.web_booking_guard(negocio_id,cita_id,phone_hash,ip_hash,device_hash)\n  values(p_negocio_id,v_cita_id,p_phone_hash,p_ip_hash,p_device_hash);';
    v_n := E'  if not private.dr_olano_es_numero_de_prueba(p_telefono_e164) then\n    insert into private.web_booking_guard(negocio_id,cita_id,phone_hash,ip_hash,device_hash)\n    values(p_negocio_id,v_cita_id,p_phone_hash,p_ip_hash,p_device_hash);\n  end if;';
    if (length(v_def) - length(replace(v_def, v_a, ''))) / length(v_a) <> 1 then raise exception 'V3_INSERT_DEFINICION_CAMBIO'; end if;
    execute replace(v_def, v_a, v_n);
  end if;

  -- 4c) Máximo de citas por cliente por día (disparador)
  v_oid := 'private.enforce_cita_booking_rules()'::regprocedure;
  v_def := pg_get_functiondef(v_oid);
  if position('dr_olano_test_phones' in v_def) = 0 then
    v_a := E'  if new.estado in (''pendiente'',''confirmada'')\n     and v_max_citas is not null then';
    v_n := E'  if new.estado in (''pendiente'',''confirmada'')\n     and v_max_citas is not null\n     and not exists (select 1 from public.contactos ct join private.dr_olano_test_phones tp on tp.telefono_e164 = ct.telefono_e164 where ct.id = new.contacto_id) then';
    if (length(v_def) - length(replace(v_def, v_a, ''))) / length(v_a) <> 1 then raise exception 'TRIGGER_DEFINICION_CAMBIO'; end if;
    execute replace(v_def, v_a, v_n);
  end if;
end
$patch_prueba$;

commit;

-- DESPUÉS de aplicar (una sola vez): crear las etiquetas de color en Google Calendar para los dos servicios nuevos.
-- El worker ya envía eventLabelId = id del servicio; si la etiqueta no existe, el evento fallaría.
-- Acción: POST dr-olano-google-calendar-worker con {"action":"ensure_labels"} (mismo secreto del cron).
