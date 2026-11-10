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
  p_modalidad text, p_motivo_consulta text, p_patient_user_id uuid, p_dni text
)
returns table (cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql security definer set search_path = ''
as $$
declare v_row record;
begin
  if coalesce(p_dni,'') !~ '^[0-9]{8}$' then raise exception 'INVALID_DNI'; end if;
  if p_patient_user_id is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;

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
  return query select v_row.cita_id::uuid,v_row.codigo_web::text,v_row.cupo_hora::integer;
end;
$$;
revoke all on function public.crear_cita_web_segura_v6(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text
) from PUBLIC, anon, authenticated;
grant execute on function public.crear_cita_web_segura_v6(
  uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text
) to service_role;

comment on table private.dr_olano_booking_identity is
  'DNI de 8 dígitos asociado a una cita, privado y nunca enviado a analítica. No sirve para acceder a historias clínicas.';
