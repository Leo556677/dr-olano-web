-- Ejecutar SOLO después de verificar email OTP SMTP y proveedor de envío.
-- NO está programado. La función responde 503 si RESEND_API_KEY/FROM no están configurados.
-- El secreto existente de cron se conserva en Supabase Vault.
select cron.schedule(
  'dr_olano_booking_email_worker',
  '* * * * *',
  $olano_email_job$
  select net.http_post(
    url := 'https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-booking-email-worker',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',
      'x-dr-olano-cron',(
        select decrypted_secret from vault.decrypted_secrets
        where name='dr_olano_integrations_cron_v1'
      )
    ),
    body := '{"limit":10}'::jsonb,
    timeout_milliseconds := 12000
  );
  $olano_email_job$
);
-- Para desactivar sin eliminar citas: select cron.unschedule('dr_olano_booking_email_worker');
