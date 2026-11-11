/* Confirmación de correo antes de reservar. No contiene claves ni envía mensajes. */
(() => {
  'use strict';

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let active = null;
  const byId = id => document.getElementById(id);
  const normalize = s => String(s || '').trim().toLowerCase();

  const css = [
    '.olano-email-confirm[hidden]{display:none!important}',
    '.olano-email-confirm{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(0,26,43,.69);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);overflow:auto;overscroll-behavior:contain}',
    '.olano-email-confirm-card{box-sizing:border-box;width:min(100%,460px);max-height:calc(100% - 12px);overflow-y:auto;overscroll-behavior:contain;border:1px solid #d9e9e9;border-radius:22px;background:#fff;padding:22px 20px 20px;color:#102f46;box-shadow:0 24px 75px rgba(0,22,38,.38);font-family:inherit}',
    '.olano-email-confirm-icon{width:46px;height:46px;display:flex;align-items:center;justify-content:center;border-radius:15px;background:#e2f6f1;color:#087d73;font-size:25px;margin-bottom:12px}',
    '.olano-email-confirm h2{font-size:clamp(20px,5vw,27px);line-height:1.15;margin:0 0 8px;font-weight:800;color:#0b2c47}',
    '.olano-email-confirm p{font-size:14px;line-height:1.55;margin:0 0 14px;color:#3d5c65}',
    '.olano-email-confirm-label{display:block;font-weight:700;font-size:13px;margin:0 0 7px;color:#174451}',
    '.olano-email-confirm input{box-sizing:border-box;display:block;width:100%;min-height:52px;padding:12px 14px;border:2px solid #2caaa0;border-radius:13px;outline:none;font-family:inherit;font-size:16px;background:#f4faf9;color:#102f46;box-shadow:0 0 0 3px rgba(22,157,146,.08)}',
    '.olano-email-confirm input:focus{border-color:#117b77;box-shadow:0 0 0 4px rgba(22,157,146,.16)}',
    '.olano-email-confirm-help{display:block;font-size:12px;line-height:1.45;color:#54717a;margin:8px 0 15px}',
    '.olano-email-confirm-benefit{border-radius:12px;background:#f0f7f5;border:1px solid #d2e7e1;padding:11px 12px;font-size:13px;line-height:1.5;color:#195952;margin-bottom:14px}',
    '.olano-email-confirm-actions{display:flex;flex-direction:column;gap:8px}',
    '.olano-email-confirm-btn{appearance:none;border:0;border-radius:12px;padding:13px 15px;min-height:48px;font:inherit;font-size:15px;font-weight:800;cursor:pointer;background:#097f7b;color:white}',
    '.olano-email-confirm-btn:disabled{background:#9dbdbb;cursor:default}',
    '.olano-email-confirm-cancel{appearance:none;border:1px solid #cbdada;border-radius:12px;padding:12px;min-height:44px;font:inherit;font-size:14px;font-weight:700;background:white;color:#204557;cursor:pointer}',
    '.olano-email-confirm-error{display:none;margin:8px 0;color:#a2273f;font-size:12px;line-height:1.5}',
    '.olano-email-confirm-error.show{display:block}',
    '@media(max-height:590px){.olano-email-confirm{align-items:flex-start;padding:8px}.olano-email-confirm-card{padding:15px;max-height:calc(100% - 4px)}.olano-email-confirm-icon{display:none}}',
    '@media(prefers-reduced-motion:no-preference){.olano-email-confirm-card{animation:olanoEmailEnter .2s ease-out}@keyframes olanoEmailEnter{from{opacity:.6;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}}'
  ].join('\n');

  function create() {
    if (byId('olanoEmailConfirmOverlay')) return;
    const style = document.createElement('style');
    style.id = 'olanoEmailConfirmStyle';
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'olanoEmailConfirmOverlay';
    root.className = 'olano-email-confirm';
    root.hidden = true;
    root.innerHTML = [
      '<section class="olano-email-confirm-card" role="dialog" aria-modal="true" aria-labelledby="olanoEmailConfirmTitle" aria-describedby="olanoEmailConfirmDesc" tabindex="-1">',
      '<div class="olano-email-confirm-icon" aria-hidden="true">✉</div>',
      '<h2 id="olanoEmailConfirmTitle">¿Este es tu correo correcto?</h2>',
      '<p id="olanoEmailConfirmDesc">Aquí recibirás la confirmación de tu cita después de que el consultorio verifique tu adelanto.</p>',
      '<label class="olano-email-confirm-label" for="olanoEmailConfirmInput">Correo electrónico del paciente</label>',
      '<input id="olanoEmailConfirmInput" type="email" autocomplete="email" inputmode="email" enterkeyhint="done" spellcheck="false" maxlength="254" required>',
      '<span class="olano-email-confirm-help">Si cambias el correo, te enviaremos otro código.</span>',
      '<div id="olanoEmailConfirmBenefit" class="olano-email-confirm-benefit" role="status"></div>',
      '<div id="olanoEmailConfirmError" class="olano-email-confirm-error" role="alert"></div>',
      '<div class="olano-email-confirm-actions">',
      '<button id="olanoEmailConfirmContinue" class="olano-email-confirm-btn" type="button">Aceptar y continuar a WhatsApp</button>',
      '<button id="olanoEmailConfirmCancel" class="olano-email-confirm-cancel" type="button">Cancelar</button>',
      '</div></section>'
    ].join('');
    document.body.appendChild(root);
  }

  function syncViewport() {
    const root = byId('olanoEmailConfirmOverlay');
    if (!root || root.hidden) return;
    const view = window.visualViewport;
    if (view) {
      root.style.top = String(Math.max(0, view.offsetTop)) + 'px';
      root.style.height = String(view.height) + 'px';
      root.style.bottom = 'auto';
      root.style.paddingBottom = 'max(12px, env(safe-area-inset-bottom))';
    } else {
      root.style.top = '0';
      root.style.height = '100dvh';
      root.style.bottom = 'auto';
    }
  }

  function clear() {
    if (!active) return;
    const now = active;
    active = null;
    window.visualViewport?.removeEventListener('resize', syncViewport);
    window.visualViewport?.removeEventListener('scroll', syncViewport);
    const root = byId('olanoEmailConfirmOverlay');
    root.hidden = true;
    root.style.top = '';
    root.style.height = '';
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = now.previousOverflow;
    now.previousFocus?.focus?.({ preventScroll:true });
  }

  function resolve(value) {
    if (!active) return;
    const finish = active.done;
    clear();
    finish(value);
  }

  function onKey(event) {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); resolve({ confirmed:false, changed:false }); }
    if (event.key === 'Tab') {
      const order = [byId('olanoEmailConfirmInput'),byId('olanoEmailConfirmContinue'),byId('olanoEmailConfirmCancel')];
      const index = order.indexOf(document.activeElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); order[2].focus(); }
      if (!event.shiftKey && index === 2) { event.preventDefault(); order[0].focus(); }
    }
  }

  function update() {
    if (!active) return;
    const value = normalize(byId('olanoEmailConfirmInput').value);
    const valid = value.length <= 254 && EMAIL.test(value);
    const changed = value !== active.email;
    const button = byId('olanoEmailConfirmContinue');
    const warning = byId('olanoEmailConfirmError');
    button.disabled = !valid;
    button.textContent = changed ? 'Modificar y verificar correo' : 'Aceptar y continuar a WhatsApp';
    warning.classList.toggle('show', !valid);
    warning.textContent = valid ? '' : 'Escribe un correo válido, por ejemplo paciente@correo.com.';
  }

  function offerLabel(discount) {
    const percent = Number(discount?.percent);
    if (discount && Number.isInteger(percent) && percent > 0 && percent <= 100 &&
        discount.kind === 'pending') {
      return 'Promoción solicitada: ' + String(percent) +
        ' % de descuento, sujeto a validación del consultorio. El correo reflejará el porcentaje realmente confirmado.';
    }
    return '';
  }

  function confirmEmail(email, discount) {
    const initial = normalize(email);
    if (!EMAIL.test(initial) || initial.length > 254) return Promise.resolve({confirmed:false,changed:false,error:'INVALID_EMAIL'});
    if (active) return Promise.resolve({confirmed:false,changed:false,error:'MODAL_ALREADY_OPEN'});
    create();
    const root = byId('olanoEmailConfirmOverlay');
    const input = byId('olanoEmailConfirmInput');
    input.value = initial;
    const benefit = byId('olanoEmailConfirmBenefit');
    benefit.textContent = offerLabel(discount);
    benefit.style.display = benefit.textContent ? 'block' : 'none';
    root.hidden = false;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    document.addEventListener('keydown', onKey);
    active = { email:initial,previousFocus,previousOverflow,done:null };
    syncViewport();
    update();
    input.oninput = update;
    const promise = new Promise(done => { active.done = done; });
    byId('olanoEmailConfirmContinue').onclick = () => {
      const value = normalize(input.value);
      if (!EMAIL.test(value) || value.length > 254) {update();return;}
      resolve({confirmed:value === initial,changed:value !== initial,email:value});
    };
    byId('olanoEmailConfirmCancel').onclick=()=>resolve({confirmed:false,changed:false});
    root.onclick=e=>{if(e.target === root)resolve({confirmed:false,changed:false})};
    input.onkeydown=e=>{if(e.key === 'Enter'){e.preventDefault();byId('olanoEmailConfirmContinue').click()}};
    // El navegador decide cuándo abrir el teclado; mantenemos el modal visible
    // con visualViewport mientras el teclado Android/iOS ocupa la zona inferior.
    input.focus({preventScroll:true});
    input.select();
    requestAnimationFrame(() => { if (active) syncViewport(); });
    return promise;
  }

  window.OLANO_EMAIL_CONFIRM = Object.freeze({ confirmEmail });
})();