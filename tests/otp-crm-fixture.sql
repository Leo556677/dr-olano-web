-- Esquema mínimo aislado para validar la migración del puente.
-- NO ejecutarlo contra el CRM real. Solo en PostgreSQL efímero de GitHub Actions.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema private;

create table public.contactos (
 id uuid primary key default gen_random_uuid(),
 telefono_e164 text not null unique,
 nombre text not null
);
create table public.servicios (
 id uuid primary key,
 nombre text not null
);
create table public.citas (
 id uuid primary key default gen_random_uuid(),
 contacto_id uuid not null references public.contactos(id),
 servicio_id uuid not null references public.servicios(id),
 inicio timestamptz not null,
 fin timestamptz not null,
 estado text not null
);
insert into public.servicios(id,nombre)
values ('00000000-0000-4000-8000-000000000e01','Consulta médica');

create function public.crear_cita_web_segura_v3(
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
 p_motivo_consulta text
) returns table (cita_id uuid, codigo_web text, cupo_hora integer)
language plpgsql as $$
declare
 v_contacto_id uuid;
 v_cita_id uuid := gen_random_uuid();
begin
 insert into public.contactos(telefono_e164,nombre)
 values(p_telefono_e164,p_nombre)
 on conflict (telefono_e164) do update set nombre=excluded.nombre
 returning id into v_contacto_id;

 insert into public.citas(id,contacto_id,servicio_id,inicio,fin,estado)
 values(v_cita_id,v_contacto_id,p_servicio_id,p_inicio,p_inicio+interval '30 minutes','confirmada');

 return query select v_cita_id,'DO-TEST'::text,1::integer;
end;
$$;
