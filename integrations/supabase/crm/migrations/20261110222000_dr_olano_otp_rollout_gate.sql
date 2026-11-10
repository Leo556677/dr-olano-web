-- OTP gate, controlled atomically at server for both legacy and new booking.
-- Default false: existing reservations and WhatsApp continue until SMTP/worker E2E passes.
create table private.dr_olano_booking_rollout (
  id boolean primary key default true check(id),
  otp_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into private.dr_olano_booking_rollout(id,otp_enabled) values(true,false);
alter table private.dr_olano_booking_rollout enable row level security;
revoke all on private.dr_olano_booking_rollout from PUBLIC,anon,authenticated;
grant select on private.dr_olano_booking_rollout to service_role;

create function public.dr_olano_otp_booking_enabled() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select otp_enabled from private.dr_olano_booking_rollout where id=true),false); $$;
revoke all on function public.dr_olano_otp_booking_enabled()
  from PUBLIC,anon,authenticated;
grant execute on function public.dr_olano_otp_booking_enabled()
  to service_role;

-- Never activate until provider, OTP template, worker cron and cross-project E2E are verified:
-- update private.dr_olano_booking_rollout
-- set otp_enabled=true,updated_at=now()
-- where id=true;
