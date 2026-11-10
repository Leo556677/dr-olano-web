-- Sólo PostgreSQL efímero del workflow: simplificación del catálogo de descuentos.
-- Nunca ejecutar sobre el CRM de producción.
create table public.dr_olano_offer_claims (
  booking_id uuid,
  discount_pct numeric,
  status text,
  redeemed_at timestamptz
);
