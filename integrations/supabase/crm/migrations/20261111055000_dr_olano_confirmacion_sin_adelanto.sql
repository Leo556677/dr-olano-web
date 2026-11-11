-- El pago se controla en recepción y no condiciona la confirmación.
drop trigger trg_adelanto_web on public.citas;
drop trigger esperar_adelanto_email on private.dr_olano_booking_email_outbox;
drop trigger esperar_adelanto_app on private.dr_olano_app_bridge_queue;
drop trigger liberar_email_adelanto on public.citas;
create or replace function public.crear_solicitud_web_con_adelanto(
 p_negocio_id uuid,p_servicio_id uuid,p_recurso_id uuid,p_nombre text,p_telefono_e164 text,
 p_inicio timestamptz,p_phone_hash text,p_ip_hash text,p_device_hash text,p_modalidad text,
 p_motivo_consulta text,p_patient_user_id uuid,p_dni text,p_verified_email text)
returns table(cita_id uuid,codigo_web text,cupo_hora integer)
language plpgsql security definer set search_path='' as $$
begin
  return query select * from public.crear_cita_web_segura_v6(p_negocio_id,p_servicio_id,
    p_recurso_id,p_nombre,p_telefono_e164,p_inicio,p_phone_hash,p_ip_hash,p_device_hash,p_modalidad,
    p_motivo_consulta,p_patient_user_id,p_dni,p_verified_email);
end $$;
revoke all on function public.crear_solicitud_web_con_adelanto(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.crear_solicitud_web_con_adelanto(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid,text,text) to service_role;

update public.citas c set estado='confirmada',requiere_adelanto_web=false,
 notas=case when notas='Solicitud web pendiente de adelanto' then 'Reserva web confirmada. Pago por coordinar con recepción.' else notas end
where c.requiere_adelanto_web and c.estado='pendiente' and c.origen='web'
and exists(select from public.negocios n where n.id=c.negocio_id and n.slug='dr-olano');
update private.dr_olano_booking_email_outbox q set next_attempt_at=now()
where q.status='pending' and q.next_attempt_at='infinity'
and exists(select from public.citas c where c.id=q.cita_id and c.estado='confirmada' and not c.requiere_adelanto_web);
update private.dr_olano_app_bridge_queue q set next_attempt_at=now()
where q.status='pending' and q.next_attempt_at='infinity'
and exists(select from public.citas c where c.id=q.cita_id and c.estado='confirmada' and not c.requiere_adelanto_web);
