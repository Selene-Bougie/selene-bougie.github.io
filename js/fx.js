/* SELENE — effets visuels & animations */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };

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
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .tarot__card, label, select, summary, input, .moon'));
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
      const card = e.target.closest('.tarot__card');
      document.querySelectorAll('.tarot__card.is-tilt').forEach(el => { if (el !== card) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('is-tilt'); } });
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

  window.FX = { scan, split, burst, flyToCart, smoke, fireflies, lanterns, eclipse, toast, mouse, reduce, fine, setScroll: y => { scrollY = y; } };
})();
