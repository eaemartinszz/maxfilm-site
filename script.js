// Ano automático
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Ajusta --vh (altura real da viewport) e --header-h (altura do header)
(function(){
  const root = document.documentElement;
  const header = document.querySelector('header');

  function setVH(){ root.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px'); }
  function setHeaderH(){ root.style.setProperty('--header-h', (header ? header.offsetHeight : 0) + 'px'); }

  ['load','resize','orientationchange'].forEach(evt => window.addEventListener(evt, () => { setVH(); setHeaderH(); }));
  setTimeout(() => { setVH(); setHeaderH(); }, 120); // ajuste extra p/ iOS
})();

// Animações (mesmas do pacote anterior, resumidas)
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

  // Reveal
  function addReveal(selector, cls = 'reveal-up', { stagger = 120, startDelay = 0 } = {}){
    const els = document.querySelectorAll(selector);
    els.forEach((el, i) => {
      el.classList.add(cls);
      el.style.animationDelay = `${startDelay + i * stagger}ms`;
      observe(el);
    });
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  function observe(el){ io ? io.observe(el) : el.classList.add('is-visible'); }

  addReveal('.hero .kicker','reveal-up',{startDelay:40});
  addReveal('.hero h1','reveal-up',{startDelay:120});
  addReveal('.hero .lead','reveal-fade',{startDelay:220});
  addReveal('.hero .hero-cta','reveal-up',{startDelay:260,stagger:120});
  addReveal('.hero .badges .badge','reveal-up',{startDelay:300,stagger:90});
  addReveal('.hero .illus','reveal-zoom',{startDelay:200});
  addReveal('#planos .card','reveal-up',{stagger:140});
  addReveal('#como-funciona .step','reveal-up',{stagger:120});
  addReveal('#vantagens .item','reveal-up',{stagger:120});
  addReveal('#conformidade .features li','reveal-up',{stagger:80});
  addReveal('#faq details','reveal-right',{stagger:100});
  addReveal('#contato .cta .btn','reveal-up',{stagger:110});
  addReveal('footer .brand','reveal-fade',{startDelay:120});
  addReveal('footer .links a','reveal-up',{stagger:60});
  addReveal('footer .legal','reveal-fade',{startDelay:220});

  // Tilt + parallax na vitrine
  const illus = document.querySelector('.illus');
  const media = document.querySelector('.illus-media');
  if (illus){
    let raf;
    illus.addEventListener('mousemove', (e) => {
      const r = illus.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const rx = (-y * 7).toFixed(2);
      const ry = (x * 7).toFixed(2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        illus.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        if (media){ media.style.transform = `translate3d(${ry * 1.5}px, ${rx * 1.5}px, 0) scale(1.03)`; }
      });
    });
    illus.addEventListener('mouseleave', () => {
      illus.style.transform = 'none';
      if (media) media.style.transform = 'none';
    });
    let rafParallax;
    window.addEventListener('scroll', () => {
      if (!media) return;
      cancelAnimationFrame(rafParallax);
      rafParallax = requestAnimationFrame(() => {
        const y = window.scrollY * 0.06;
        media.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    }, { passive: true });
  }

  // Ripple
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const rect = b.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      b.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
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

  let active = 1;
  let prevActive = active;
  let autoTimer = null;
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
        const pos = (i - active + n) % n; // 0=left,1=center,2=right
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

  const alwaysOn = wrap.dataset.autoAlways === 'true';
  function startAuto(){ if (prefersReduced || autoTimer) return; autoTimer = setInterval(() => rotate(1), interval); }
  function stopAuto(){ if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
  function restartAuto(){ stopAuto(); startAuto(); }

  wrap.addEventListener('mouseenter', stopAuto);
  wrap.addEventListener('mouseleave', startAuto);
  wrap.addEventListener('focusin', stopAuto);
  wrap.addEventListener('focusout', startAuto);

  if (alwaysOn){ setTimeout(startAuto, 600); }
  else {
    const section = document.getElementById('planos')?.closest('section') || document.getElementById('planos');
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting ? startAuto() : stopAuto());
    }, { threshold: 0.2 }) : null;
    io?.observe(section || wrap);
  }

  apply();
})();