/* ── LOGO PINZA NM — microinteracciones ─────────────────────────
   Portado del artifact "Logo Pinza NM" (17-18 oct).
   Pinza.mount(svg) da vida a cualquier SVG de la pinza (hero y loader):
   1. Encendido de neón (ignite)
   2. Clac clac: resorte con ~2° de overshoot, brillo al tocarse,
      el segundo golpe más corto
   3. Destello del rayo (flash)
   Con prefers-reduced-motion la pinza queda quieta y encendida.
*/
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cada pinza gira rígida 41.07° sobre su pivote (viewBox del SVG): el tramo de abajo
  // queda vertical y los dos se tocan en el centro, cerrando la caja bajo el rayo.
  const PIVOT_L = [494.8, 422.6], PIVOT_R = [562.1, 422.6];
  const CLOSE = 41.07;
  const SPEED = 1.8; // velocidad del clac (base: picos 170/140 ms, apertura 260 ms)

  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

  function tween(ms, fn) {
    return new Promise(res => {
      if (reduce) { fn(1); return res(); }
      const t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        fn(p);
        p < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    });
  }

  // Resorte amortiguado (0 → 1). z = amortiguamiento (0.69 ≈ 5 % de overshoot), tp = ms hasta el pico.
  // onContact salta una vez, cuando las pinzas se tocan (x cruza 1).
  function spring(z, tp, fn, onContact) {
    const wd = Math.PI / tp, a = z * wd / Math.sqrt(1 - z * z);
    const end = Math.log(100) / a;
    let hit = false;
    return tween(end, p => {
      const t = p * end;
      const x = p === 1 ? 1 : 1 - Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t));
      if (!hit && x >= 1) { hit = true; onContact(); }
      fn(x);
    });
  }

  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

  function mount(svg) {
    const $ = s => svg.querySelector(s);
    let busy = false;

    async function run(fn) {
      if (busy || reduce) return;
      busy = true;
      try { await fn(); } finally { busy = false; }
    }

    async function ignite() {
      const order = ['.logo-head', '.logo-bolt', '.logo-claw-l', '.logo-claw-r'].map($);
      order.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      svg.classList.add('lit');
      await Promise.all(order.map(async (p, i) => {
        await wait(i * 170);
        const L = p.getTotalLength();
        await tween(420, t => {
          p.style.strokeDashoffset = L * (1 - easeOut(t));
          p.style.opacity = t < .22 ? (Math.floor(t * 40) % 2 ? .25 : 1) : 1;
        });
      }));
      order.forEach(p => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.opacity = ''; });
    }

    // Brillo del choque: copia del logo con blur fijo; solo se anima la opacidad.
    function hitGlow() {
      const g = $('.logo-hit');
      tween(40, t => g.style.opacity = t)
        .then(() => tween(160, t => g.style.opacity = 1 - easeOut(t)));
    }

    // onFirstHit: se llama una vez, en el primer choque (el loader lo usa para firmar el rombo)
    async function clac(onFirstHit) {
      const L = $('.logo-claw-l'), R = $('.logo-claw-r');
      let k = 0;
      const set = v => {
        k = v;
        const a = CLOSE * v;
        L.setAttribute('transform', `rotate(${-a} ${PIVOT_L[0]} ${PIVOT_L[1]})`);
        R.setAttribute('transform', `rotate(${a} ${PIVOT_R[0]} ${PIVOT_R[1]})`);
      };
      const hits = [{ z: .69, tp: 170 / SPEED }, { z: .8, tp: 140 / SPEED }];
      let first = true;
      const onHit = () => { hitGlow(); if (first && onFirstHit) onFirstHit(); first = false; };
      for (const { z, tp } of hits) {
        await spring(z, tp, set, onHit);
        const from = k;
        await tween(260 / SPEED, t => set(from * (1 - easeInOutCubic(t))));
      }
      set(0);
    }

    async function flash() {
      const f = $('.logo-flash');
      if (!f) return;
      const L = f.getTotalLength(), seg = L * .22;
      f.style.strokeDasharray = `${seg} ${L}`;
      f.setAttribute('opacity', 1);
      await tween(560, t => { f.style.strokeDashoffset = seg - (L + seg) * t; });
      f.setAttribute('opacity', 0);
    }

    function scheduleFlash() {
      setTimeout(() => {
        if (!document.hidden) run(flash);
        scheduleFlash();
      }, 7000 + Math.random() * 8000);
    }

    return {
      ignite: () => reduce ? (svg.classList.add('lit'), Promise.resolve()) : run(ignite),
      clac: (onFirstHit) => run(() => clac(onFirstHit)),
      light: () => svg.classList.add('lit'),
      scheduleFlash: () => { if (!reduce) scheduleFlash(); },
    };
  }

  window.Pinza = { mount };

  // ── Hero: clac al clic y destello esporádico ──
  const heroSvg = document.getElementById('hero-logo');
  if (!heroSvg) return;
  const hero = mount(heroSvg);
  heroSvg.addEventListener('click', () => hero.clac());

  // instant = el loader ya hizo el ritual: la pinza del hero aparece encendida, sin repetir el encendido
  let started = false;
  window.igniteHeroLogo = (instant) => {
    if (started) return;
    started = true;
    if (instant) { hero.light(); hero.scheduleFlash(); return; }
    hero.ignite().then(hero.scheduleFlash);
  };
})();
