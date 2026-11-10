-- Esquema mínimo aislado para validar la migración del puente.
-- NO ejecutarlo contra el CRM real. Solo en PostgreSQL efímero de GitHub Actions.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema private;

-- Reproduce el enlace que YA existe entre citas del CRM y Google Calendar.
create table public.negocios(id uuid primary key, slug text not null unique);
insert into public.negocios(id,slug)
values ('00000000-0000-4000-8000-000000000d01','dr-olano');

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
 negocio_id uuid not null references public.negocios(id),
 recurso_id uuid not null,
 contacto_id uuid not null references public.contactos(id),
 servicio_id uuid not null references public.servicios(id),
 inicio timestamptz not null,
 fin timestamptz not null,
 estado text not null
);
insert into public.servicios(id,nombre)
values ('00000000-0000-4000-8000-000000000e01','Consulta médica');

create table private.cita_integracion_outbox (
  negocio_id uuid not null,
  cita_id uuid not null,
  tipo text not null,
  accion text not null,
  estado text not null,
  intentos integer not null,
  disponible_at timestamptz not null,
  ultimo_error text,
  procesado_at timestamptz,
  updated_at timestamptz not null,
  constraint calendar_outbox_test_unique unique(cita_id,tipo)
);

-- Copia funcional de private.enqueue_dr_olano_integrations comprobada en el CRM.
create or replace function private.enqueue_dr_olano_integrations()
returns trigger language plpgsql security definer
set search_path to 'pg_catalog','public','private'
as $calendar_trigger$
declare
  v_is_dr_olano boolean;
  v_action text;
  v_relevant_change boolean := true;
begin
  select exists(
    select 1 from public.negocios n
    where n.id=new.negocio_id and n.slug='dr-olano'
  ) into v_is_dr_olano;
  if not v_is_dr_olano then return new; end if;
  if tg_op='UPDATE' then
    v_relevant_change :=
      new.estado is distinct from old.estado or
      new.inicio is distinct from old.inicio or
      new.fin is distinct from old.fin or
      new.servicio_id is distinct from old.servicio_id or
      new.contacto_id is distinct from old.contacto_id or
      new.recurso_id is distinct from old.recurso_id;
    if not v_relevant_change then return new; end if;
  end if;
  if new.estado='cancelada' then v_action:='cancel';
  elsif new.estado='confirmada' then v_action:='upsert';
  else return new;
  end if;
  insert into private.cita_integracion_outbox(
    negocio_id,cita_id,tipo,accion,estado,intentos,
    disponible_at,ultimo_error,procesado_at,updated_at
  ) values
    (new.negocio_id,new.id,'google_calendar',v_action,'pendiente',0,now(),null,null,now()),
    (new.negocio_id,new.id,'aviso_negocio',v_action,'pendiente',0,now(),null,null,now())
  on conflict (cita_id,tipo) do update
    set accion=excluded.accion,estado='pendiente',intentos=0,
      disponible_at=now(),ultimo_error=null,procesado_at=null,updated_at=now();
  return new;
end;
$calendar_trigger$;

create trigger trg_dr_olano_cita_integrations
after insert or update on public.citas
for each row execute function private.enqueue_dr_olano_integrations();

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

 insert into public.citas(id,negocio_id,recurso_id,contacto_id,servicio_id,inicio,fin,estado)
 values(v_cita_id,p_negocio_id,p_recurso_id,v_contacto_id,p_servicio_id,p_inicio,p_inicio+interval '30 minutes','confirmada');

 return query select v_cita_id,'DO-TEST'::text,1::integer;
end;
$$;
