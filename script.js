// Ano automático
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Ajusta --vh100 (altura real de viewport) e --header-h (altura do header)
(function(){
  const root = document.documentElement;
  const header = document.querySelector('header');

  function setHeaderH(){
    const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
    root.style.setProperty('--header-h', h + 'px');
  }
  function setVH(){
    // Usa visualViewport quando existir (iOS Safari atualiza com a barra subindo/descendo)
    const h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
    root.style.setProperty('--vh100', h + 'px');
  }

  function updateAll(){ setHeaderH(); setVH(); }

  // Eventos que realmente disparam no iOS
  window.addEventListener('load', updateAll, { passive:true });
  window.addEventListener('resize', updateAll, { passive:true });
  window.addEventListener('orientationchange', updateAll, { passive:true });
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', setVH, { passive:true });
    window.visualViewport.addEventListener('scroll', setVH, { passive:true });
  }
  // Ajuste extra após o load (quando a barra do Safari recolhe)
  setTimeout(updateAll, 400);
})();

// Animações leves (mantidas)
(function(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Barra de progresso
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  let rafScroll;
  function updateBar(){
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) : 0;
    bar.style.transform = `scaleX(${p})`;
  }
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(rafScroll);
    rafScroll = requestAnimationFrame(updateBar);
  }, { passive: true });
  updateBar();
})();

// Carrossel dos planos (FLIP + autoplay)
(function(){
  const wrap = document.querySelector('.plans-wrap');
  const rail = document.querySelector('.plans-rail');
  if (!wrap || !rail) return;
  const cards = Array.from(rail.querySelectorAll('.card'));
  if (cards.length < 3) return;

  const btnPrev = wrap.querySelector('.plans-nav.prev');
  const btnNext = wrap.querySelector('.plans-nav.next');
  const dots = Array.from(wrap.querySelectorAll('.plans-dots .dot'));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let active = 1, prevActive = 1, autoTimer = null;
  const interval = parseInt(wrap.getAttribute('data-autoplay') || '6000', 10);

  function flipAnimate(elements, mutate){
    if (prefersReduced) { mutate(); return; }
    const first = elements.map(el => el.getBoundingClientRect());
    mutate();
    elements.forEach((el, i) => {
      const last = el.getBoundingClientRect();
      const dx = first[i].left - last.left;
      const dy = first[i].top - last.top;
      const sx = first[i].width / last.width;
      const sy = first[i].height / last.height;
      const dist = Math.hypot(dx, dy);
      const dur = Math.max(350, Math.min(900, dist));
      el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },{ transform:'none'}],{ duration:dur, easing:'cubic-bezier(.22,1,.36,1)', fill:'both' });
    });
  }

  function apply(){
    const n = cards.length;
    flipAnimate(cards, () => {
      cards.forEach((card, i) => {
        const pos = (i - active + n) % n; // 0=left, 1=center, 2=right
        card.style.order = String(pos);
        card.classList.toggle('is-center', pos === 1);
        card.classList.toggle('is-left',   pos === 0);
        card.classList.toggle('is-right',  pos === 2);
        card.setAttribute('aria-hidden', pos !== 1 ? 'true' : 'false');
        card.tabIndex = pos === 1 ? 0 : -1;
      });
    });

    dots.forEach((d, i) => {
      const selected = i === active;
      d.classList.toggle('is-active', selected);
      d.setAttribute('aria-selected', String(selected));
      d.tabIndex = selected ? 0 : -1;
    });

    if (active !== prevActive){
      const centerEl = rail.querySelector('.card.is-center');
      if (centerEl){
        centerEl.classList.remove('center-enter');
        void centerEl.offsetWidth;
        centerEl.classList.add('center-enter');
      }
      prevActive = active;
    }

    restartAuto();
  }

  function rotate(dir = 1){
    const n = cards.length;
    active = (active + dir + n) % n;
    apply();
  }

  btnPrev?.addEventListener('click', () => rotate(-1));
  btnNext?.addEventListener('click', () => rotate(1));
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { active = i; apply(); });
    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active = i; apply(); }
    });
  });

  function startAuto(){ if (!prefersReduced && !autoTimer) autoTimer = setInterval(() => rotate(1), interval); }
  function stopAuto(){ if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
  function restartAuto(){ stopAuto(); startAuto(); }

  wrap.addEventListener('mouseenter', stopAuto);
  wrap.addEventListener('mouseleave', startAuto);
  wrap.addEventListener('focusin', stopAuto);
  wrap.addEventListener('focusout', startAuto);

  // Sempre ligado
  setTimeout(startAuto, 600);
  apply();
})();