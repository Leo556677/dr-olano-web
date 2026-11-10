// Worker servidor-servidor protegido por cron Vault; secreto de puente sólo en Vault.
// Programar cada minuto tras configurar secretos en ambos proyectos y probar seguridad.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const APP_EDGE_URL = 'https://pxccwrhtmwkwrzofuphj.supabase.co/functions/v1/dr-olano-web-bridge';
const APP_PUBLISHABLE_KEY = 'sb_publishable_kKxqpfyz6MwFPyIrDo7X6w_yWy-OkNb';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

type Job = {
  cita_id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  state: string;
  service_name: string;
  revision: number;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = req.headers.get('x-dr-olano-cron') ?? '';
  if (!url || !key || !cronSecret) return json({ error: 'NOT_CONFIGURED' }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: authError } = await admin.rpc('validar_dr_olano_integrations_cron', {
    p_secret: cronSecret,
  });
  if (authError || allowed !== true) return json({ error: 'UNAUTHORIZED' }, 401);
  // The credential is never sent to the browser or included in source code.
  const { data: bridgeSecret, error: secretError } = await admin.rpc('dr_olano_app_bridge_secret');
  if (secretError || typeof bridgeSecret !== 'string' || bridgeSecret.length < 64) {
    return json({ error: 'BRIDGE_SECRET_UNAVAILABLE' }, 503);
  }
  const { data: jobs, error: claimError } = await admin.rpc('dr_olano_app_bridge_claim', { p_limit: 20 });
  if (claimError) return json({ error: 'QUEUE_CLAIM_FAILED' }, 500);
  let processed = 0;
  let failed = 0;

  for (const job of (jobs ?? []) as Job[]) {
    let ok = false;
    let errorCode: string | null = null;
    try {
      const remote = await fetch(APP_EDGE_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: APP_PUBLISHABLE_KEY,
          'x-dr-olano-app-bridge': bridgeSecret,
        },
        body: JSON.stringify({
          booking_id: job.cita_id,
          patient_user_id: job.patient_user_id,
          starts_at: job.starts_at,
          ends_at: job.ends_at,
          state: job.state,
          service_name: job.service_name,
          revision: Number(job.revision),
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!remote.ok) throw Error('APP_HTTP_' + remote.status);
      const response: any = await remote.json();
      if (response?.ok !== true) throw Error('APP_ACK_INVALID');
      ok = true;
    } catch (err) {
      failed++;
      // Nunca registrar email, celular, nombre de servicio o detalles médicos.
      const code = String((err as Error)?.message ?? 'BRIDGE_FAILED');
      errorCode = /^APP_HTTP_\d{3}$/.test(code) ? code : 'APP_REQUEST_FAILED';
    }

    const { error: finishError } = await admin.rpc('dr_olano_app_bridge_finish', {
      p_cita_id: job.cita_id,
      p_revision: job.revision,
      p_ok: ok,
      p_error_code: errorCode,
    });
    if (finishError) {
      // Se recupera por reintento al vencer el lease; la ingesta es idempotente.
      failed++;
    }
    processed++;
  }
  return json({ ok: failed === 0, processed, failed }, failed ? 207 : 200);
});
