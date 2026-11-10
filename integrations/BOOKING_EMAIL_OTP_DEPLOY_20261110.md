# Integración de reservas web ↔ Google Calendar ↔ App Pacientes Dr. Olano

**Estado: borrador técnico, SIN DESPLEGAR.** Fecha: 10/11/2026. Código aislado de main, no altera la WABA, los pacientes ni las reservas actuales.

## Situación real verificada
- Web de reserva: `doctorolano.pe/reserva-s`; proyecto CRM Supabase `xnlzsgulskqyecfgzhwa`.
- App Android: repo `Leo556677/dr-olano-app-pacientes`; proyecto Supabase `pxccwrhtmwkwrzofuphj`.
- La web actualmente registra nombre y teléfono, sin DNI/correo; la app ya posee login OTP por email (8 dígitos) y RLS.
- El CRM tiene worker `dr-olano-google-calendar-worker`, configuración activa para la agenda de la clínica y cron cada minuto; **NO** crear una segunda integración Google.
- Comprobación 10/11/2026: `public.citas` en CRM tenía 0 filas y la cola Google 0 trabajos. No hay prueba E2E reciente de reservas reales.

## Flujo seguro propuesto
1. Paciente elige servicio, fecha y hora; registra nombre y celular.
2. Completa el **correo** y verifica el **OTP** enviado por Supabase Auth del proyecto de la **app**, no del CRM.
3. La web pasa el `access_token` de App Auth a `dr-olano-booking`. No manda un `patient_user_id` controlable por el cliente.
4. El servidor confirma ese token mediante `APP_SUPABASE/auth/v1/user`, valida el correo verificado y obtiene `user.id`.
5. `crear_cita_web_segura_v4` ejecuta la lógica actual v3 (cupos, antispam y Turnstile), registra la cita, su dueño verificado y el trabajo de sincronización en **una sola transacción**.
6. Se mantiene el trigger/worker **existente** para Google Calendar. El nuevo worker drena una cola privada y envía solo ID de cita, usuario Auth, fechas, estado y nombre de servicio a la Edge Function privada de la app.
7. La app lee `web_appointments` con RLS `patient_user_id = auth.uid()`, junto con las citas nativas. Ningún paciente consulta citas por DNI/celular ni recibe un service role.
8. Reprogramaciones, cancelaciones y cambios de estado incrementan `revision` y se envían con reintentos. Las revisiones antiguas no pisan las recientes.

## Archivos
- `assets/booking-email-otp-v1.js`: pantalla de OTP accesible; token solo en memoria.
- `reserva-s.html` y `_includes/v28/patch06-booking-real.html`: OTP requerido antes de confirmar.
- `integrations/supabase/crm/migrations/20261110170000_email_otp_booking_bridge.sql`: vínculo, outbox y procedimientos servicio-only.
- `integrations/supabase/crm/functions/dr-olano-booking/index.ts`: copia modificada **de la función activa v16**. No desplegar sin migración.
- `integrations/supabase/crm/functions/dr-olano-app-bridge-worker/index.ts`: worker separado, con reintento.
- Repo app (misma rama): migración `web_appointments`, Edge `dr-olano-web-bridge` y consulta conjunta en cliente.

## Requisitos antes de habilitar en producción
1. Hacer pruebas en entornos sin datos de pacientes. Verificar que **Auth → Email** de la app permite nuevos usuarios, envía **código de 8 dígitos** y tiene SMTP propio, plantillas `{{ .Token }}`, límites de envío y protección antiabuso/CAPTCHA. La app actual usa `shouldCreateUser:false`: para nuevos pacientes el alta es mediante la web. No desactivar RLS.
2. Establecer en **ambos** proyectos Supabase el mismo secreto aleatorio robusto `DR_OLANO_APP_BRIDGE_SECRET` (mínimo 32 caracteres). Nunca incluirlo en JavaScript, en Git ni en imágenes.
3. Aplicar **primero** la migración de la app y desplegar `dr-olano-web-bridge` con `verify_jwt=false` (solo recibe mensajes con secreto servidor-servidor).
4. Aplicar migración del CRM, desplegar **después** el código nuevo `dr-olano-booking`. Su token viene del Auth de la app y lo revalida en el servidor.
5. Desplegar el worker `dr-olano-app-bridge-worker` en el CRM y programar cron cada minuto usando el mismo control `x-dr-olano-cron` que ya valida el worker Google. No exponer el cron secret ni el service role a cliente.
6. Publicar web OTP y verificar que **todas** las rutas de reserva real apunten a `/reserva-s`: el backend nuevo rechaza reservas sin OTP (`EMAIL_OTP_REQUIRED`). Revisar `reserva.html`, entradas directas y páginas antiguas para evitar que los pacientes queden bloqueados.
7. Publicar la app solo después de que exista la tabla `web_appointments` con políticas correctas. No fusionar la PR 0.2.1 de asistencia por accidente.
8. Confirmar el calendario real de la clínica; `last_success_at` de octubre **no demuestra** entrega en noviembre. Probar creación, edición y cancelación end-to-end.
9. Aclarar titularidad del correo: **un correo por paciente** en la primera versión. Una familia que comparte correo necesita cuentas de tutores/dependientes y permisos adicionales, no un simple `email = email`.

## Pruebas de aceptación necesarias (aún NO ejecutadas)
- [ ] Usuario A reserva y entra a app con el mismo correo; ve solo A.
- [ ] Usuario B verifica otro correo y nunca ve A, incluso si sabe su DNI/celular/código de cita.
- [ ] Correo inventado, OTP inválido o vencido, token de otro proyecto y JWT expirado: no crean reserva.
- [ ] App instalada por primera vez con usuario Auth generado desde web: acceso correcto con su OTP.
- [ ] Solo un evento por reserva en Google Calendar; modificar/cancelar se refleja en calendario y app.
- [ ] Reintento duplicado o respuesta fuera de orden no duplica ni resucita citas canceladas.
- [ ] Prueba de permisos: `anon` no consulta nada de `web_appointments`; `authenticated` ve solo el usuario propio; no puede insertar ni actualizar.
- [ ] Recordatorios 24 h y 1 h funcionan en Android con permisos, app sincronizada y alarmas nativas habilitadas. **No garantizar recepción si la app nunca sincronizó**.
- [ ] Captcha/SMTP, políticas de uso de correo, límites de OTP y privacidad de Google Calendar validados.
- [ ] Verificación en Xiaomi y revisión del código y seguridad antes de release.

## Consideraciones de privacidad
Los datos de salud son privados. El worker del calendario **existente** incluye nombre, teléfono, servicio y comentario en el evento, aunque marca `visibility=private`; valorar minimizar descripción y controlar permisos de quienes tienen acceso al calendario. No enviar DNI, teléfono, correo, notas clínicas ni tokens al móvil a través del puente. No enviar PII a píxeles publicitarios.

## Recuperación si algo falla
Desactivar el cron del nuevo worker; revertir función `dr-olano-booking` y página a versiones previas compatibles; no borrar colas ni vínculos y **no eliminar** `web_appointments` mientras una app ya publicada la consulte. Inspeccionar solo contadores y códigos de errores, no datos de pacientes.

## Próxima fase
Aún falta prueba integral en staging y despliegue coordinado. La WABA no participa en este flujo. La marcación QR para citas originadas en web sigue pendiente: por ahora la app no las contabiliza como asistencias nativas, evitando regalar descuentos por una reserva.
