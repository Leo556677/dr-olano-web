-- RESERVA RÁPIDA DE LA JORNADA · plazo de pago de 2 horas
-- NO SE APLICA SOLA: requiere el «sí» de Leo. La edge function dr-olano-booking (v21) NO cambia.
--
-- Qué hace
--   1) La cita de evaluación creada por la reserva rápida (servicio evaluacion-jornada, origen web, motivo que empieza
--      con «Evaluación previa a la jornada (reserva rápida)») nace en estado «pendiente» (pendiente de pago de S/ 20).
--      El cupo queda bloqueado desde ese momento, porque la disponibilidad cuenta pendientes y confirmadas.
--   2) Cada 2 minutos, las que sigan «pendiente» 2 horas después de creadas pasan a «cancelada» y el cupo se libera.
--   3) Recepción confirma el pago a mano: al llegar la constancia cambia la cita a «confirmada» en la agenda y ya no se libera.
--
-- Qué NO toca
--   * El flujo anterior de dos reservas (/jornada-prueba) y las demás citas web: el disparador solo mira el motivo
--     de la reserva rápida, así que no cambian.
--   * Las citas que ya existen.
--
-- Reversa: 20261111180001_dr_olano_reserva_rapida_pago_rollback.sql.txt

begin;

create or replace function private.dr_olano_reserva_rapida_pendiente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.origen = 'web'
     and new.estado in ('pendiente', 'confirmada')
     and new.motivo_consulta like 'Evaluación previa a la jornada (reserva rápida)%'
     and exists (
       select 1 from public.servicios s
        where s.id = new.servicio_id and s.codigo_externo = 'evaluacion-jornada'
     ) then
    new.estado := 'pendiente';
    new.requiere_adelanto_web := true;
    new.notas := 'Reserva rápida de jornada: pendiente de pago de S/ 20. Si no paga en 2 horas, el horario se libera.';
  end if;
  return new;
end $$;
revoke all on function private.dr_olano_reserva_rapida_pendiente() from public, anon, authenticated;

drop trigger if exists trg_dr_olano_reserva_rapida_pendiente on public.citas;
create trigger trg_dr_olano_reserva_rapida_pendiente
  before insert on public.citas
  for each row execute function private.dr_olano_reserva_rapida_pendiente();

create or replace function private.dr_olano_liberar_reservas_rapidas_sin_pago() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.citas c
     set estado = 'cancelada',
         cancelacion_origen = 'sistema',
         motivo_cancelacion = 'No pagó los S/ 20 en 2 horas',
         notas = 'Reserva rápida de jornada: horario liberado por falta de pago.'
   where c.estado = 'pendiente'
     and c.requiere_adelanto_web
     and c.origen = 'web'
     and c.motivo_consulta like 'Evaluación previa a la jornada (reserva rápida)%'
     and c.created_at < now() - interval '2 hours'
     and exists (select 1 from public.negocios n where n.id = c.negocio_id and n.slug = 'dr-olano');
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function private.dr_olano_liberar_reservas_rapidas_sin_pago() from public, anon, authenticated;

select cron.schedule(
  'dr_olano_liberar_reservas_sin_pago',
  '*/2 * * * *',
  $olano_liberar$select private.dr_olano_liberar_reservas_rapidas_sin_pago();$olano_liberar$
);

commit;

-- Verificación sugerida después de aplicar (con el teléfono de prueba):
--   1) Reservar desde /jornada → la cita debe quedar estado='pendiente', requiere_adelanto_web=true.
--   2) Para no esperar 2 h: update public.citas set created_at = now() - interval '3 hours' where id = '<id de la prueba>';
--      y esperar 2 minutos → debe quedar estado='cancelada', cancelacion_origen='sistema'.
