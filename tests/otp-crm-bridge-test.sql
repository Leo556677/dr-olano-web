-- Pruebas de rollback, no compartir ficha entre correos, cola y revisiones.
create temp table test_ids (alias text primary key, cita_id uuid not null);
insert into test_ids(alias,cita_id)
select 'A1', v.cita_id from public.crear_cita_web_segura_v4(
 '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
 '00000000-0000-4000-8000-000000000f01',
 'Paciente Uno', '+51911111111', '2026-12-02T15:00:00Z',
 'hash','hash','hash',null,null,
 '00000000-0000-4000-8000-000000000a01') v;

insert into test_ids(alias,cita_id)
select 'A2', v.cita_id from public.crear_cita_web_segura_v4(
 '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
 '00000000-0000-4000-8000-000000000f01',
 '  paciente   uno ', '+51911111111', '2026-12-03T15:00:00Z',
 'hash','hash','hash',null,null,
 '00000000-0000-4000-8000-000000000a01') v;

do $$
begin
 if (select count(*) from private.dr_olano_app_patient_identities) <> 1 then
  raise exception 'ONE_EMAIL_PER_PATIENT_FAILED';
 end if;
 if (select count(*) from private.dr_olano_app_bridge_links) <> 2 then
  raise exception 'VALID_REPEAT_VISIT_FAILED';
 end if;
 if (select count(*) from private.dr_olano_app_bridge_queue where status='pending' and revision=1) <> 2 then
  raise exception 'QUEUE_NOT_CREATED_AT_BOOKING';
 end if;
 if has_function_privilege('authenticated',
   'public.crear_cita_web_segura_v4(uuid,uuid,uuid,text,text,timestamptz,text,text,text,text,text,uuid)',
   'EXECUTE') then raise exception 'UNSAFE_RPC_GRANT'; end if;
end $$;

do $$
declare expected boolean := false;
begin
 -- Mismo correo Auth, celular diferente: nueva ficha -> BLOQUEO y rollback.
 begin
  perform 1 from public.crear_cita_web_segura_v4(
  '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
  '00000000-0000-4000-8000-000000000f01',
  'Paciente Uno', '+51922222222', '2026-12-03T16:00:00Z',
  'hash','hash','hash',null,null,'00000000-0000-4000-8000-000000000a01');
 exception when raise_exception then
  if sqlerrm='PATIENT_IDENTITY_CHANGE_REQUIRES_REVIEW' then expected := true; end if;
 end;
 if not expected then raise exception 'SAME_EMAIL_DIFFERENT_PATIENT_WAS_ALLOWED'; end if;
 if (select count(*) from public.citas) <> 2 then raise exception 'BOOKING_TRANSACTION_NOT_ROLLED_BACK'; end if;
end $$;

do $$
declare expected boolean := false;
begin
 -- Mismo número/ficha CRM, diferente correo verificado -> BLOQUEO de UNIQUE.
 begin
  perform 1 from public.crear_cita_web_segura_v4(
  '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
  '00000000-0000-4000-8000-000000000f01',
  'Paciente Uno', '+51911111111', '2026-12-04T15:00:00Z',
  'hash','hash','hash',null,null,'00000000-0000-4000-8000-000000000b02');
 exception when unique_violation then expected := true;
 end;
 if not expected then raise exception 'TWO_EMAILS_ONE_PATIENT_WAS_ALLOWED'; end if;
 if (select count(*) from public.citas) <> 2 then raise exception 'SECOND_EMAIL_TRANSACTION_NOT_ROLLED_BACK'; end if;
end $$;

insert into test_ids(alias,cita_id)
select 'B1',v.cita_id from public.crear_cita_web_segura_v4(
 '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
 '00000000-0000-4000-8000-000000000f01',
 'Paciente Dos', '+51933333333', '2026-12-04T15:00:00Z',
 'hash','hash','hash',null,null,
 '00000000-0000-4000-8000-000000000b02') v;

do $$
begin
 if (select count(*) from private.dr_olano_app_patient_identities) <> 2 then
  raise exception 'TWO_DISTINCT_PATIENTS_NOT_STORED'; end if;
 if (select count(*) from public.citas) <> 3 then
  raise exception 'UNEXPECTED_BOOKING_COUNT'; end if;
end $$;

-- El trigger de producción de Google Calendar se activa en la misma transacción
-- que crear_cita_web_segura_v4, sin tener que crear un segundo calendario.
do $
begin
 if (select count(*) from private.cita_integracion_outbox
     where tipo='google_calendar' and accion='upsert' and estado='pendiente') <> 3 then
   raise exception 'GOOGLE_CALENDAR_CREATE_NOT_QUEUED';
 end if;
 if (select count(*) from private.cita_integracion_outbox
     where tipo='aviso_negocio' and accion='upsert') <> 3 then
   raise exception 'EXISTING_CLINIC_NOTIFICATION_NOT_QUEUED';
 end if;
 if (select count(*) from private.cita_integracion_outbox) <> 6 then
   raise exception 'GOOGLE_OUTBOX_DUPLICATION';
 end if;
end $;

-- Simular reprogramación desde recepción: incrementar versión de la cola.
update public.citas set inicio=inicio+interval '1 hour', fin=fin+interval '1 hour'
where id=(select cita_id from test_ids where alias='A1');

do $$
declare
 v_id uuid := (select cita_id from test_ids where alias='A1');
begin
 if (select revision from private.dr_olano_app_bridge_queue where cita_id=v_id) <> 2 then
  raise exception 'RESCHEDULE_REVISION_NOT_INCREMENTED';
 end if;
 if (select count(*) from private.dr_olano_app_bridge_queue) <> 3 then
  raise exception 'RESCHEDULE_CREATED_DUPLICATE_QUEUE_JOB';
 end if;
end $$;

do $
declare v_id uuid := (select cita_id from test_ids where alias='A1');
begin
 if (select accion from private.cita_integracion_outbox
      where cita_id=v_id and tipo='google_calendar') <> 'upsert' then
   raise exception 'GOOGLE_CALENDAR_RESCHEDULE_NOT_QUEUED';
 end if;
 if (select count(*) from private.cita_integracion_outbox) <> 6 then
   raise exception 'GOOGLE_RESCHEDULE_CREATED_DUPLICATE';
 end if;
end $;

create temp table claimed as
select * from public.dr_olano_app_bridge_claim(20);
do $$
begin
 if (select count(*) from claimed) <> 3 then raise exception 'CLAIM_COUNT_INVALID'; end if;
 if (select revision from claimed where cita_id=(select cita_id from test_ids where alias='A1')) <> 2 then
  raise exception 'CLAIM_STALE_REVISION'; end if;
end $$;

do $$
declare v_id uuid := (select cita_id from test_ids where alias='A1');
begin
 if public.dr_olano_app_bridge_finish(v_id,1,true,null) then
  raise exception 'STALE_FINISH_SHOULD_FAIL'; end if;
 if not public.dr_olano_app_bridge_finish(v_id,2,true,null) then
  raise exception 'CURRENT_REVISION_FINISH_FAILED'; end if;
 if (select status from private.dr_olano_app_bridge_queue where cita_id=v_id) <> 'done' then
  raise exception 'FINISH_DID_NOT_MARK_DONE'; end if;
end $$;

-- Una cancelación posterior vuelve a dejar la cola pendiente con revisión 3.
update public.citas set estado='cancelada'
where id=(select cita_id from test_ids where alias='A1');
do $$
declare v_id uuid := (select cita_id from test_ids where alias='A1');
begin
 if (select revision from private.dr_olano_app_bridge_queue where cita_id=v_id) <> 3
    or (select status from private.dr_olano_app_bridge_queue where cita_id=v_id) <> 'pending' then
    raise exception 'CANCEL_NOT_QUEUED';
 end if;
end $$;
do $
declare v_id uuid := (select cita_id from test_ids where alias='A1');
begin
 if (select accion from private.cita_integracion_outbox
      where cita_id=v_id and tipo='google_calendar') <> 'cancel' then
   raise exception 'GOOGLE_CALENDAR_CANCEL_NOT_QUEUED';
 end if;
 if (select count(*) from private.cita_integracion_outbox) <> 6 then
   raise exception 'GOOGLE_CANCEL_CREATED_DUPLICATE';
 end if;
end $;
select 'PASS: CRM bridge, identity and Google Calendar outbox tests' as test_result;
