-- Sólo las nuevas solicitudes de la ruta OTP con adelanto usan este ciclo.
alter table public.citas add column requiere_adelanto_web boolean not null default false;

create table private.dr_olano_solicitud_en_curso (transaccion bigint primary key);
revoke all on private.dr_olano_solicitud_en_curso from public,anon,authenticated;
create function private.dr_olano_estado_adelanto_web() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    if exists(select from private.dr_olano_solicitud_en_curso where transaccion=txid_current()) and new.origen='web'
       and exists(select from public.negocios where id=new.negocio_id and slug='dr-olano') then
      new.requiere_adelanto_web := true;
      new.estado := 'pendiente';
      new.notas := 'Solicitud web pendiente de adelanto';
    end if;
    return new;
  end if;
  if old.requiere_adelanto_web then
    new.requiere_adelanto_web := true;
    if new.estado in ('confirmada','completada') and old.estado is distinct from new.estado
       and not exists(select from public.pagos p where p.cita_id=new.id and p.negocio_id=new.negocio_id
         and p.contacto_id=new.contacto_id and p.estado='pagado' and p.monto>0) then
      raise exception 'ADELANTO_PENDIENTE';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.dr_olano_estado_adelanto_web() from public,anon,authenticated;
create trigger trg_adelanto_web before insert or update of estado,requiere_adelanto_web on public.citas
for each row execute function private.dr_olano_estado_adelanto_web();

-- Las colas existentes solo publican una solicitud pendiente al confirmarse.
create function private.dr_olano_esperar_adelanto() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select from public.citas where id=new.cita_id and requiere_adelanto_web and estado='pendiente') then
    new.next_attempt_at := 'infinity';
  end if;
  return new;
end $$;
revoke all on function private.dr_olano_esperar_adelanto() from public,anon,authenticated;
create trigger esperar_adelanto_email before insert or update on private.dr_olano_booking_email_outbox
for each row execute function private.dr_olano_esperar_adelanto();
create trigger esperar_adelanto_app before insert or update on private.dr_olano_app_bridge_queue
for each row execute function private.dr_olano_esperar_adelanto();

create function private.dr_olano_liberar_email_adelanto() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update private.dr_olano_booking_email_outbox set next_attempt_at=now()
  where cita_id=new.id and status='pending' and next_attempt_at='infinity';
  return new;
end $$;
revoke all on function private.dr_olano_liberar_email_adelanto() from public,anon,authenticated;
create trigger liberar_email_adelanto after update of estado on public.citas
for each row when(new.requiere_adelanto_web and old.estado='pendiente' and new.estado in ('confirmada','completada'))
execute function private.dr_olano_liberar_email_adelanto();

create function public.crear_solicitud_web_con_adelanto(
 p_negocio_id uuid,p_servicio_id uuid,p_recurso_id uuid,p_nombre text,p_telefono_e164 text,
 p_inicio timestamptz,p_phone_hash text,p_ip_hash text,p_device_hash text,p_modalidad text,
 p_motivo_consulta text,p_patient_user_id uuid,p_dni text,p_verified_email text)
returns table(cita_id uuid,codigo_web text,cupo_hora integer)
language plpgsql security definer set search_path='' as $$
begin
  insert into private.dr_olano_solicitud_en_curso values(txid_current());
  return query select * from public.crear_cita_web_segura_v6(p_negocio_id,p_servicio_id,
    p_recurso_id,p_nombre,p_telefono_e164,p_inicio,p_phone_hash,p_ip_hash,p_device_hash,p_modalidad,
    p_motivo_consulta,p_patient_user_id,p_dni,p_verified_email);
  delete from private.dr_olano_solicitud_en_curso where transaccion=txid_current();
end $$;
revoke all on function public.crear_solicitud_web_con_adelanto(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.crear_solicitud_web_con_adelanto(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text) to service_role;
