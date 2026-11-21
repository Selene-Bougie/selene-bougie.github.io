/* SELENE — effets visuels & animations */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };

  /* ---------- Bougie SVG ---------- */
  let uid = 0;
  function candleSVG(p, opts = {}) {
    const id = 'cv' + (++uid);
    const level = opts.level ?? 1;
    const lit = opts.lit !== false;
    const waxTop = 78 + (1 - level) * 70;
    const name = opts.label === false ? '' : (p.name || '');
    return `
<svg class="candle-svg ${lit ? '' : 'is-off'}" viewBox="0 0 120 170" role="img" aria-label="Bougie ${name}">
  <defs>
    <radialGradient id="${id}g"><stop offset="0" stop-color="#ffc56b" stop-opacity=".6"/><stop offset=".35" stop-color="#ff8a3a" stop-opacity=".18"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5e24"/><stop offset=".35" stop-color="#ffb547"/><stop offset="1" stop-color="#fff3cf"/></linearGradient>
    <linearGradient id="${id}w" x1="0" x2="1"><stop offset="0" stop-color="${p.wax}" stop-opacity=".85"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="${p.wax}" stop-opacity=".8"/></linearGradient>
    <linearGradient id="${id}j" x1="0" x2="1"><stop offset="0" stop-color="${p.glass}" stop-opacity=".35"/><stop offset=".5" stop-color="${p.glass}" stop-opacity=".08"/><stop offset="1" stop-color="${p.glass}" stop-opacity=".3"/></linearGradient>
  </defs>
  <g class="flame-wrap" transform="translate(0 ${waxTop - 78})">
    <circle class="flame-glow" cx="60" cy="50" r="60" fill="url(#${id}g)"/>
    <line x1="60" y1="64" x2="60" y2="79" stroke="#2a1d14" stroke-width="1.6" stroke-linecap="round"/>
    <g class="flame">
      <path d="M60 26 C66 39 70 49 70 57 A10 10 0 0 1 50 57 C50 49 54 39 60 26Z" fill="url(#${id}f)"/>
      <path d="M60 42 C63 48 65 53 65 58 A5 5 0 0 1 55 58 C55 53 57 48 60 42Z" fill="#fff8e6" opacity=".95"/>
      <ellipse cx="60" cy="64" rx="3" ry="3.5" fill="#6d8bff" opacity=".55"/>
    </g>
  </g>
  <rect x="14" y="62" width="92" height="104" rx="16" fill="url(#${id}j)" stroke="${p.glass}" stroke-opacity=".55" stroke-width="1.2"/>
  <rect class="wax-body" x="18" y="${waxTop}" width="84" height="${162 - waxTop}" rx="11" fill="url(#${id}w)"/>
  <ellipse class="wax-top" cx="60" cy="${waxTop}" rx="42" ry="6" fill="${p.wax}"/>
  <ellipse class="wax-light flame-glow" cx="60" cy="${waxTop}" rx="30" ry="4.5" fill="#ffb547" opacity=".45"/>
  <ellipse class="wax-pool" cx="60" cy="${waxTop}" rx="12" ry="2.4" fill="#fff" opacity=".55"/>
  ${opts.label === false ? '' : `
  <rect x="29" y="110" width="62" height="36" rx="3" fill="#0b1230" stroke="${p.accent}" stroke-opacity=".6" stroke-width=".8"/>
  <path d="M56.2 116.3 A3.6 3.6 0 1 0 59.4 121.2 A3 3 0 1 1 56.2 116.3Z" fill="#f3ecd6"/>
  <text x="60" y="131" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="6" letter-spacing="2.2" fill="#f3ecd6">SELENE</text>
  <text x="60" y="140.5" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="6.6" fill="${p.accent}">${name}</text>`}
  <rect class="shine" x="21" y="70" width="5" height="88" rx="2.5" fill="#fff"/>
  <ellipse cx="60" cy="62" rx="46" ry="6" fill="none" stroke="${p.glass}" stroke-opacity=".7" stroke-width="1.2"/>
</svg>`;
  }
  function setCandleLevel(svg, level) {
    const waxTop = 78 + (1 - level) * 70;
    svg.querySelector('.flame-wrap').setAttribute('transform', `translate(0 ${waxTop - 78})`);
    const body = svg.querySelector('.wax-body');
    body.setAttribute('y', waxTop); body.setAttribute('height', Math.max(0, 162 - waxTop));
    svg.querySelectorAll('.wax-top, .wax-light, .wax-pool').forEach(e => e.setAttribute('cy', waxTop));
  }

  /* ---------- Ciel étoilé ---------- */
  const sky = document.getElementById('sky');
  const ctx = sky.getContext('2d');
  let stars = [], shooting = [], W = 0, H = 0, dpr = 1, scrollY = 0;
  function resizeSky() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    sky.width = W * dpr; sky.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(420, Math.floor(W * H / 3600));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H * 1.6, r: Math.random() ** 3 * 1.6 + .25,
      z: rand(.1, 1), t: Math.random() * Math.PI * 2, s: rand(.5, 2.2),
      warm: Math.random() < .12
    }));
  }
  function shoot() {
    if (!document.hidden) shooting.push({ x: rand(W * .1, W * .9), y: rand(0, H * .4), vx: rand(-9, -5) * (Math.random() < .5 ? -1 : 1), vy: rand(3, 5), life: 1 });
    setTimeout(shoot, rand(2500, 7000));
  }
  let t0 = performance.now();
  function drawSky(now) {
    const dt = Math.min(50, now - t0) / 1000; t0 = now;
    ctx.clearRect(0, 0, W, H);
    const px = mouse.nx * 18, py = mouse.ny * 12;
    for (const s of stars) {
      s.t += dt * s.s;
      const a = .35 + Math.sin(s.t) * .35 + .3 * s.z;
      let y = (s.y - scrollY * s.z * .15) % (H * 1.6);
      if (y < 0) y += H * 1.6;
      if (y > H + 4) continue;
      const x = s.x + px * s.z, yy = y + py * s.z;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillStyle = s.warm ? '#ffd9a0' : '#e9ecff';
      ctx.beginPath(); ctx.arc(x, yy, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.3) { ctx.globalAlpha *= .25; ctx.beginPath(); ctx.arc(x, yy, s.r * 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    shooting = shooting.filter(s => s.life > 0);
    for (const s of shooting) {
      s.x += s.vx * 60 * dt; s.y += s.vy * 60 * dt; s.life -= dt * .9;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      g.addColorStop(0, `rgba(255,240,210,${s.life})`); g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke();
    }
    requestAnimationFrame(drawSky);
  }
  resizeSky();
  addEventListener('resize', resizeSky);
  if (!reduce) { requestAnimationFrame(drawSky); setTimeout(shoot, 1800); }
  else { drawSky(performance.now()); }

  /* ---------- Curseur flamme ---------- */
  const cursor = document.querySelector('.cursor');
  const dot = cursor.querySelector('.cursor__dot'), halo = cursor.querySelector('.cursor__halo');
  const c = { x: mouse.x, y: mouse.y, hx: mouse.x, hy: mouse.y };
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth - .5; mouse.ny = e.clientY / innerHeight - .5;
  }, { passive: true });
  function loopCursor() {
    c.x += (mouse.x - c.x) * .45; c.y += (mouse.y - c.y) * .45;
    c.hx += (mouse.x - c.hx) * .12; c.hy += (mouse.y - c.hy) * .12;
    dot.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%,-50%)`;
    halo.style.transform = `translate(${c.hx}px, ${c.hy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loopCursor);
  }
  if (fine) {
    loopCursor();
    document.addEventListener('pointerover', e => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .card, label, select, summary, input, .hero__moon'));
    });
  }

  /* ---------- Étincelles au clic ---------- */
  function burst(x, y, n = 10, colors = ['#ffe7a8', '#ffb547', '#f3ecd6']) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.background = colors[i % colors.length];
      const a = (Math.PI * 2 * i) / n + rand(-.3, .3), d = rand(30, 80), size = rand(2, 6);
      s.style.width = s.style.height = size + 'px';
      document.body.appendChild(s);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 20}px)) scale(0)`, opacity: 0 }
      ], { duration: rand(600, 1000), easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => s.remove();
    }
  }
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) burst(e.clientX, e.clientY, 8); });

  /* ---------- Boutons magnétiques & cartes 3D ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', e => {
      const m = e.target.closest('.btn, .cart-btn, [data-magnetic]');
      document.querySelectorAll('.is-magnet').forEach(el => { if (el !== m) { el.style.transform = ''; el.classList.remove('is-magnet'); } });
      if (m) {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        m.classList.add('is-magnet');
        m.style.transform = `translate(${dx * .18}px, ${dy * .3}px)`;
      }
      const card = e.target.closest('.card');
      document.querySelectorAll('.card.is-tilt').forEach(el => { if (el !== card) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('is-tilt'); } });
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilt');
        card.style.setProperty('--rx', ((.5 - py) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - .5) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--px', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--py', (py * 100).toFixed(1) + '%');
      }
    }, { passive: true });
  }

  /* ---------- Texte lettre à lettre ---------- */
  function split(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.normalize('NFC').split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word';
            (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(part)].map(s => s.segment) : [...part]).forEach(ch => {
              const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; s.style.setProperty('--i', i++);
              w.appendChild(s);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.classList.add('split');
  }

  /* ---------- Révélations ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        if (en.target.dataset.count) countUp(en.target);
        if (en.target.dataset.meter) en.target.style.width = en.target.dataset.meter + '%';
        io.unobserve(en.target);
      }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  function scan(root = document) {
    root.querySelectorAll('[data-split]').forEach(split);
    root.querySelectorAll('[data-reveal], [data-split], [data-count], [data-meter]').forEach(el => io.observe(el));
  }
  function countUp(el) {
    const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', dur = 1800, start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Vol vers le panier ---------- */
  function flyToCart(fromEl) {
    const target = document.getElementById('cartBtn');
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const done = () => { target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); burst(x1, y1, 12); };
    if (reduce) { done(); return; }
    const f = document.createElement('span'); f.className = 'flyer';
    document.body.appendChild(f);
    const cx = (x0 + x1) / 2 + rand(-80, 80), cy = Math.min(y0, y1) - 180;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      pts.push({ transform: `translate(${x - 9}px, ${y - 12}px) scale(${1 - t * .5}) rotate(${t * 40}deg)`, opacity: t > .95 ? 0 : 1 });
    }
    f.animate(pts, { duration: 900, easing: 'cubic-bezier(.5,0,.5,1)' }).onfinish = () => { f.remove(); done(); };
    // traînée
    let k = 0;
    const trail = setInterval(() => {
      const r = f.getBoundingClientRect();
      if (!f.isConnected || k++ > 30) return clearInterval(trail);
      const s = document.createElement('span'); s.className = 'spark';
      s.style.left = r.left + 9 + 'px'; s.style.top = r.top + 12 + 'px';
      document.body.appendChild(s);
      s.animate([{ opacity: .9, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: `translate(-50%, ${rand(10, 30)}px) scale(0)` }], { duration: 700 }).onfinish = () => s.remove();
    }, 30);
  }

  /* ---------- Fumée (bougie soufflée) ---------- */
  function smoke(container, x, y) {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span'); s.className = 'smoke';
      s.style.left = x - 7 + 'px'; s.style.top = y - 7 + 'px';
      s.style.setProperty('--dx', rand(-40, 40) + 'px');
      s.style.animationDelay = i * 90 + 'ms';
      container.appendChild(s);
      setTimeout(() => s.remove(), 2600 + i * 90);
    }
  }

  /* ---------- Lucioles ---------- */
  function fireflies(container, n = 30) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const f = document.createElement('span'); f.className = 'firefly';
      f.style.left = rand(0, 100) + '%'; f.style.top = rand(10, 100) + '%';
      container.appendChild(f);
      const kf = [];
      for (let k = 0; k < 5; k++) kf.push({ transform: `translate(${rand(-60, 60)}px, ${rand(-80, 40)}px)`, opacity: Math.random() });
      f.animate(kf, { duration: rand(6000, 12000), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: -rand(0, 6000) });
    }
  }
  function lanterns(container, n = 18) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const l = document.createElement('span'); l.className = 'lantern';
      l.style.left = rand(0, 100) + '%';
      l.style.setProperty('--dx', rand(-60, 60) + 'px');
      l.style.animationDuration = rand(9, 18) + 's';
      l.style.animationDelay = -rand(0, 18) + 's';
      const sc = rand(.6, 1.4); l.style.width = 10 * sc + 'px'; l.style.height = 14 * sc + 'px';
      container.appendChild(l);
    }
  }

  /* ---------- Transition éclipse ---------- */
  const ecl = document.getElementById('eclipse');
  let busy = false;
  function eclipse(x, y, mid) {
    if (reduce || busy) { mid(); return; }
    busy = true;
    ecl.style.setProperty('--ex', x + 'px'); ecl.style.setProperty('--ey', y + 'px');
    ecl.classList.remove('is-out'); void ecl.offsetWidth;
    ecl.classList.add('is-in');
    setTimeout(() => {
      mid();
      requestAnimationFrame(() => {
        ecl.classList.add('is-out'); ecl.classList.remove('is-in');
        setTimeout(() => { ecl.classList.remove('is-out'); busy = false; }, 720);
      });
    }, 560);
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(msg) {
    toastEl.innerHTML = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }

  /* ---------- Motifs marocains ---------- */
  const khatamSVG = (stroke = '#d9b26a') => `
<svg viewBox="0 0 100 100" aria-hidden="true" class="khatam"><g fill="none" stroke="${stroke}" stroke-width=".8">
  <rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/>
  <circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="44" stroke-dasharray="2 4"/>
  <rect x="32" y="32" width="36" height="36" transform="rotate(22.5 50 50)"/><rect x="32" y="32" width="36" height="36" transform="rotate(67.5 50 50)"/></g></svg>`;
  const zelligeBg = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><g fill="none" stroke="#d9b26a" stroke-width=".7"><path d="M30 4 L37 23 L56 30 L37 37 L30 56 L23 37 L4 30 L23 23 Z"/><rect x="18" y="18" width="24" height="24" transform="rotate(45 30 30)"/><circle cx="30" cy="30" r="5"/><path d="M0 0 L8 8 M60 0 L52 8 M0 60 L8 52 M60 60 L52 52"/></g></svg>')}")`;

  window.FX = { candleSVG, setCandleLevel, scan, split, burst, flyToCart, smoke, fireflies, lanterns, eclipse, toast, khatamSVG, zelligeBg, mouse, reduce, fine, setScroll: y => { scrollY = y; } };
})();
