-- Shared bridge credential stored in Supabase Vault, never embedded in Git.
-- Callable only by service_role inside Edge Functions (not anon/authenticated).
create function public.dr_olano_app_bridge_secret() returns text
language sql stable security definer set search_path = ''
as $$
 select s.decrypted_secret
 from vault.decrypted_secrets s
 where s.name = 'dr_olano_app_bridge_v1'
 limit 1;
$$;
revoke all on function public.dr_olano_app_bridge_secret()
  from PUBLIC, anon, authenticated;
grant execute on function public.dr_olano_app_bridge_secret()
  to service_role;
comment on function public.dr_olano_app_bridge_secret() is
  'Service-only getter for Vault credential of Dr Olano CRM and App bridge. Never call from browser.';
