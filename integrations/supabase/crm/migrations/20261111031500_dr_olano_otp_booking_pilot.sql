alter table private.dr_olano_booking_rollout add column pilot_patient_user_id uuid;
create function public.dr_olano_otp_booking_allowed(p_patient_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.dr_olano_booking_rollout
 where id and p_patient_user_id is not null
 and (otp_enabled or pilot_patient_user_id=p_patient_user_id)); $$;
revoke all on function public.dr_olano_otp_booking_allowed(uuid) from public,anon,authenticated;
grant execute on function public.dr_olano_otp_booking_allowed(uuid) to service_role;
