// Dr. Olano · redes sociales oficiales en el pie de página
(() => {
  const SOCIALS = [
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/D0ctor.Olano',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 8H17V4h-2.8C10.8 4 9 6 9 9.2V12H6v4h3v6h4v-6h3.2l.8-4H13V9.5c0-1 .4-1.5 1.2-1.5Z" fill="currentColor"/></svg>'
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/dr.olano/',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.8" r="1.2" fill="currentColor"/></svg>'
    },
    {
      name: 'TikTok',
      href: 'https://www.tiktok.com/@dr.olano',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h3c.3 2.2 1.7 3.8 4 4.1v3c-1.5 0-2.8-.4-4-1.2v6.4a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.2.1v3.1a2.7 2.7 0 1 0 1.5 2.5V3Z" fill="currentColor"/></svg>'
    }
  ];

  function ensureStyles(){
    if(document.getElementById('olano-social-footer-styles')) return;
    const style = document.createElement('style');
    style.id = 'olano-social-footer-styles';
    style.textContent = `
      .olano-socials{display:block;margin-top:1px}
      .olano-socials-grid{display:flex;align-items:center;gap:8px;width:max-content}
      .olano-social-link{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.19);border-radius:50%;background:rgba(255,255,255,.075);color:#fff!important;text-decoration:none!important;transition:background .18s ease,border-color .18s ease,transform .18s ease}
      .olano-social-link:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.34);transform:translateY(-1px)}
      .olano-social-link:focus-visible{outline:3px solid #7fd1ca;outline-offset:2px}
      .olano-social-link svg{width:19px;height:19px;display:block}
      .olano-social-standalone{margin-top:24px;background:#071f36;color:#fff;padding:18px 16px 24px}
      .olano-social-standalone .olano-social-wrap{width:min(100%,760px);margin:auto}
    `;
    document.head.appendChild(style);
  }

  function socialMarkup(){
    return `<div class="olano-socials"><div class="olano-socials-grid" aria-label="Redes sociales oficiales de Dr. Olano">${SOCIALS.map(s => `<a class="olano-social-link" href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="Dr. Olano en ${s.name}" title="${s.name}">${s.icon}</a>`).join('')}</div></div>`;
  }

  function mount(){
    ensureStyles();
    if(document.querySelector('.olano-socials')) return;

    const mainFooterWrap = document.querySelector('.site-footer .wrap');
    if(mainFooterWrap){
      const host = document.createElement('div');
      host.innerHTML = socialMarkup();
      const block = host.firstElementChild;
      const actions = mainFooterWrap.querySelector('.footer-actions');
      if(actions) mainFooterWrap.insertBefore(block, actions);
      else mainFooterWrap.appendChild(block);
      return;
    }

    const seoFooterWrap = document.querySelector('footer.footer .wrap');
    if(seoFooterWrap){
      const host = document.createElement('div');
      host.innerHTML = socialMarkup();
      const block = host.firstElementChild;
      block.style.marginTop = '12px';
      seoFooterWrap.appendChild(block);
      return;
    }

    if(location.pathname === '/privacidad' || location.pathname === '/privacidad/'){
      const footer = document.createElement('footer');
      footer.className = 'olano-social-standalone';
      footer.innerHTML = `<div class="olano-social-wrap">${socialMarkup()}</div>`;
      document.body.appendChild(footer);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
