-- Prueba integración: DNI + correo verificado + correo transaccional.
create temp table new_bookings as
select 'legacy'::text label,v.cita_id id from public.crear_cita_web_segura_v5(
  '00000000-0000-4000-8000-000000000d01',
  '00000000-0000-4000-8000-000000000e01',
  '00000000-0000-4000-8000-000000000f01',
  'Paciente Uno','+51911111111','2026-12-05T15:00:00Z',
  'hash1','hash2','hash3',null,null,'12345678'
) v
union all
select 'otp'::text label,v.cita_id id from public.crear_cita_web_segura_v6(
  '00000000-0000-4000-8000-000000000d01',
  '00000000-0000-4000-8000-000000000e01',
  '00000000-0000-4000-8000-000000000f01',
  'Paciente Dos','+51922222222','2026-12-06T15:00:00Z',
  'hash1','hash2','hash3',null,null,
  '00000000-0000-4000-8000-000000000b02',
  '87654321','PACIENTE@EJEMPLO.PE'
) v;

do $$
begin
 if (select count(*) from new_bookings)<>2 then raise exception 'BOOKINGS_NOT_CREATED'; end if;
 if (select count(*) from private.dr_olano_booking_identity)<>2 then raise exception 'DNI_NOT_SAVED'; end if;
 if (select count(*) from private.dr_olano_booking_email_outbox)<>1 then raise exception 'OTP_ONLY_EMAIL_QUEUE'; end if;
 if (select recipient_email from private.dr_olano_booking_email_outbox) <> 'paciente@ejemplo.pe'
 then raise exception 'EMAIL_NOT_NORMALIZED'; end if;
end $$;

do $$
declare rejected boolean:=false;
begin
 begin
  perform 1 from public.crear_cita_web_segura_v6(
    '00000000-0000-4000-8000-000000000d01',
    '00000000-0000-4000-8000-000000000e01',
    '00000000-0000-4000-8000-000000000f01',
    'Paciente Tres','+51933333333','2026-12-07T15:00:00Z',
    'hash1','hash2','hash3',null,null,
    '00000000-0000-4000-8000-000000000a01',
    '87654321','correo-invalido'
  );
 exception when raise_exception then rejected:=(sqlerrm='VERIFIED_EMAIL_REQUIRED');
 end;
 if not rejected then raise exception 'INVALID_EMAIL_ACCEPTED'; end if;
 if (select count(*) from public.citas)<>2 then raise exception 'TRANSACTION_ROLLBACK_BROKEN'; end if;
end $$;

insert into public.dr_olano_offer_claims(booking_id,discount_pct,status,redeemed_at)
select id,10,'redeemed',now() from new_bookings where label='otp';
update private.dr_olano_booking_email_outbox set next_attempt_at=now();

create temp table claims as select * from public.dr_olano_booking_email_claim(10);
do $$
begin
 if (select count(*) from claims)<>1 then raise exception 'EMAIL_CLAIM_COUNT'; end if;
 if (select discount_pct from claims)<>10 then raise exception 'REDEEMED_DISCOUNT_NOT_LINKED'; end if;
 if (select recipient_email from claims)<>'paciente@ejemplo.pe' then raise exception 'EMAIL_LEAK'; end if;
end $$;

select public.dr_olano_booking_email_finish(cita_id,true,false,null)
from claims;
do $$
begin
 if (select status from private.dr_olano_booking_email_outbox)<>'sent' then raise exception 'EMAIL_NOT_FINALIZED'; end if;
 if (select count(*) from public.dr_olano_booking_email_claim(10))<>0 then raise exception 'DUPLICATE_EMAIL'; end if;
 if has_function_privilege('authenticated','public.dr_olano_booking_email_claim(integer)','EXECUTE') then
 raise exception 'PUBLIC_EMAIL_CLAIM'; end if;
end $$;
select 'PASS: DNI and verified OTP email outbox' as result;

-- Reproducir sólo las columnas del CRM que usa el control de adelanto.
alter table public.citas add column origen text default 'web', add column notas text;
create table public.pagos(cita_id uuid,negocio_id uuid,contacto_id uuid,estado text,monto numeric);
\ir ../integrations/supabase/crm/migrations/20261111041000_dr_olano_solicitud_adelanto.sql
do $test$
declare a uuid;
begin
 select cita_id into strict a from public.crear_solicitud_web_con_adelanto(
 '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
 '00000000-0000-4000-8000-000000000f01','Prueba Adelanto','+12025550189',
 '2026-12-10 10:00-05','qa1','qa2','qa3',null,null,gen_random_uuid(),'00000001','qa@example.invalid');
 if not exists(select from public.citas where id=a and estado='pendiente' and requiere_adelanto_web)
 or exists(select from private.cita_integracion_outbox where cita_id=a)
 or not exists(select from private.dr_olano_booking_email_outbox where cita_id=a and next_attempt_at='infinity')
 or not exists(select from private.dr_olano_app_bridge_queue where cita_id=a and next_attempt_at='infinity')
 then raise exception 'SOLICITUD_NO_AISLADA'; end if;
 begin
   update public.citas set estado='confirmada' where id=a;
   raise exception 'ACEPTO_SIN_ADELANTO';
 exception when raise_exception then if sqlerrm<>'ADELANTO_PENDIENTE' then raise; end if; end;
 insert into public.pagos select id,negocio_id,contacto_id,'pagado',1 from public.citas where id=a;
 update public.citas set estado='confirmada' where id=a;
 if not exists(select from private.dr_olano_booking_email_outbox where cita_id=a and next_attempt_at<='now'::timestamptz)
 or not exists(select from private.dr_olano_app_bridge_queue where cita_id=a and next_attempt_at<>'infinity')
 or not exists(select from private.cita_integracion_outbox where cita_id=a and tipo='google_calendar')
 then raise exception 'CONFIRMACION_NO_SINCRONIZADA'; end if;
end $test$;

\ir ../integrations/supabase/crm/migrations/20261111055000_dr_olano_confirmacion_sin_adelanto.sql
do $test$
declare a uuid;
begin
 select cita_id into strict a from public.crear_solicitud_web_con_adelanto(
 '00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000e01',
 '00000000-0000-4000-8000-000000000f01','Prueba Sin Adelanto','+12025550190',
 '2026-12-11 10:00-05','qb1','qb2','qb3',null,null,gen_random_uuid(),'00000002','qb@example.invalid');
 if not exists(select from public.citas where id=a and estado='confirmada' and not requiere_adelanto_web)
 or exists(select from public.pagos where cita_id=a)
 or not exists(select from private.dr_olano_booking_email_outbox where cita_id=a and next_attempt_at<>'infinity')
 or not exists(select from private.dr_olano_app_bridge_queue where cita_id=a and next_attempt_at<>'infinity')
 or not exists(select from private.cita_integracion_outbox where cita_id=a and tipo='google_calendar')
 then raise exception 'RESERVA_SIN_PAGO_NO_SINCRONIZADA'; end if;
end $test$;
