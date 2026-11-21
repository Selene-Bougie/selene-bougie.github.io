/* SELENE — effets visuels & animations
   - Brume d'aura en WebGL (shader de bruit fractal déformé), réactive à la souris et au défilement
   - Ciel étoilé en 2D par-dessus
   - Défilement doux (Lenis si disponible), transitions voilées, textes révélés au défilement */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mouse = { x: innerWidth / 2, y: innerHeight * .35, nx: 0, ny: 0 };
  let scrollY = 0;

  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth - .5; mouse.ny = e.clientY / innerHeight - .5;
  }, { passive: true });

  /* =========================================================
     Brume d'aura — WebGL
     ========================================================= */
  const mist = { intro: reduce ? 1 : 0, introStart: performance.now(), pulse: 0, pulseTarget: 0, ok: false };
  (function initMist() {
    const cv = document.getElementById('mist');
    const gl = cv && (cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl'));
    if (!gl) { document.documentElement.classList.add('no-gl'); return; }
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision highp float;
      uniform vec2 uRes; uniform vec2 uMouse; uniform float uTime, uIntro, uPulse, uScroll;
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
      float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
        for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
      void main(){
        vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
        float t=uTime*.032;
        vec2 p=uv*1.25+vec2(0.,uScroll*.00022);
        vec2 q=vec2(fbm(p+vec2(0.,t)), fbm(p+vec2(5.2,1.3)-t));
        vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.4), fbm(p+3.*q+vec2(8.3,2.8)-t*1.1));
        float f=fbm(p+2.6*r);
        vec3 col=vec3(.004,.007,.028);
        col=mix(col, vec3(.03,.06,.24), smoothstep(.22,.82,f));
        col=mix(col, vec3(.13,.22,.78), smoothstep(.48,1.,f)*.8*r.x);
        col=mix(col, vec3(.32,.17,.74), smoothstep(.45,.9,r.y)*.36*q.x);
        col+=vec3(.55,.66,1.)*pow(smoothstep(.58,1.,f),3.)*.5;
        vec2 m=(uMouse-.5*uRes)/uRes.y;
        float ml=exp(-length(uv-m)*2.4);
        col+=vec3(.14,.22,.65)*ml*(.3+.7*f)*.6;
        col*=1.-.5*dot(uv*vec2(.75,1.),uv*vec2(.75,1.));
        col*=1.+uPulse*1.1;
        float d=length(uv)+(f-.5)*.4;
        float rv=1.-smoothstep(uIntro*1.7-.4,uIntro*1.7,d);
        col*=rv*clamp(uIntro*1.5,0.,1.);
        col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/180.;
        gl_FragColor=vec4(col,1.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { document.documentElement.classList.add('no-gl'); return; }
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { document.documentElement.classList.add('no-gl'); return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const uRes = U('uRes'), uMouse = U('uMouse'), uTime = U('uTime'), uIntro = U('uIntro'), uPulse = U('uPulse'), uScroll = U('uScroll');
    let k = .5;
    const resize = () => {
      k = Math.min(window.devicePixelRatio || 1, 1.5) * (innerWidth < 760 ? .45 : .55);
      cv.width = Math.round(innerWidth * k); cv.height = Math.round(innerHeight * k);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize(); addEventListener('resize', resize);
    const sm = { x: mouse.x, y: mouse.y, s: 0 };
    const ease = x => 1 - Math.pow(1 - x, 3);
    const frame = now => {
      if (!reduce) mist.intro = ease(clamp((now - mist.introStart) / 2800));
      mist.pulse += (mist.pulseTarget - mist.pulse) * .08;
      sm.x += (mouse.x - sm.x) * .05; sm.y += (mouse.y - sm.y) * .05; sm.s += (scrollY - sm.s) * .08;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform2f(uMouse, sm.x * k, (innerHeight - sm.y) * k);
      gl.uniform1f(uTime, now / 1000);
      gl.uniform1f(uIntro, mist.intro);
      gl.uniform1f(uPulse, mist.pulse);
      gl.uniform1f(uScroll, sm.s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    mist.ok = true;
  })();

  /* =========================================================
     Ciel étoilé — 2D
     ========================================================= */
  const sky = document.getElementById('sky');
  const ctx = sky.getContext('2d');
  let stars = [], shooting = [], W = 0, H = 0, dpr = 1;
  function resizeSky() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    sky.width = W * dpr; sky.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(320, Math.floor(W * H / 4800));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H * 1.6, r: Math.random() ** 3 * 1.4 + .2,
      z: rand(.1, 1), t: Math.random() * Math.PI * 2, s: rand(.4, 1.8)
    }));
  }
  function shoot() {
    if (!document.hidden) shooting.push({ x: rand(W * .1, W * .9), y: rand(0, H * .4), vx: rand(-9, -5) * (Math.random() < .5 ? -1 : 1), vy: rand(3, 5), life: 1 });
    setTimeout(shoot, rand(4000, 9000));
  }
  let t0 = performance.now();
  function drawSky(now) {
    const dt = Math.min(50, now - t0) / 1000; t0 = now;
    ctx.clearRect(0, 0, W, H);
    const px = mouse.nx * 16, py = mouse.ny * 10, fade = mist.intro;
    for (const s of stars) {
      s.t += dt * s.s;
      const a = (.25 + Math.sin(s.t) * .3 + .3 * s.z) * fade;
      let y = (s.y - scrollY * s.z * .12) % (H * 1.6);
      if (y < 0) y += H * 1.6;
      if (y > H + 4) continue;
      const x = s.x + px * s.z, yy = y + py * s.z;
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = '#e6ebff';
      ctx.beginPath(); ctx.arc(x, yy, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.2) { ctx.globalAlpha *= .22; ctx.beginPath(); ctx.arc(x, yy, s.r * 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    shooting = shooting.filter(s => s.life > 0);
    for (const s of shooting) {
      s.x += s.vx * 60 * dt; s.y += s.vy * 60 * dt; s.life -= dt * .9;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 16, s.y - s.vy * 16);
      g.addColorStop(0, `rgba(220,230,255,${s.life})`); g.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 16, s.y - s.vy * 16); ctx.stroke();
    }
    requestAnimationFrame(drawSky);
  }
  resizeSky();
  addEventListener('resize', resizeSky);
  if (!reduce) { requestAnimationFrame(drawSky); setTimeout(shoot, 4000); }
  else { drawSky(performance.now()); }

  /* =========================================================
     Défilement doux
     ========================================================= */
  let lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch { lenis = null; }
  }
  function scrollTo(target, { immediate = false, offset = 0 } = {}) {
    if (lenis) { lenis.scrollTo(target, { immediate, offset, force: true }); return; }
    const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
  }
  function lockScroll(on) { if (lenis) on ? lenis.stop() : lenis.start(); }

  /* =========================================================
     Curseur : un point de lumière (la brume suit la souris)
     ========================================================= */
  const cursor = document.querySelector('.cursor');
  const dot = cursor.querySelector('.cursor__dot');
  const c = { x: mouse.x, y: mouse.y };
  function loopCursor() {
    c.x += (mouse.x - c.x) * .35; c.y += (mouse.y - c.y) * .35;
    dot.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%,-50%)`;
    requestAnimationFrame(loopCursor);
  }
  if (fine) {
    loopCursor();
    document.addEventListener('pointerover', e => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .tarot__card, label, select, summary, input, .moon'));
    });
  }

  /* ---------- Étincelles ---------- */
  function burst(x, y, n = 10, colors = ['#ffffff', '#c9d4ff', '#8fa6ff']) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.background = colors[i % colors.length];
      const a = (Math.PI * 2 * i) / n + rand(-.3, .3), d = rand(30, 80), size = rand(2, 5);
      s.style.width = s.style.height = size + 'px';
      document.body.appendChild(s);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }
      ], { duration: rand(700, 1100), easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => s.remove();
    }
  }

  /* ---------- Boutons magnétiques & cartes 3D ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', e => {
      const m = e.target.closest('.btn, .cart-btn, [data-magnetic]');
      document.querySelectorAll('.is-magnet').forEach(el => { if (el !== m) { el.style.transform = ''; el.classList.remove('is-magnet'); } });
      if (m) {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        m.classList.add('is-magnet');
        m.style.transform = `translate(${dx * .16}px, ${dy * .26}px)`;
      }
      const card = e.target.closest('.tarot__card, .astre__arch');
      document.querySelectorAll('.is-tilt').forEach(el => { if (el !== card) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('is-tilt'); } });
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilt');
        card.style.setProperty('--rx', ((.5 - py) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - .5) * 11).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      }
    }, { passive: true });
  }

  /* ---------- Texte lettre à lettre ---------- */
  const segment = s => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : [...s]);
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
            segment(part).forEach(ch => {
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

  /* ---------- Texte qui s'allume au défilement ---------- */
  let scrubs = [];
  function prepScrub(el) {
    if (el.dataset.scrubDone) return;
    el.dataset.scrubDone = '1';
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'sw'; w.textContent = part; frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }
  function updateScrubs() {
    for (const s of scrubs) {
      const r = s.el.getBoundingClientRect();
      const p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .4));
      const n = s.words.length, pos = p * (n + 4);
      s.words.forEach((w, i) => { const v = clamp(pos - i, 0, 4) / 4; w.style.setProperty('--l', v.toFixed(3)); });
    }
  }

  /* ---------- Révélations ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  function scan(root = document) {
    root.querySelectorAll('[data-split]').forEach(split);
    root.querySelectorAll('[data-reveal], [data-split]').forEach(el => io.observe(el));
    root.querySelectorAll('[data-scrub]').forEach(prepScrub);
    scrubs = [...document.querySelectorAll('[data-scrub]')].map(el => ({ el, words: [...el.querySelectorAll('.sw')] }));
    updateScrubs();
  }

  /* ---------- Vol vers le panier ---------- */
  function flyToCart(fromEl) {
    const target = document.getElementById('cartBtn');
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const done = () => { target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); burst(x1, y1, 12); pulse(.35, 500); };
    if (reduce) { done(); return; }
    const f = document.createElement('span'); f.className = 'flyer';
    document.body.appendChild(f);
    const cx = (x0 + x1) / 2 + rand(-80, 80), cy = Math.min(y0, y1) - 180;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      pts.push({ transform: `translate(${x - 9}px, ${y - 9}px) scale(${1 - t * .5})`, opacity: t > .95 ? 0 : 1 });
    }
    f.animate(pts, { duration: 950, easing: 'cubic-bezier(.5,0,.5,1)' }).onfinish = () => { f.remove(); done(); };
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

  /* ---------- Pulsation de la brume ---------- */
  function pulse(v = .5, ms = 600) { mist.pulseTarget = v; setTimeout(() => { mist.pulseTarget = 0; }, ms); }

  /* ---------- Transition voilée ---------- */
  const veil = document.getElementById('eclipse');
  const appEl = document.getElementById('app');
  let busy = false;
  function eclipse(x, y, mid) {
    if (reduce || busy) { mid(); return; }
    busy = true;
    veil.style.setProperty('--ex', x + 'px'); veil.style.setProperty('--ey', y + 'px');
    veil.classList.add('is-in'); appEl.classList.add('is-leaving');
    pulse(.55, 650);
    setTimeout(() => {
      mid();
      appEl.classList.remove('is-leaving'); appEl.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        veil.classList.remove('is-in'); appEl.classList.remove('is-entering');
        setTimeout(() => { busy = false; }, 900);
      }));
    }, 650);
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastT;
  function toast(msg) {
    toastEl.innerHTML = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }

  window.FX = {
    scan, split, burst, flyToCart, fireflies, eclipse, toast, pulse, scrollTo, lockScroll, mouse, reduce, fine,
    get lenis() { return lenis; },
    setScroll: y => { scrollY = y; updateScrubs(); }
  };
})();
