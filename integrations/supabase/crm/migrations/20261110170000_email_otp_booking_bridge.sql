-- PROPUESTA / NO APLICADA al CRM de producción.
-- La reserva web se confirma y queda ligada a un usuario Auth VERIFICADO de la app
-- dentro de la misma transacción. Sin DNI ni teléfonos como claves de acceso.

create table private.dr_olano_app_bridge_links (
  cita_id uuid primary key references public.citas(id) on delete restrict,
  patient_user_id uuid not null,
  created_at timestamptz not null default now()
);

create table private.dr_olano_app_bridge_queue (
  cita_id uuid primary key references public.citas(id) on delete restrict,
  revision bigint not null default 1 check (revision > 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index dr_olano_app_bridge_queue_ready_idx
  on private.dr_olano_app_bridge_queue(status, next_attempt_at);

alter table private.dr_olano_app_bridge_links enable row level security;
alter table private.dr_olano_app_bridge_queue enable row level security;
revoke all on private.dr_olano_app_bridge_links from PUBLIC, anon, authenticated;
revoke all on private.dr_olano_app_bridge_queue from PUBLIC, anon, authenticated;

-- Reutiliza íntegramente las validaciones actuales de v3:
-- Turnstile, antiabuso, horario, recurso, capacidad y reserva confirmada.
create or replace function public.crear_cita_web_segura_v4(
  p_negocio_id uuid,
  p_servicio_id uuid,
  p_recurso_id uuid,
  p_nombre text,
  p_telefono_e164 text,
  p_inicio timestamptz,
  p_phone_hash text,
  p_ip_hash text,
  p_device_hash text,
  p_modalidad text,
  p_motivo_consulta text,
  p_patient_user_id uuid
) returns table(cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if p_patient_user_id is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;

  select * into v_row from public.crear_cita_web_segura_v3(
    p_negocio_id, p_servicio_id, p_recurso_id, p_nombre, p_telefono_e164, p_inicio,
    p_phone_hash, p_ip_hash, p_device_hash, p_modalidad, p_motivo_consulta
  );
  if v_row.cita_id is null then raise exception 'BOOKING_FAILED'; end if;

  insert into private.dr_olano_app_bridge_links (cita_id, patient_user_id)
  values (v_row.cita_id, p_patient_user_id);

  insert into private.dr_olano_app_bridge_queue (cita_id, revision)
  values (v_row.cita_id, 1);

  return query select v_row.cita_id::uuid, v_row.codigo_web::text, v_row.cupo_hora::integer;
end;
$$;
revoke all on function public.crear_cita_web_segura_v4(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid
) from PUBLIC, anon, authenticated;
grant execute on function public.crear_cita_web_segura_v4(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid
) to service_role;

create or replace function private.enqueue_dr_olano_app_bridge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and
      (new.inicio, new.fin, new.estado, new.servicio_id) is not distinct from
      (old.inicio, old.fin, old.estado, old.servicio_id) then
    return new;
  end if;

  -- Reservas de otros canales sin email verificado no se importan.
  if exists (select 1 from private.dr_olano_app_bridge_links where cita_id = new.id) then
    insert into private.dr_olano_app_bridge_queue(cita_id, revision)
    values (new.id, 1)
    on conflict (cita_id) do update
      set revision = private.dr_olano_app_bridge_queue.revision + 1,
          status = 'pending',
          attempts = 0,
          next_attempt_at = now(),
          processed_at = null,
          last_error_code = null,
          updated_at = now();
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_dr_olano_app_bridge() from PUBLIC, anon, authenticated;

create trigger trg_dr_olano_app_bridge
after update of inicio, fin, estado, servicio_id on public.citas
for each row execute function private.enqueue_dr_olano_app_bridge();

create or replace function public.dr_olano_app_bridge_claim(p_limit integer default 20)
returns table(
  cita_id uuid,
  patient_user_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  state text,
  service_name text,
  revision bigint
)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  with picked as (
    select q.cita_id from private.dr_olano_app_bridge_queue q
    where q.status in ('pending','processing') and q.next_attempt_at <= now()
    order by q.next_attempt_at asc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update skip locked
  ), updated as (
    update private.dr_olano_app_bridge_queue q
      set status='processing',
          attempts=q.attempts+1,
          next_attempt_at=now()+interval '5 minutes',
          updated_at=now()
    from picked p where q.cita_id=p.cita_id
    returning q.cita_id, q.revision
  )
  select
    u.cita_id, l.patient_user_id, c.inicio, c.fin,
    case when c.estado = 'completada' then 'completed'
         when c.estado in ('cancelada','no_asistio') then 'cancelled'
         else 'confirmed' end::text,
    case when char_length(btrim(coalesce(s.nombre,''))) >= 2 then left(btrim(s.nombre),120) else 'Consulta médica' end::text,
    u.revision
  from updated u
  join private.dr_olano_app_bridge_links l on l.cita_id=u.cita_id
  join public.citas c on c.id=u.cita_id
  left join public.servicios s on s.id=c.servicio_id;
end;
$$;
revoke all on function public.dr_olano_app_bridge_claim(integer) from PUBLIC, anon, authenticated;
grant execute on function public.dr_olano_app_bridge_claim(integer) to service_role;

create or replace function public.dr_olano_app_bridge_finish(
  p_cita_id uuid, p_revision bigint, p_ok boolean, p_error_code text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count bigint;
begin
  update private.dr_olano_app_bridge_queue
  set status = case when p_ok then 'done' else 'pending' end,
      next_attempt_at = case when p_ok then now()
        else now() + interval '1 minute' * least(60, greatest(attempts, 1) * 2) end,
      last_error_code = case when p_ok then null else left(coalesce(p_error_code,'BRIDGE_FAILED'), 80) end,
      processed_at = case when p_ok then now() else null end,
      updated_at = now()
  where cita_id=p_cita_id and revision=p_revision and status='processing';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
revoke all on function public.dr_olano_app_bridge_finish(uuid,bigint,boolean,text)
  from PUBLIC, anon, authenticated;
grant execute on function public.dr_olano_app_bridge_finish(uuid,bigint,boolean,text)
  to service_role;
