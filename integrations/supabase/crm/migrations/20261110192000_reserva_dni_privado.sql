-- Datos de identificación de la reserva: NOMBRES Y APELLIDOS se mantienen en UN solo campo.
-- El DNI no es credencial de acceso: app Auth siempre exige correo verificado por OTP.
-- Guardado en esquema private, no expuesto al navegador, analytics ni API pública.
create table private.dr_olano_booking_identity (
  cita_id uuid primary key references public.citas(id) on delete cascade,
  dni text not null check (dni ~ '^[0-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table private.dr_olano_booking_identity enable row level security;
revoke all on private.dr_olano_booking_identity from PUBLIC, anon, authenticated;
grant select, insert on private.dr_olano_booking_identity to service_role;

-- Solo la modalidad futura de correo OTP asocia un DNI a un user.id autenticado.
-- Evita que el mismo email reclame distintos DNIs y que un DNI se atribuya a varios emails.
create table private.dr_olano_verified_patient_dni (
  patient_user_id uuid primary key,
  dni text not null unique check (dni ~ '^[0-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table private.dr_olano_verified_patient_dni enable row level security;
revoke all on private.dr_olano_verified_patient_dni from PUBLIC, anon, authenticated;
grant select, insert on private.dr_olano_verified_patient_dni to service_role;

-- Correo transaccional: una cola privada e idempotente por cita.
create table private.dr_olano_booking_email_outbox (
  cita_id uuid primary key references public.citas(id) on delete cascade,
  recipient_email text not null check(
    char_length(recipient_email) between 5 and 254 and
    recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  booking_code text not null check(char_length(booking_code) between 5 and 90),
  status text not null default 'pending' check(status in ('pending','processing','sent','skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default(now()+interval '2 minutes'),
  processed_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index dr_olano_booking_email_ready_idx on private.dr_olano_booking_email_outbox(status,next_attempt_at);
alter table private.dr_olano_booking_email_outbox enable row level security;
revoke all on private.dr_olano_booking_email_outbox from PUBLIC,anon,authenticated;
grant select,insert,update on private.dr_olano_booking_email_outbox to service_role;

-- Reserva antigua con DNI: todas las validaciones de v3 se mantienen.
-- Si falla el guardado del DNI, la transacción entera se revierte.
create function public.crear_cita_web_segura_v5(
  p_negocio_id uuid, p_servicio_id uuid, p_recurso_id uuid, p_nombre text,
  p_telefono_e164 text, p_inicio timestamptz,
  p_phone_hash text, p_ip_hash text, p_device_hash text,
  p_modalidad text, p_motivo_consulta text, p_dni text
)
returns table (cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql security definer set search_path = ''
as $$
declare v_row record;
begin
  if coalesce(p_dni,'') !~ '^[0-9]{8}$' then raise exception 'INVALID_DNI'; end if;
  select * into v_row from public.crear_cita_web_segura_v3(
    p_negocio_id,p_servicio_id,p_recurso_id,p_nombre,p_telefono_e164,p_inicio,
    p_phone_hash,p_ip_hash,p_device_hash,p_modalidad,p_motivo_consulta
  );
  if v_row.cita_id is null then raise exception 'BOOKING_FAILED'; end if;
  insert into private.dr_olano_booking_identity(cita_id,dni)
    values (v_row.cita_id,p_dni);
  return query select v_row.cita_id::uuid,v_row.codigo_web::text,v_row.cupo_hora::integer;
end;
$$;
revoke all on function public.crear_cita_web_segura_v5(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,text
) from PUBLIC, anon, authenticated;
grant execute on function public.crear_cita_web_segura_v5(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,text
) to service_role;

-- Reserva futura autenticada por correo OTP: v4 + DNI consistente con la cuenta.
create function public.crear_cita_web_segura_v6(
  p_negocio_id uuid, p_servicio_id uuid, p_recurso_id uuid, p_nombre text,
  p_telefono_e164 text, p_inicio timestamptz,
  p_phone_hash text, p_ip_hash text, p_device_hash text,
  p_modalidad text, p_motivo_consulta text, p_patient_user_id uuid, p_dni text,
  p_verified_email text
)
returns table (cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql security definer set search_path = ''
as $$
declare v_row record;
begin
  if coalesce(p_dni,'') !~ '^[0-9]{8}$' then raise exception 'INVALID_DNI'; end if;
  if p_patient_user_id is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_verified_email,''))) not between 5 and 254
    or lower(btrim(p_verified_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;

  insert into private.dr_olano_verified_patient_dni(patient_user_id,dni)
    values (p_patient_user_id,p_dni)
    on conflict (patient_user_id) do nothing;
  if not exists(
    select 1 from private.dr_olano_verified_patient_dni
    where patient_user_id = p_patient_user_id and dni = p_dni
  ) then raise exception 'PATIENT_DNI_CHANGE_REQUIRES_REVIEW'; end if;

  select * into v_row from public.crear_cita_web_segura_v4(
    p_negocio_id,p_servicio_id,p_recurso_id,p_nombre,p_telefono_e164,p_inicio,
    p_phone_hash,p_ip_hash,p_device_hash,p_modalidad,p_motivo_consulta,
    p_patient_user_id
  );
  if v_row.cita_id is null then raise exception 'BOOKING_FAILED'; end if;
  insert into private.dr_olano_booking_identity(cita_id,dni)
    values(v_row.cita_id,p_dni);
  insert into private.dr_olano_booking_email_outbox(cita_id,recipient_email,booking_code)
    values(v_row.cita_id,lower(btrim(p_verified_email)),v_row.codigo_web);
  return query select v_row.cita_id::uuid,v_row.codigo_web::text,v_row.cupo_hora::integer;
end;
$$;
revoke all on function public.crear_cita_web_segura_v6(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text
) from PUBLIC, anon, authenticated;
grant execute on function public.crear_cita_web_segura_v6(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text
) to service_role;

comment on table private.dr_olano_booking_identity is
  'DNI de 8 dígitos asociado a una cita, privado y nunca enviado a analítica. No sirve para acceder a historias clínicas.';

-- Reclamación segura de correos y descuentos previamente canjeados.
create function public.dr_olano_booking_email_claim(p_limit integer default 10)
returns table(
  cita_id uuid, recipient_email text, booking_code text,
  patient_name text, service_name text, starts_at timestamptz,
  appointment_state text, discount_pct integer
)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  with picked as (
    select q.cita_id from private.dr_olano_booking_email_outbox q
    where q.status in ('pending','processing') and q.next_attempt_at <= now()
    order by q.next_attempt_at
    limit least(greatest(coalesce(p_limit,10),1),30)
    for update skip locked
  ), updated as (
    update private.dr_olano_booking_email_outbox q
      set status='processing', attempts=q.attempts+1,
          next_attempt_at=now()+interval '5 minutes', updated_at=now()
    from picked p where q.cita_id=p.cita_id
    returning q.cita_id, q.recipient_email, q.booking_code
  )
  select
    u.cita_id, u.recipient_email, u.booking_code,
    left(coalesce(ct.nombre,'Paciente'),120)::text,
    left(coalesce(s.nombre,'Consulta Dr. Olano'),120)::text,
    c.inicio, c.estado::text,
    (
      select floor(claim.discount_pct)::integer
      from public.dr_olano_offer_claims claim
      where claim.booking_id=u.cita_id
        and claim.status='redeemed' and claim.redeemed_at is not null
        and claim.discount_pct between 1 and 100
      order by claim.redeemed_at desc limit 1
    )
  from updated u
  join public.citas c on c.id=u.cita_id
  join public.contactos ct on ct.id=c.contacto_id
  join public.servicios s on s.id=c.servicio_id;
end;
$$;
revoke all on function public.dr_olano_booking_email_claim(integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.dr_olano_booking_email_claim(integer)
  to service_role;

create function public.dr_olano_booking_email_finish(
  p_cita_id uuid, p_ok boolean, p_skip boolean default false,
  p_error_code text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count bigint := 0;
begin
  update private.dr_olano_booking_email_outbox
  set status=case when p_skip then 'skipped' when p_ok then 'sent' else 'pending' end,
      next_attempt_at=case when p_ok or p_skip then now()
        else now()+interval '1 minute'*least(60,greatest(attempts,1)*3) end,
      processed_at=case when p_ok or p_skip then now() else null end,
      last_error_code=case when p_ok or p_skip then null
        else left(coalesce(p_error_code,'MAIL_PROVIDER_UNAVAILABLE'),80) end,
      updated_at=now()
  where cita_id=p_cita_id and status='processing';
  get diagnostics v_count = row_count;
  return v_count>0;
end;
$$;
revoke all on function public.dr_olano_booking_email_finish(uuid,boolean,boolean,text)
  from PUBLIC, anon, authenticated;
grant execute on function public.dr_olano_booking_email_finish(uuid,boolean,boolean,text)
  to service_role;
