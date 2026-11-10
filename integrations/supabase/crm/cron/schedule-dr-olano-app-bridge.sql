-- SOLO PLAN DE DESPLIEGUE. NO EJECUTADO CONTRA PRODUCCIÓN.
-- Requiere que la migración CRM, ambos workers y ambos secretos
-- DR_OLANO_APP_BRIDGE_SECRET ya estén configurados y probados.
-- Reutiliza Vault ya usado por dr_olano_google_calendar_worker.
-- No copiar secretos, SERVICE_ROLE_KEY ni valores de Vault al repositorio.

select cron.schedule(
  'dr_olano_app_bridge_worker',
  '* * * * *',
  $olano_bridge_job$
  select net.http_post(
    url := 'https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/dr-olano-app-bridge-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',
      'x-dr-olano-cron', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'dr_olano_integrations_cron_v1'
      )
    ),
    body := '{"limit":20}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $olano_bridge_job$
);

-- Verificación de presencia, sin mostrar secretos ni datos clínicos:
-- select jobname,schedule,active from cron.job where jobname='dr_olano_app_bridge_worker';
-- En caso de rollback coordinado:
-- select cron.unschedule('dr_olano_app_bridge_worker');
