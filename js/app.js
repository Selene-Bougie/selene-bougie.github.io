/* SELENE — application (routeur, boutique, panier, commande) */
(function () {
  const { products, sizes, promo: PROMO, shipping: SHIP, credits } = window.SELENE;
  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const euro = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const byId = id => products.find(p => p.id === id);
  const minPrice = p => Math.min(...Object.values(p.sizes));
  const defSize = p => p.sizes.classique ? 'classique' : Object.keys(p.sizes)[0];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
  };
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Lune réelle masquée selon sa phase (f : 0 nouvelle → .5 pleine) */
  const moonPhaseShade = f => `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path fill-rule="evenodd" fill="#050816" fill-opacity=".93" d="M0 -10.6 A10.6 10.6 0 1 1 0 10.6 A10.6 10.6 0 1 1 0 -10.6Z ${ART.phasePath(f, 10)}"/></svg>`;

  /* =========================================================
     Panier
     ========================================================= */
  const cart = {
    items: store.get('selene-cart', []).filter(i => byId(i.id) && byId(i.id).sizes[i.size]),
    promo: store.get('selene-promo', null),
    save() { store.set('selene-cart', this.items); store.set('selene-promo', this.promo); renderCart(); },
    add(id, size, qty = 1) {
      const line = this.items.find(i => i.id === id && i.size === size);
      if (line) line.qty = Math.min(20, line.qty + qty); else this.items.push({ id, size, qty });
      this.save();
    },
    setQty(id, size, qty) {
      const line = this.items.find(i => i.id === id && i.size === size);
      if (!line) return;
      line.qty = qty;
      if (qty <= 0) this.items = this.items.filter(i => i !== line);
      this.save();
    },
    clear() { this.items = []; this.promo = null; this.save(); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    subtotal() { return this.items.reduce((s, i) => s + byId(i.id).sizes[i.size] * i.qty, 0); },
    totals(method = 'standard') {
      const sub = this.subtotal();
      const discount = this.promo === PROMO.code ? Math.round(sub * PROMO.rate * 100) / 100 : 0;
      const after = sub - discount;
      let ship = method === 'express' ? SHIP.express : (after >= SHIP.freeFrom ? 0 : SHIP.standard);
      if (!this.items.length) ship = 0;
      return { sub, discount, ship, total: Math.max(0, after + ship) };
    }
  };

  const drawer = $('#drawer');
  function openCart() { renderCart(); drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); FX.lockScroll(true); }
  function closeCart() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); FX.lockScroll(false); }
  $('#cartBtn').addEventListener('click', openCart);

  /* ---------- Dock flottant : tout à portée de pouce ---------- */
  const dock = $('#dock'), dockCenter = $('#dockCenter'), dockHome = dockCenter.innerHTML;
  function dockReset() { dockCenter.innerHTML = dockHome; dock.classList.remove('has-buy'); }
  function dockBuy(label, onClick) {
    dockCenter.innerHTML = '<button class="dock__buy" id="dockBuy"></button>';
    const b = $('#dockBuy'); b.textContent = label; b.addEventListener('click', onClick);
    dock.classList.add('has-buy');
  }
  $('#dockCart').addEventListener('click', openCart);
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCart(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  function lineHTML(i) {
    const p = byId(i.id), price = p.sizes[i.size];
    return `
      <div class="line">
        <a class="line__thumb" href="#/produit/${p.id}" data-link><img src="${p.img}" alt="${p.name}"></a>
        <div>
          <p class="line__name">${p.name}</p>
          <p class="line__sub">${sizes[i.size].label} · ${sizes[i.size].weight} · ${euro(price)}</p>
          <button class="line__remove" data-remove="${i.id}|${i.size}">Retirer</button>
        </div>
        <div class="line__right">
          <div class="qty" role="group" aria-label="Quantité">
            <button data-dec="${i.id}|${i.size}" aria-label="Moins">−</button><output>${i.qty}</output><button data-inc="${i.id}|${i.size}" aria-label="Plus">+</button>
          </div>
          <b>${euro(price * i.qty)}</b>
        </div>
      </div>`;
  }

  function renderCart() {
    const n = cart.count();
    const badge = $('#cartCount');
    badge.textContent = n; badge.classList.toggle('has-items', n > 0);
    const dc = $('#dockCount'); dc.textContent = n; dc.classList.toggle('has-items', n > 0);
    $('#dockCart').setAttribute('aria-label', n ? `Panier, ${n} article${n > 1 ? 's' : ''}` : 'Panier vide');
    const body = $('#drawerBody'), foot = $('#drawerFoot');
    if (!cart.items.length) {
      body.innerHTML = `<div class="empty"><div class="moon-mini">${moonPhaseShade(.06)}</div><p>Nouvelle lune : votre panier attend sa première flamme.</p><a href="#/boutique" class="btn btn--small" data-link>Découvrir la collection</a></div>`;
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = cart.items.map(lineHTML).join('');
    const t = cart.totals();
    const left = Math.max(0, SHIP.freeFrom - (t.sub - t.discount));
    foot.innerHTML = `
      <div class="freeship">${left > 0 ? `Plus que <b>${euro(left)}</b> pour la livraison offerte ✦` : 'La livraison standard est offerte ✦'}
        <div class="freeship__bar"><i style="width:${Math.min(100, (t.sub - t.discount) / SHIP.freeFrom * 100)}%"></i></div></div>
      <div class="totals">
        <div><span>Sous-total</span><span>${euro(t.sub)}</span></div>
        ${t.discount ? `<div><span>Code ${PROMO.code}</span><span>− ${euro(t.discount)}</span></div>` : ''}
        <div><span>Livraison</span><span>${t.ship ? euro(t.ship) : 'Offerte'}</span></div>
        <div class="grand"><span>Total</span><span>${euro(t.total)}</span></div>
      </div>
      <a href="#/commande" class="btn btn--block" data-link>Passer commande</a>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-inc],[data-dec],[data-remove]');
    if (!b) return;
    const [id, size] = (b.dataset.inc || b.dataset.dec || b.dataset.remove).split('|');
    const line = cart.items.find(i => i.id === id && i.size === size);
    if (!line) return;
    if (b.dataset.inc) cart.setQty(id, size, Math.min(20, line.qty + 1));
    else if (b.dataset.dec) cart.setQty(id, size, line.qty - 1);
    else cart.setQty(id, size, 0);
    if (location.hash.startsWith('#/commande')) renderSummary();
  });

  function addToCart(id, size, qty, fromEl) {
    cart.add(id, size, qty);
    if (fromEl) FX.flyToCart(fromEl);
    FX.toast(`✦ <b>${byId(id).name}</b> (${sizes[size].label}) a rejoint votre panier`);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    addToCart(b.dataset.add, b.dataset.size, 1, b);
  });

  /* =========================================================
     Composants artistiques
     ========================================================= */
  const corners = ['tl', 'tr', 'bl', 'br'].map(c => `<span class="tarot__corner tarot__corner--${c}">${ART.corner}</span>`).join('');

  function tarotCard(p, { tag = 'a' } = {}) {
    const attrs = tag === 'a' ? `href="#/produit/${p.id}" data-link aria-label="${p.name} — voir la bougie"` : '';
    return `
      <${tag} class="tarot__card" ${attrs} style="--accent:${p.accent}">
        ${corners}
        <div class="tarot__top"><span>${p.num}</span>${ART.phaseGlyph(p.moon, { size: 18 })}<span>${p.num}</span></div>
        <div class="tarot__window">
          <img src="${p.img}" alt="Bougie ${p.name}" loading="lazy">
          <div class="tarot__veil">
            <small>TÊTE</small><p>${p.notes.tete}</p>
            <small>CŒUR</small><p>${p.notes.coeur}</p>
            <small>FOND</small><p>${p.notes.fond}</p>
          </div>
          ${p.badge ? `<span class="tarot__badge">${p.badge}</span>` : ''}
        </div>
        <div class="tarot__foot"><h3 class="tarot__name">${p.name}</h3><p class="tarot__family">${p.family}</p></div>
      </${tag}>`;
  }
  function astreHTML(p, i = 0) {
    const s = defSize(p), multi = Object.keys(p.sizes).length > 1;
    return `
    <article class="astre" data-reveal="astre" style="--i:${i % 3}; --accent:${p.accent}">
      <a class="astre__link" href="#/produit/${p.id}" data-link aria-label="${p.name} — voir la bougie">
        <div class="astre__arch">
          <div class="astre__window">
            <img src="${p.img}" alt="Bougie ${p.name}" loading="lazy">
            <span class="astre__light" aria-hidden="true"></span>
            <div class="astre__notes">
              <small>Tête</small><p>${p.notes.tete}</p>
              <small>Cœur</small><p>${p.notes.coeur}</p>
              <small>Fond</small><p>${p.notes.fond}</p>
            </div>
          </div>
          ${p.badge ? `<span class="astre__badge">${p.badge}</span>` : ''}
        </div>
        <span class="astre__num"><i></i><b>${p.num}</b><i></i></span>
        <h3 class="astre__name">${p.name}</h3>
        <p class="astre__family">${p.family}</p>
      </a>
      <p class="astre__price">${multi ? '<small>dès</small> ' : ''}${euro(minPrice(p))}</p>
      <button class="astre__add" data-add="${p.id}" data-size="${s}"><span>Ajouter</span><b>+</b></button>
    </article>`;
  }

  const archFrame = (src, alt, caption = '', imgAttrs = '') => `
    <div class="arch-frame"><div class="arch"><img src="${src}" alt="${alt}" loading="lazy" ${imgAttrs}></div>${caption ? `<span class="arch-caption">${caption}</span>` : ''}</div>`;

  /* =========================================================
     Vues
     ========================================================= */
  const views = {};

  /* Les quatre serments : la bougie, de la plante au pot */
  const PLEDGE = [
    ['I', 'Née des plantes', 'Une cire de soja et de colza, jamais de paraffine — ce dérivé du pétrole qui noircit les murs. Notre flamme brûle lentement, proprement.', 'assets/img/r-cire.jpg', 'Cire végétale fondue, mèches prêtes dans les pots'],
    ['II', 'Une mèche honnête', 'Du coton tressé, sans plomb ni âme métallique, centré à la main dans chaque pot. Rien d’autre ne part en fumée.', 'assets/img/r-meche.jpg', 'Mains qui ajustent la mèche d’une bougie'],
    ['III', 'Zéro plastique', 'Un colis en carton, un calage en papier, un ruban de papier. Rien qui ne finisse un jour dans l’océan.', 'assets/img/r-coulee.jpg', 'Cire versée à la main dans des pots en verre'],
    ['IV', 'Le pot revit', 'Un verre épais pensé pour durer : verre à thé, pot à crayons, petit vase… ou écrin de votre prochaine bougie.', 'assets/img/r-pot.jpg', 'Pots en verre ambré vides, prêts à être réutilisés']
  ];
  const STATS = [
    [0, '%', 'de paraffine'],
    [100, '%', 'cire végétale'],
    [45, 'h', 'de lumière douce'],
    [0, 'g', 'de plastique au colis']
  ];
  /* Sceau du projet étudiant : texte circulaire autour d'une pousse sous la lune */
  const campusSeal = () => `
    <svg class="seal" viewBox="-120 -120 240 240" aria-hidden="true">
      <defs><path id="sealPath" d="M-92 0 A92 92 0 1 1 92 0 A92 92 0 1 1 -92 0"/></defs>
      <g class="seal__ring"><text><textPath href="#sealPath" textLength="575" lengthAdjust="spacing">UNIVERSITÉ DE HAUTE-ALSACE ✦ PROJET ÉTUDIANT ✦ SELENE ✦ </textPath></text></g>
      <circle r="108" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
      <circle r="76" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35" stroke-dasharray="1 4"/>
      <g class="seal__core">
        <path d="M-6 -34 A26 26 0 1 0 22 -12 A21 21 0 1 1 -6 -34Z" fill="currentColor" opacity=".9"/>
        <path d="M0 40 C0 22 0 12 0 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M0 18 C-14 16 -20 6 -20 -2 C-8 -2 0 6 0 18Z M0 12 C12 10 18 2 18 -6 C8 -6 0 0 0 12Z" fill="currentColor" opacity=".75"/>
      </g>
    </svg>`;

  const oathTab = (s, i) => `
    <button class="oath__tab ${i ? '' : 'is-on'}" role="tab" aria-selected="${!i}" data-oath="${i}">
      ${ART.phaseGlyph((i + 1) / 8, { size: 18 })}<span><small>${s[0]}</small>${s[1]}</span>
    </button>`;

  /* ---------- Accueil : court, tout à portée de main ---------- */
  views.home = () => `
    <section class="hero" id="hero">
      <div class="hero__visual" id="heroVisual">
        <div class="plate" data-reveal="zoom">
          <div class="plate__ripple" aria-hidden="true"><i></i><i></i><i></i></div>
          ${ART.astrolabe({ text: 'SELENE ✦ CIRE VÉGÉTALE ✦ SANS PARAFFINE ✦ MÈCHE EN COTON ✦ ZÉRO PLASTIQUE ✦ POT RÉUTILISABLE ✦ ' })}
          <div class="moon" id="moon" title="Touchez la lune…">
            <div class="moon__halo"></div><div class="moon__glow"></div><div class="moon__img"></div><div class="moon__shade"></div>
          </div>
        </div>
      </div>
      <div class="hero__inner" id="heroText">
        <span class="eyebrow" data-reveal style="--d:.5s">Bougies végétales · coulées à la main</span>
        <h1 data-split style="--d:.2s">Allume la nuit, <br><em>pas la planète.</em></h1>
        <p class="hero__lead" data-reveal style="--d:.9s">Cire née des plantes, mèche en coton, pot qui ne se jette pas. Dès 10 €, livraison offerte dès 35 €.</p>
        <div class="hero__cta" data-reveal style="--d:1.1s">
          <a href="#collection" class="btn" data-scroll>Choisir ma bougie</a>
          <a href="#engagements" class="btn btn--ghost" data-scroll>Nos engagements</a>
        </div>
      </div>
      <a href="#collection" class="scroll-cue" data-scroll aria-label="Voir la collection"><i></i></a>
    </section>

    <section class="section home-shop" id="collection">
      <div class="wrap">
        <div class="section-head section-head--center">
          <span class="eyebrow" data-reveal>La collection</span>
          <h2 data-split>Six lunes, <em>six humeurs.</em></h2>
        </div>
        <div class="collection collection--rail">${products.map(astreHTML).join('')}</div>
        <p class="rail-hint" aria-hidden="true">Glissez <span>⟷</span></p>
        <div class="home-shop__more" data-reveal><a href="#/boutique" class="link-arrow" data-link>Toute la boutique <span>→</span></a></div>
      </div>
    </section>

    <section class="section oath" id="engagements">
      <div class="section-head section-head--center">
        <span class="eyebrow" data-reveal>Nos engagements</span>
        <h2 data-split>Douce pour vous, <em>légère pour la Terre.</em></h2>
      </div>
      <div class="oath__stage" data-reveal>
        <div class="oath__tabs oath__tabs--l" role="tablist" aria-label="Nos engagements">${PLEDGE.slice(0, 2).map((s, i) => oathTab(s, i)).join('')}</div>
        <div class="oath__center">
          <div class="oath__orb">
            <svg class="oath__ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="96" class="oath__track"/>
              <circle cx="100" cy="100" r="96" class="oath__fill" pathLength="1"/>
            </svg>
            <div class="oath__window">
              ${PLEDGE.map((s, i) => `<img src="${s[3]}" alt="${s[4]}" data-oath-img="${i}" loading="lazy" class="${i ? '' : 'is-on'}">`).join('')}
            </div>
          </div>
          <div class="oath__texts" aria-live="polite">
            ${PLEDGE.map((s, i) => `<p class="oath__text ${i ? '' : 'is-on'}" data-oath-text="${i}"><b>${s[1]}</b>${s[2]}</p>`).join('')}
          </div>
        </div>
        <div class="oath__tabs oath__tabs--r" role="tablist" aria-label="Nos engagements (suite)">${PLEDGE.slice(2).map((s, i) => oathTab(s, i + 2)).join('')}</div>
      </div>
      <div class="oath__stats">
        ${STATS.map(([n, u, l]) => `<div class="stat"><p class="stat__n"><b data-count="${n}">0</b><small>${u}</small></p><p class="stat__l">${l}</p></div>`).join('')}
      </div>
      <div class="home-shop__more" data-reveal><a href="#/nature" class="link-arrow" data-link>Tout savoir sur nos bougies <span>→</span></a></div>
    </section>

    <section class="section campus campus--slim" id="projet">
      <div class="campus__seal" data-reveal="zoom">${campusSeal()}</div>
      <div class="campus__body">
        <span class="eyebrow" data-reveal>Les coulisses</span>
        <h2 data-split>Née sur les bancs <em>de l’université.</em></h2>
        <p data-reveal>SELENE est un projet étudiant, imaginé et conçu à l’<b>Université de Haute-Alsace</b> (UHA), avec une seule boussole : faire de belles choses qui respectent la nature.</p>
      </div>
    </section>`;

  /* Compteurs qui montent en douceur */
  function countUp(root) {
    const els = $$('[data-count]', root);
    const ob = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      ob.unobserve(en.target);
      const el = en.target, to = +el.dataset.count;
      if (FX.reduce || !to) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 2200;
      const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    els.forEach(e => ob.observe(e));
  }

  /* Engagements : un seul écran, onglets + défilement automatique doux */
  let oathTimer = 0;
  function oath(root) {
    const stage = root.querySelector('.oath'); if (!stage) return;
    const tabs = [...stage.querySelectorAll('[data-oath]')], n = tabs.length;
    let cur = 0, visible = false, paused = false;
    const show = (i, user) => {
      cur = (i + n) % n;
      tabs.forEach(t => { const on = +t.dataset.oath === cur; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
      stage.querySelectorAll('[data-oath-img]').forEach(el => el.classList.toggle('is-on', +el.dataset.oathImg === cur));
      stage.querySelectorAll('[data-oath-text]').forEach(el => el.classList.toggle('is-on', +el.dataset.oathText === cur));
      const ring = stage.querySelector('.oath__ring'); ring.classList.remove('is-run'); void ring.getBoundingClientRect(); ring.classList.add('is-run');
      if (user) FX.pulse(.2, 400);
      arm();
    };
    const arm = () => {
      clearTimeout(oathTimer);
      if (FX.reduce || !visible || paused || !stage.isConnected) return;
      oathTimer = setTimeout(() => show(cur + 1), 6000);
    };
    tabs.forEach(t => t.addEventListener('click', () => show(+t.dataset.oath, true)));
    const st = stage.querySelector('.oath__stage');
    st.addEventListener('pointerenter', () => { paused = true; stage.classList.add('is-paused'); clearTimeout(oathTimer); });
    st.addEventListener('pointerleave', () => { paused = false; stage.classList.remove('is-paused'); show(cur); });
    new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; if (visible) show(cur); else clearTimeout(oathTimer); }), { threshold: .35 }).observe(stage);
  }

  views.home.after = () => {
    countUp(app);
    oath(app);
    const moon = $('#moon'); let taps = 0, tt;
    moon.addEventListener('click', e => {
      taps++; clearTimeout(tt); tt = setTimeout(() => taps = 0, 1200);
      FX.burst(e.clientX, e.clientY, 14, ['#ffffff', '#c9d4ff', '#8fa6ff']);
      if (taps >= 3) {
        taps = 0; moon.classList.remove('eclipsed'); void moon.offsetWidth; moon.classList.add('eclipsed');
        FX.toast('🌑 Éclipse ! Séléné vous offre le code <b>PLEINELUNE</b> : −10 %');
      }
    });
    $('#hero').addEventListener('pointermove', e => {
      moon.style.setProperty('--lx', (e.clientX / innerWidth - .5).toFixed(3));
      moon.style.setProperty('--ly', (e.clientY / innerHeight - .5).toFixed(3));
    });
  };

  /* ---------- Boutique ---------- */
  const FILTERS = [
    ['tout', 'Tout', () => true],
    ['bougies', 'Bougies', p => p.id !== 'coffret-phases'],
    ['cadeaux', 'Coffret', p => p.id === 'coffret-phases']
  ];
  views.shop = (q) => {
    const f = FILTERS.find(x => x[0] === q.get('f')) ? q.get('f') : 'tout';
    return `
    <section class="page"><div class="wrap section shop">
      <header class="shop-head">
        <span class="eyebrow" data-reveal>Boutique</span>
        <h1 data-split>La <em>collection</em></h1>
        <span class="hairline" data-reveal></span>
        <p class="muted" data-reveal>Mini 80 g dès 10 € · Classique 180 g · Livraison offerte dès 35 €</p>
        <div class="seg" role="tablist" data-reveal style="--d:.2s">
          <span class="seg__ind" aria-hidden="true"></span>
          ${FILTERS.map(([k, l]) => `<button class="seg__btn ${k === f ? 'is-on' : ''}" data-filter="${k}" role="tab" aria-selected="${k === f}">${l}</button>`).join('')}
        </div>
      </header>
      <div class="collection" id="shopGrid"></div>
    </div></section>`;
  };
  views.shop.after = (q) => {
    let f = FILTERS.find(x => x[0] === q.get('f')) ? q.get('f') : 'tout';
    const grid = $('#shopGrid'), ind = $('.seg__ind');
    const place = (instant) => {
      const b = $('.seg__btn.is-on'); if (!b) return;
      if (instant) ind.style.transition = 'none';
      ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft}px)`;
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    };
    const draw = () => {
      grid.innerHTML = products.filter((FILTERS.find(x => x[0] === f) || FILTERS[0])[2]).map(astreHTML).join('');
      if (booted) FX.scan(grid);
    };
    draw(); place(true);
    addEventListener('resize', () => place(true));
    if (document.fonts) document.fonts.ready.then(() => place(true));
    let busy = false;
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
      if (busy || b.dataset.filter === f) return;
      f = b.dataset.filter; busy = true;
      $$('[data-filter]').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
      place(false);
      history.replaceState(null, '', '#/boutique' + (f !== 'tout' ? '?f=' + f : ''));
      FX.pulse(.3, 400);
      grid.classList.add('is-out');
      setTimeout(() => { draw(); grid.classList.remove('is-out'); busy = false; }, FX.reduce ? 0 : 520);
    }));
  };

  /* ---------- Produit ---------- */
  views.product = (q, id) => {
    const p = byId(id);
    if (!p) return views.notfound();
    const keys = Object.keys(p.sizes), sel = defSize(p);
    const others = products.filter(x => x.id !== p.id).slice(0, 3);
    const gallery = [p.img, ...p.gallery];
    return `
    <section class="page" style="--accent:${p.accent}"><div class="wrap section pdp-page">
      <header class="pdp-head">
        <p class="crumbs" data-reveal><a href="#/boutique" data-link>Boutique</a><i>·</i>${p.name}</p>
        <span class="eyebrow" data-reveal>Arcane ${p.num} · ${p.phase}</span>
        <h1 data-split>${p.name}</h1>
        <p class="pdp__tag" data-reveal>${p.tagline}</p>
      </header>
      <div class="pdp">
        <div class="pdp__side pdp__side--left">
          <p class="pdp__desc" data-reveal="left">${p.description}</p>
          <div class="notes">
            ${[['Tête', p.notes.tete, .12], ['Cœur', p.notes.coeur, .3], ['Fond', p.notes.fond, .5]].map(([k, v, fr], i) => `<div class="note" data-reveal="left" style="--d:${.1 + i * .1}s"><span>${k}</span><p>${v}</p>${ART.phaseGlyph(fr, { size: 20 })}</div>`).join('')}
          </div>
        </div>
        <div class="pdp__visual" data-reveal="zoom">
          <div class="pdp__main">
            ${ART.astrolabe()}
            ${archFrame(p.img, 'Bougie ' + p.name, p.family, 'id="pdpImg"').replace('loading="lazy"', '')}
          </div>
          <div class="pdp__thumbs">${gallery.map((g, i) => `<button class="${i === 0 ? 'is-on' : ''}" data-img="${g}" aria-label="Photo ${i + 1}"><img src="${g}" alt="" loading="lazy"></button>`).join('')}</div>
        </div>
        <div class="pdp__side pdp__side--right">
          <p class="pdp__price" data-reveal="right"><span id="pdpPrice">${euro(p.sizes[sel])}</span><small>TTC</small></p>
          <div class="sizes" data-reveal="right" style="--d:.1s">${keys.map(k => `
            <button class="size ${k === sel ? 'is-on' : ''}" data-size-pick="${k}">
              <b>${sizes[k].label}</b><span>${sizes[k].weight} · ${sizes[k].burn} · ${euro(p.sizes[k])}</span>
            </button>`).join('')}</div>
          <div class="buy-row" data-reveal="right" style="--d:.2s">
            <div class="qty"><button id="qMinus" aria-label="Moins">−</button><output id="qVal">1</output><button id="qPlus" aria-label="Plus">+</button></div>
            <button class="btn" id="buyBtn">Ajouter</button>
          </div>
        </div>
      </div>
      <ul class="eco-chips" data-reveal><li>Cire végétale</li><li>Sans paraffine</li><li>Mèche en coton</li><li>Pot réutilisable</li><li>Colis sans plastique</li></ul>
      <div class="accs" data-reveal>
        <details class="acc"><summary>Conseils d'allumage</summary><p>Laissez brûler 2 h la première fois, jusqu'à ce que toute la surface soit fondue : c'est ce qui évite l'effet « tunnel ». Recoupez la mèche à 5 mm avant chaque allumage, ne laissez jamais une bougie sans surveillance, et éteignez-la avec un éteignoir plutôt qu'en soufflant.</p></details>
        <details class="acc"><summary>Composition</summary><p>Cire de soja et de colza, parfum (conforme IFRA), mèche en coton tressé. Sans paraffine, sans colorant. Pot en verre réutilisable.</p></details>
        <details class="acc"><summary>Une seconde vie au pot</summary><p>Une fois la bougie terminée, placez le pot une heure au congélateur : la cire restante se détache d'un coup. Un peu d'eau chaude savonneuse, et il devient verre à thé, pot à crayons ou petit vase. Le colis, lui, part au tri avec le papier.</p></details>
        <details class="acc"><summary>Livraison & retours</summary><p>Expédition sous 48 h, livraison offerte dès 35 €. Retours gratuits sous 14 jours pour une bougie jamais allumée. (Prototype : aucune commande réelle n'est expédiée.)</p></details>
      </div>
    </div></section>
    <section class="section" style="padding-top:0"><div class="wrap">
      <div class="section-head section-head--center"><span class="eyebrow" data-reveal>Sous la même lune</span><h2 data-split>Vous aimerez <em>aussi</em></h2></div>
      <div class="collection">${others.map(astreHTML).join('')}</div>
    </div></section>`;
  };
  views.product.after = (q, id) => {
    const p = byId(id); if (!p) return;
    let size = defSize(p), qty = 1;
    const price = $('#pdpPrice'), qv = $('#qVal');
    const update = () => { price.textContent = euro(p.sizes[size] * qty); qv.textContent = qty; const db = $('#dockBuy'); if (db) db.textContent = 'Ajouter · ' + euro(p.sizes[size] * qty); };
    dockBuy('Ajouter · ' + euro(p.sizes[size]), e => addToCart(p.id, size, qty, e.currentTarget));
    $$('[data-size-pick]').forEach(b => b.addEventListener('click', () => {
      size = b.dataset.sizePick;
      $$('[data-size-pick]').forEach(x => x.classList.toggle('is-on', x === b));
      price.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
      update();
    }));
    $('#qMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); update(); });
    $('#qPlus').addEventListener('click', () => { qty = Math.min(20, qty + 1); update(); });
    $('#buyBtn').addEventListener('click', e => addToCart(p.id, size, qty, e.currentTarget));
    const img = $('#pdpImg');
    $$('[data-img]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('is-on')) return;
      $$('[data-img]').forEach(x => x.classList.toggle('is-on', x === b));
      img.classList.add('is-swapping');
      const pre = new Image(); pre.onload = pre.onerror = () => setTimeout(() => { img.src = b.dataset.img; img.classList.remove('is-swapping'); }, 250); pre.src = b.dataset.img;
    }));
  };

  /* ---------- Commande ---------- */
  views.checkout = () => {
    if (!cart.items.length) {
      return `<section class="page notfound"><div><div class="moon-mini" style="margin:0 auto 20px">${moonPhaseShade(.06)}</div><span class="eyebrow">Commande</span><h1 data-split>Rien à <em>allumer</em>…</h1><p class="muted" style="margin:20px 0 30px">Votre panier est vide pour le moment.</p><a href="#/boutique" class="btn" data-link>Aller à la boutique</a></div></section>`;
    }
    return `
    <section class="page"><div class="wrap section" style="padding-top:30px">
      <header class="checkout-head">
        <span class="eyebrow" data-reveal>Commande sécurisée · simulation</span>
        <h1 data-split>Presque <em>à vous.</em></h1>
        <div class="steps" data-reveal><b>Panier</b><i></i><b>Informations</b><i></i><b>Paiement</b><i></i><span>Pleine lune</span></div>
      </header>
      <div class="checkout">
        <form id="checkoutForm" novalidate>

          <fieldset class="fieldset" data-reveal>
            <legend>Vous</legend>
            <div class="fields">
              ${field('firstname', 'Prénom', 'text', 'given-name')}
              ${field('lastname', 'Nom', 'text', 'family-name')}
              ${field('email', 'E-mail', 'email', 'email', 'full')}
            </div>
          </fieldset>

          <fieldset class="fieldset" data-reveal>
            <legend>Livraison</legend>
            <div class="fields">
              ${field('address', 'Adresse', 'text', 'street-address', 'full')}
              ${field('zip', 'Code postal', 'text', 'postal-code')}
              ${field('city', 'Ville', 'text', 'address-level2')}
              <div class="field full"><select id="country" name="country" autocomplete="country-name"><option>France</option><option>Belgique</option><option>Suisse</option><option>Luxembourg</option></select><label for="country">Pays</label></div>
            </div>
            <div class="ship-opts" style="margin-top:18px">
              <label class="ship-opt"><input type="radio" name="ship" value="standard" checked><div><b>Colissimo</b><small>3 à 4 jours ouvrés · offerte dès 35 €</small></div><span id="shipStd"></span></label>
              <label class="ship-opt"><input type="radio" name="ship" value="express"><div><b>Lune Express</b><small>Livrée en 24 h, avant le lever de la lune</small></div><span>${euro(SHIP.express)}</span></label>
            </div>
            <label class="ship-opt" style="margin-top:12px"><input type="checkbox" id="isGift"><div><b>C'est un cadeau 🎁</b><small>Emballage bleu nuit + carte manuscrite offerts</small></div></label>
            <div class="field full" id="giftMsgWrap" style="display:none;margin-top:12px"><input id="giftMsg" placeholder=" " maxlength="140"><label for="giftMsg">Votre petit mot (140 caractères)</label></div>
          </fieldset>

          <fieldset class="fieldset" data-reveal>
            <legend>Paiement</legend>
            <div class="ccard-wrap">
              <div class="ccard" id="ccard">
                <div class="ccard__face">
                  ${ART.astrolabe()}
                  <div class="ccard__row"><span class="ccard__chip"></span><span class="ccard__brand">SELENE</span></div>
                  <div class="ccard__num" id="ccNum">•••• •••• •••• ••••</div>
                  <div class="ccard__row"><div><small>Titulaire</small><span id="ccName">VOTRE NOM</span></div><div><small>Expire</small><span id="ccExp">MM/AA</span></div></div>
                </div>
                <div class="ccard__face ccard__back"><div class="ccard__strip"></div><div class="ccard__cvc" id="ccCvc">•••</div><p class="small" style="padding:0 24px;opacity:.6">Carte de démonstration — aucun débit réel.</p></div>
              </div>
              <p class="test-hint">Carte test : <code>4242 4242 4242 4242</code> · n'importe quelle date future · n'importe quel CVC. <br>Pour tester un refus : <code>4000 0000 0000 0002</code></p>
            </div>
            <div class="fields">
              ${field('cardname', 'Nom sur la carte', 'text', 'cc-name', 'full')}
              ${field('cardnum', 'Numéro de carte', 'text', 'cc-number', 'full', 'inputmode="numeric" maxlength="19"')}
              ${field('exp', 'Expiration (MM/AA)', 'text', 'cc-exp', '', 'inputmode="numeric" maxlength="5"')}
              ${field('cvc', 'CVC', 'text', 'cc-csc', '', 'inputmode="numeric" maxlength="4"')}
            </div>
          </fieldset>
          <button class="btn btn--block" type="submit" id="payBtn">Payer <span id="payTotal"></span></button>
          <p class="small muted" style="text-align:center;margin-top:12px">🔒 Paiement simulé : aucune donnée n'est envoyée, rien n'est débité.</p>
        </form>

        <aside class="summary" data-reveal="right">
          <h2>Récapitulatif</h2>
          <div id="sumLines"></div>
          <form class="promo" id="promoForm"><input id="promoInput" placeholder="Code promo" aria-label="Code promo"><button class="btn btn--small btn--ghost" type="submit">Appliquer</button></form>
          <p class="promo-msg" id="promoMsg"></p>
          <div class="totals" id="sumTotals"></div>
        </aside>
      </div>
    </div></section>`;
  };
  function field(id, label, type, ac, cls = '', extra = '') {
    return `<div class="field ${cls}"><input id="${id}" name="${id}" type="${type}" autocomplete="${ac}" placeholder=" " ${extra}><label for="${id}">${label}</label><span class="err" id="${id}Err"></span></div>`;
  }
  function shipMethod() { const r = $('input[name="ship"]:checked'); return r ? r.value : 'standard'; }
  function renderSummary() {
    if (!$('#sumLines')) return;
    if (!cart.items.length) { route(); return; }
    $('#sumLines').innerHTML = cart.items.map(lineHTML).join('');
    const t = cart.totals(shipMethod());
    $('#sumTotals').innerHTML = `
      <div><span>Sous-total</span><span>${euro(t.sub)}</span></div>
      ${t.discount ? `<div style="color:var(--menthe)"><span>${PROMO.code} (−10 %)</span><span>− ${euro(t.discount)}</span></div>` : ''}
      <div><span>Livraison</span><span>${t.ship ? euro(t.ship) : 'Offerte'}</span></div>
      <div class="grand"><span>Total</span><span>${euro(t.total)}</span></div>`;
    $('#payTotal').textContent = '· ' + euro(t.total);
    const std = cart.totals('standard').ship;
    $('#shipStd').textContent = std ? euro(std) : 'Offerte';
  }
  const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
  views.checkout.after = () => {
    if (!cart.items.length) return;
    renderSummary();
    $$('input[name="ship"]').forEach(r => r.addEventListener('change', renderSummary));
    $('#isGift').addEventListener('change', e => { $('#giftMsgWrap').style.display = e.target.checked ? 'grid' : 'none'; });
    if (cart.promo) { $('#promoInput').value = cart.promo; $('#promoMsg').textContent = 'Code appliqué : −10 % sous la pleine lune ✦'; $('#promoMsg').className = 'promo-msg ok'; }
    $('#promoForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#promoInput').value.trim().toUpperCase(), m = $('#promoMsg');
      if (v === PROMO.code) { cart.promo = v; cart.save(); m.textContent = 'Code appliqué : −10 % sous la pleine lune ✦'; m.className = 'promo-msg ok'; const r = $('#promoInput').getBoundingClientRect(); FX.burst(r.right - 20, r.top + 20, 18); }
      else { cart.promo = null; cart.save(); m.textContent = v ? 'Ce code ne brille pas… (indice : touchez la lune)' : ''; m.className = 'promo-msg ko'; }
      renderSummary();
    });
    const card = $('#ccard');
    const num = $('#cardnum'), exp = $('#exp'), cvc = $('#cvc'), cname = $('#cardname');
    num.addEventListener('input', () => {
      const d = num.value.replace(/\D/g, '').slice(0, 16);
      num.value = d.replace(/(.{4})/g, '$1 ').trim();
      $('#ccNum').textContent = (d + '•'.repeat(16 - d.length)).replace(/(.{4})/g, '$1 ').trim();
    });
    exp.addEventListener('input', () => {
      let d = exp.value.replace(/\D/g, '').slice(0, 4);
      if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
      exp.value = d; $('#ccExp').textContent = d || 'MM/AA';
    });
    cvc.addEventListener('input', () => { cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4); $('#ccCvc').textContent = cvc.value.replace(/./g, '•') || '•••'; });
    cname.addEventListener('input', () => { $('#ccName').textContent = cname.value.toUpperCase() || 'VOTRE NOM'; });
    cvc.addEventListener('focus', () => card.classList.add('is-flipped'));
    cvc.addEventListener('blur', () => card.classList.remove('is-flipped'));
    $$('#checkoutForm input').forEach(i => i.addEventListener('input', () => { i.closest('.field')?.classList.remove('is-error'); const er = $('#' + i.id + 'Err'); if (er) er.textContent = ''; }));

    $('#checkoutForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = id => ($('#' + id).value || '').trim();
      const errors = {};
      if (!v('firstname')) errors.firstname = 'Votre prénom, s’il vous plaît';
      if (!v('lastname')) errors.lastname = 'Votre nom aussi';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errors.email = 'Adresse e-mail invalide';
      if (v('address').length < 5) errors.address = 'Adresse trop courte';
      if (!/^\d{4,5}$/.test(v('zip'))) errors.zip = '4 ou 5 chiffres';
      if (!v('city')) errors.city = 'Ville manquante';
      if (!v('cardname')) errors.cardname = 'Nom du titulaire manquant';
      const digits = v('cardnum').replace(/\D/g, '');
      if (digits.length !== 16 || !luhn(digits)) errors.cardnum = 'Numéro invalide (essayez 4242 4242 4242 4242)';
      const m = v('exp').match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) errors.exp = 'Format MM/AA';
      else { const now = new Date(), y = 2000 + +m[2]; if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) errors.exp = 'Carte expirée'; }
      if (!/^\d{3,4}$/.test(v('cvc'))) errors.cvc = '3 chiffres';
      $$('.field.is-error').forEach(f => f.classList.remove('is-error'));
      Object.entries(errors).forEach(([k, msg]) => { $('#' + k).closest('.field').classList.add('is-error'); $('#' + k + 'Err').textContent = msg; });
      if (Object.keys(errors).length) {
        $('#' + Object.keys(errors)[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
        FX.toast('Quelques champs demandent encore un peu de lumière');
        return;
      }
      const overlay = document.createElement('div');
      overlay.className = 'paying';
      overlay.innerHTML = `<div class="paying__moon"></div><p id="payMsg">Séléné vérifie votre paiement…</p><small>Simulation — aucun débit</small>`;
      document.body.appendChild(overlay);
      const msgs = ['Connexion à la banque des étoiles…', 'Alignement des planètes…', 'Allumage de la mèche…'];
      let k = 0; const it = setInterval(() => { const pm = $('#payMsg'); if (pm) pm.textContent = msgs[k++ % msgs.length]; }, 900);
      setTimeout(() => {
        clearInterval(it);
        if (digits === '4000000000000002') {
          overlay.remove();
          $('#cardnum').closest('.field').classList.add('is-error');
          $('#cardnumErr').textContent = 'Paiement refusé par la banque (simulation). Essayez 4242 4242 4242 4242.';
          $('#cardnum').scrollIntoView({ behavior: 'smooth', block: 'center' });
          FX.toast('🌧️ Nuage passager : paiement refusé (simulation)');
          return;
        }
        const t = cart.totals(shipMethod());
        store.set('selene-last-order', {
          id: 'SEL-' + Date.now().toString(36).toUpperCase().slice(-6),
          date: new Date().toISOString(), name: v('firstname'), email: v('email'), city: v('city'),
          ship: shipMethod(), gift: $('#isGift').checked, giftMsg: v('giftMsg'),
          items: cart.items.map(i => ({ ...i, name: byId(i.id).name, price: byId(i.id).sizes[i.size] })),
          totals: t, last4: digits.slice(-4)
        });
        cart.clear();
        overlay.remove();
        go('#/merci');
      }, 2800);
    });
  };

  /* ---------- Merci ---------- */
  views.thanks = () => {
    const o = store.get('selene-last-order', null);
    if (!o) return `<section class="page notfound"><div><h1 data-split>Aucune <em>commande</em></h1><a class="btn" href="#/boutique" data-link>Boutique</a></div></section>`;
    const first = byId(o.items[0]?.id) || products[1];
    const eta = new Date(Date.now() + (o.ship === 'express' ? 1 : 4) * 864e5).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
    <section class="thanks" id="thanks">
      <div>
        <div class="thanks__art" id="thanksArt">${ART.astrolabe()}${archFrame(first.img, 'Bougie ' + first.name, 'Arcane ' + first.num)}</div>
        <span class="eyebrow" data-reveal>Commande confirmée</span>
        <h1 data-split>Merci, <em>${escapeHTML(o.name)}.</em></h1>
        <p data-reveal>Votre commande est entre les mains de Séléné. Un e-mail de confirmation (imaginaire) part vers <b>${escapeHTML(o.email)}</b>. Arrivée estimée : <b>${eta}</b>${o.gift ? ', joliment emballée 🎁' : ''}.</p>
        <div class="order-box" data-reveal>
          <div class="row"><span>N° de commande</span><span class="order-id">${o.id}</span></div>
          ${o.items.map(i => `<div class="row"><span>${i.qty} × ${i.name} (${sizes[i.size].label})</span><span>${euro(i.price * i.qty)}</span></div>`).join('')}
          ${o.totals.discount ? `<div class="row"><span>Réduction</span><span>− ${euro(o.totals.discount)}</span></div>` : ''}
          <div class="row"><span>Livraison</span><span>${o.totals.ship ? euro(o.totals.ship) : 'Offerte'}</span></div>
          <div class="row" style="font-family:var(--serif);font-size:1.4rem;border-top:1px solid var(--ligne);margin-top:8px;padding-top:12px"><span>Total payé</span><span>${euro(o.totals.total)}</span></div>
          <p class="small muted" style="margin-top:10px">Carte •••• ${o.last4} · Paiement simulé, aucun débit.</p>
        </div>
        <a class="btn" href="#/boutique" data-link>Continuer la balade</a>
      </div>
    </section>`;
  };
  views.thanks.after = () => {
    const box = $('#thanks'); if (!box) return;
    FX.fireflies(box, 40);
    setTimeout(() => { const a = $('#thanksArt'); if (!a) return; a.classList.add('lit'); const r = a.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height * .3, 26); }, 900);
  };

  /* ---------- Oracle : tirage de cartes ---------- */
  const QUIZ = [
    { q: 'Ta nuit idéale ?', a: [
      ['Plaid, série & chocolat chaud', 'Le cocon absolu', { 'clair-de-lune': 2 }],
      ['Une fenêtre ouverte sur un soir de printemps', 'Les fleurs blanches, l’air tiède', { neroli: 2, 'jardin-de-minuit': 1 }],
      ['Des draps frais et dix heures de sommeil', 'Le luxe, le vrai', { 'nuit-blanche': 2 }],
      ['Un dîner aux chandelles', 'Romantique, mais pas sage', { 'jardin-de-minuit': 2 }]] },
    { q: 'Choisis une lumière.', a: [
      ['La pleine lune', 'Ronde, dorée, rassurante', { 'clair-de-lune': 2 }],
      ['Le premier croissant', 'Fin, frais, plein de promesses', { 'nuit-blanche': 2 }],
      ['L’heure bleue', 'Juste après le coucher du soleil', { neroli: 2 }],
      ['La brume sur un lac', 'Fraîche et silencieuse', { brume: 2, 'nuit-blanche': 1 }]] },
    { q: 'Et dans ta tasse, ce soir ?', a: [
      ['Un thé vert à la menthe', 'Frais, pour y voir clair', { brume: 3 }],
      ['Une infusion, puis au lit', 'Sage comme une image', { 'nuit-blanche': 2 }],
      ['Un verre de rosé', 'Entre amis, sous les fleurs', { 'jardin-de-minuit': 2 }],
      ['Un lait chaud à la fleur d’oranger', 'Comme chez mamie', { neroli: 2, 'clair-de-lune': 1 }]] }
  ];
  views.oracle = () => `
    <section class="page oracle"><div class="wrap oracle__card">
      <div id="oracleBox">
        <div class="spread">${ART.cardBack()}${ART.cardBack()}${ART.cardBack()}</div>
        <span class="eyebrow" data-reveal>L'oracle de Séléné</span>
        <h1 data-split>Quel parfum <em>es-tu ?</em></h1>
        <p class="muted" data-reveal>Trois questions, une carte retournée. La lune ne se trompe (presque) jamais.</p>
        <button class="btn" id="oracleStart" style="margin-top:30px" data-reveal>Tirer les cartes</button>
      </div>
    </div></section>`;
  views.oracle.after = () => {
    const box = $('#oracleBox'); let step = 0; const score = {};
    const show = () => {
      if (step >= QUIZ.length) return result();
      const Q = QUIZ[step];
      box.innerHTML = `<div class="oracle__q"><span class="eyebrow">Carte ${['I', 'II', 'III'][step]} / III</span><h2>${Q.q}</h2>
        <div class="oracle__opts">${Q.a.map((a, i) => `<button class="oracle__opt" data-o="${i}"><b>${a[0]}</b><span>${a[1]}</span></button>`).join('')}</div>
        <div class="oracle__progress">${QUIZ.map((_, i) => ART.phaseGlyph(i < step ? .5 : i === step ? .25 : 0, { size: 20 })).join('')}</div></div>`;
      $$('[data-o]', box).forEach(b => b.addEventListener('click', e => {
        Object.entries(Q.a[+b.dataset.o][2]).forEach(([k, v]) => score[k] = (score[k] || 0) + v);
        FX.burst(e.clientX, e.clientY, 12, ['#d9b26a', '#f3ecd6', '#ffb547']);
        step++; show();
      }));
    };
    const result = () => {
      const id = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
      const p = byId(id), s = defSize(p);
      box.innerHTML = `<div class="oracle__result">
        <span class="eyebrow">Séléné a tiré pour toi…</span>
        <div class="reveal-card" id="revealCard"><div class="reveal-card__inner">${ART.cardBack()}${tarotCard(p, { tag: 'div' })}</div></div>
        <h2 style="opacity:0" id="revealName">${p.name}</h2>
        <p class="pdp__tag" style="max-width:520px;opacity:0" id="revealTag">${p.tagline}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
          <button class="btn" data-add="${p.id}" data-size="${s}">L'adopter · ${euro(p.sizes[s])}</button>
          <a class="btn btn--ghost" href="#/produit/${p.id}" data-link>La découvrir</a>
        </div>
        <button class="link-arrow" id="oracleAgain" style="margin-top:10px">Retirer les cartes <span>↺</span></button></div>`;
      setTimeout(() => {
        const rc = $('#revealCard'); if (!rc) return;
        rc.classList.add('is-flipped');
        setTimeout(() => {
          ['#revealName', '#revealTag'].forEach((s2, i) => { const el = $(s2); if (el) el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: i * 150, fill: 'forwards', easing: 'cubic-bezier(.22,1,.36,1)' }); });
          const r = rc.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 34);
        }, 900);
      }, 700);
      $('#oracleAgain').addEventListener('click', () => { step = 0; Object.keys(score).forEach(k => delete score[k]); show(); });
    };
    $('#oracleStart').addEventListener('click', show);
  };

  /* ---------- Histoire ---------- */
  views.story = () => `
    <section class="story-hero">
      <div class="story-hero__moon" aria-hidden="true"></div>
      ${ART.astrolabe({ text: 'ΣΕΛΗΝΗ ✦ DÉESSE DE LA LUNE ✦ SŒUR D’HÉLIOS ET D’ÉOS ✦ ΣΕΛΗΝΗ ✦ DÉESSE DE LA LUNE ✦ ' })}
      <div>
        <span class="eyebrow" data-reveal>La légende</span>
        <h1 data-split>Σελήνη <br><em>Séléné</em></h1>
        <p data-reveal style="--d:.6s">Chaque soir, la déesse de la Lune attelle ses chevaux d'argent et traverse le ciel pour veiller sur ceux qui ne dorment pas encore.</p>
      </div>
    </section>
    <section class="section"><div class="wrap chapters">
      <article class="chapter">
        <div class="chapter__img" data-reveal="left">${archFrame('assets/img/flamme-seule.jpg', "Une flamme de bougie dans l'obscurité", 'Chapitre I', 'data-parallax="0.08"')}</div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre I</span>
          <h2 data-split>Une lumière <em>dans le noir</em></h2>
          <p data-reveal>Dans la mythologie grecque, Séléné est la sœur d'Hélios, le Soleil, et d'Éos, l'Aurore. Lui éclaire les jours ; elle, les nuits. Pas pour les chasser — pour les rendre douces.</p>
          <p data-reveal>C'est exactement ce qu'on attend d'une bougie : pas d'éblouir, mais d'accompagner. Une lumière à hauteur de visage, qui transforme une chambre en refuge.</p>
        </div>
      </article>
      <article class="chapter">
        <div class="chapter__img" data-reveal="right">${archFrame('assets/img/amb-bleu.jpg', 'Bougies allumées dans la pénombre bleue', 'Chapitre II', 'data-parallax="0.08"')}</div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre II</span>
          <h2 data-split>L’heure <em>bleue</em></h2>
          <p data-reveal>Il y a un moment, juste après le coucher du soleil, où le ciel devient d'un bleu profond et où tout ralentit. C'est l'heure que Séléné préfère : celle où l'on allume la première bougie.</p>
          <p data-reveal>Nos parfums sont pensés pour cet instant-là : le linge propre, la vanille, les fleurs de nuit, le néroli, la menthe fraîche. Des classiques, mais faits bien.</p>
        </div>
      </article>
      <article class="chapter">
        <div class="chapter__img" data-reveal="left">${archFrame('assets/img/atelier.jpg', 'Bougies artisanales en cire de soja', 'Chapitre III', 'data-parallax="0.08"')}</div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre III</span>
          <h2 data-split>Simple, <em>propre</em>, abordable</h2>
          <p data-reveal>Cire 100 % végétale, mèche en coton, coulée à la main, pot qu'on garde, colis sans plastique. Respecter la nature n'est pas une option : c'est le point de départ. Et un prix qui ne fait pas peur : une mini à 10 €, une classique entre 16 et 19 €.</p>
          <p data-reveal>Parce qu'une belle bougie, ça ne devrait pas être un luxe réservé aux grandes occasions. Un mardi soir, c'est une occasion.</p>
          <a class="btn" href="#/boutique" data-link style="margin-top:14px">Voir la collection</a>
        </div>
      </article>
    </div></section>
    <section class="section" style="padding-top:0">${ART.ornament()}<p class="big-quote" data-split style="margin-top:30px">« Quand la nuit tombe, <em>allumez quelque chose</em> qui vous ressemble. »</p></section>`;

  /* ---------- Nature : nos engagements ---------- */
  const INSIDE = [
    ['Cire de soja & colza', 'Végétale, renouvelable, biodégradable.'],
    ['Mèche en coton tressé', 'Sans plomb, sans âme métallique.'],
    ['Parfums conformes IFRA', 'Dosés avec soin, jamais en excès.'],
    ['Verre épais', 'Fait pour durer, puis pour servir encore.']
  ];
  const OUTSIDE = [
    ['Paraffine', 'Ce résidu du pétrole qui fume noir.'],
    ['Colorants', 'La cire garde sa couleur de lait.'],
    ['Plastique', 'Ni film, ni calage, ni ruban.'],
    ['Suremballage', 'Une boîte, un papier. C’est tout.']
  ];
  const CYCLE = [
    ['La plante', 'Soja et colza poussent au soleil.'],
    ['La cire', 'Fondue doucement, coulée à la main.'],
    ['La flamme', 'Lente et propre, des dizaines d’heures.'],
    ['Le pot', 'Lavé, gardé, rempli à nouveau.']
  ];
  const TIPS = [
    ['Deux heures, la première fois', 'Laissez fondre toute la surface : la cire brûle ensuite à plat, sans tunnel ni gaspillage.'],
    ['La mèche à 5 mm', 'Recoupée avant chaque allumage, elle ne fume pas et la bougie dure plus longtemps.'],
    ['Une seconde vie au pot', 'Un passage au congélateur, la cire restante se détache. Un peu d’eau chaude : il est neuf.']
  ];
  views.nature = () => `
    <section class="page nature-hero">
      <div class="nature-hero__orb" data-reveal="zoom" aria-hidden="true"><span></span><span></span><span></span></div>
      <span class="eyebrow" data-reveal>Nos engagements</span>
      <h1 data-split>Une lumière douce, <br><em>une empreinte légère.</em></h1>
      <p class="hero__lead" data-reveal style="--d:.5s">Une bougie ne devrait rien coûter à la forêt, à l’océan ni à l’air que l’on respire. Voici, sans détour, ce que nous mettons dans les nôtres — et ce que nous refusons d’y mettre.</p>
    </section>

    <section class="section"><div class="wrap">
      <div class="mirror">
        <div class="mirror__col mirror__col--in">
          <h2 data-reveal>Ce qu’il y a <em>dedans</em></h2>
          ${INSIDE.map(([t, d], i) => `<div class="mirror__item" data-reveal="left" style="--d:${i * .1}s"><b>${t}</b><span>${d}</span></div>`).join('')}
        </div>
        <div class="mirror__axis" aria-hidden="true"><i></i>${ART.phaseGlyph(.5, { size: 26 })}<i></i></div>
        <div class="mirror__col mirror__col--out">
          <h2 data-reveal>Ce qu’il n’y a <em>pas</em></h2>
          ${OUTSIDE.map(([t, d], i) => `<div class="mirror__item" data-reveal="right" style="--d:${i * .1}s"><b><s>${t}</s></b><span>${d}</span></div>`).join('')}
        </div>
      </div>
    </div></section>

    <section class="section cycle"><div class="wrap">
      <div class="section-head section-head--center">
        <span class="eyebrow" data-reveal>Le cycle</span>
        <h2 data-split>De la graine <em>au pot.</em></h2>
        <p class="muted" data-reveal>Une boucle, pas une ligne droite : rien ne finit vraiment à la poubelle.</p>
      </div>
      <div class="cycle__wheel" id="cycleWheel" data-reveal="zoom">
        <svg viewBox="-160 -160 320 320" aria-hidden="true">
          <circle r="130" class="cycle__track"/>
          <circle r="130" class="cycle__draw" pathLength="1"/>
          <circle r="3.2" class="cycle__comet"><animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path="M0 -130 A130 130 0 1 1 0 130 A130 130 0 1 1 0 -130"/></circle>
        </svg>
        <div class="cycle__heart"><img src="assets/img/flamme-seule.jpg" alt="Une flamme de bougie dans la nuit" loading="lazy"></div>
        ${CYCLE.map(([t], i) => `<span class="cycle__node cycle__node--${i}"><i>${['I', 'II', 'III', 'IV'][i]}</i>${t}</span>`).join('')}
      </div>
      <div class="cycle__legend">
        ${CYCLE.map(([t, d], i) => `<div data-reveal style="--d:${i * .1}s"><span>${['I', 'II', 'III', 'IV'][i]}</span><b>${t}</b><p>${d}</p></div>`).join('')}
      </div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="section-head section-head--center">
        <span class="eyebrow" data-reveal>Faire durer</span>
        <h2 data-split>Moins gaspiller, <em>mieux brûler.</em></h2>
      </div>
      <div class="tips">
        ${TIPS.map(([t, d], i) => `<article class="tip" data-reveal style="--d:${i * .12}s">${ART.phaseGlyph([.25, .5, .75][i], { size: 30 })}<h3>${t}</h3><p>${d}</p></article>`).join('')}
      </div>
    </div></section>

    <section class="section" style="padding-top:0">
      ${ART.ornament()}
      <p class="big-quote" data-split style="margin-top:30px">« La plus belle lumière est celle <em>qui ne laisse rien derrière elle.</em> »</p>
      <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:44px" data-reveal>
        <a class="btn" href="#/boutique" data-link>Voir la collection</a>
        <a class="btn btn--ghost" href="#/histoire" data-link>Notre histoire</a>
      </div>
    </section>`;

  /* ---------- Crédits ---------- */
  views.credits = () => `
    <section class="page"><div class="wrap section" style="padding-top:30px">
      <div class="section-head section-head--center"><span class="eyebrow" data-reveal>Merci aux photographes</span><h1 style="font-size:clamp(3rem,8vw,6rem);font-weight:300" data-split>Crédits <em>photos</em></h1>
      <p class="muted" data-reveal>Toutes les photographies proviennent d'Unsplash et de Pexels, sous leurs licences respectives (utilisation libre, y compris commerciale). Le logo, l'astrolabe, les cartes, la brume animée et l'univers graphique sont des créations originales SELENE.</p></div>
      <div class="credits">${credits.map((c, i) => `
        <figure class="credit" data-reveal style="--d:${(i % 4) * .08}s">
          <img src="assets/img/${c.file}" alt="Photo de ${c.author}" loading="lazy">
          <div>Photo de <a href="${c.profile}" target="_blank" rel="noopener">${c.author}</a> sur <a href="${c.url}" target="_blank" rel="noopener">${c.site}</a></div>
        </figure>`).join('')}</div>
    </div></section>`;

  views.notfound = () => `<section class="page notfound"><div><div class="moon-mini" style="margin:0 auto 20px">${moonPhaseShade(.02)}</div><span class="eyebrow">Erreur 404</span><h1 data-split>Nuit <em>sans lune</em></h1><p class="muted" style="margin:20px 0 30px">Cette page s'est perdue dans les étoiles.</p><a href="#/" class="btn" data-link>Retour à l'accueil</a></div></section>`;

  /* =========================================================
     Routeur
     ========================================================= */
  let booted = false;
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
  }
  function route() {
    const { parts, q } = parse();
    let view, arg, anchor;
    switch (parts[0]) {
      case undefined: view = 'home'; break;
      case 'rituel': view = 'home'; anchor = 'engagements'; break;
      case 'nature': view = 'nature'; break;
      case 'boutique': view = 'shop'; break;
      case 'produit': view = 'product'; arg = parts[1]; break;
      case 'commande': view = 'checkout'; break;
      case 'merci': view = 'thanks'; break;
      case 'oracle': view = 'oracle'; break;
      case 'histoire': view = 'story'; break;
      case 'credits': view = 'credits'; break;
      default: view = 'notfound';
    }
    dockReset();
    dock.classList.toggle('is-away', view === 'checkout' || view === 'thanks');
    app.innerHTML = views[view](q, arg);
    app.dataset.view = view;
    FX.scrollTo(0, { immediate: true });
    views[view].after && views[view].after(q, arg);
    if (booted) FX.scan(app);
    setupScrollFx();
    const titles = { home: 'Bougies végétales coulées à la main', shop: 'Boutique', checkout: 'Commande', thanks: 'Merci', oracle: "L'oracle", story: 'La légende de Séléné', credits: 'Crédits photos', nature: 'Nos engagements pour la nature', notfound: 'Page introuvable' };
    document.title = 'SELENE — ' + (view === 'product' && byId(arg) ? byId(arg).name : titles[view]);
    $$('.nav__links a, .dock a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#/' + (parts[0] || '')));
    if (anchor) setTimeout(() => { const el = document.getElementById(anchor); if (el) FX.scrollTo(el, { offset: -20 }); }, 200);
    onScroll();
  }
  function go(hash, x = innerWidth / 2, y = innerHeight / 2) {
    closeCart(); closeMenu();
    FX.eclipse(x, y, () => { if (location.hash === hash) route(); else location.hash = hash; });
  }
  addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const href = a.getAttribute('href');
    if (a.hasAttribute('data-scroll') || !href.startsWith('#/')) {
      const el = document.getElementById(href.slice(1));
      if (el) { e.preventDefault(); FX.scrollTo(el, { offset: -60 }); }
      return;
    }
    e.preventDefault();
    go(href, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  });

  const burger = $('#burger'), links = $('#navLinks');
  function closeMenu() { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => { const open = links.classList.toggle('is-open'); burger.setAttribute('aria-expanded', open); });

  /* =========================================================
     Scroll : nav, phase, parallaxe, rituel, galerie
     ========================================================= */
  const nav = $('#nav'), phase = $('#phaseShadow');
  let lastY = 0, parallaxEls = [], ticking = false, heroV = null, heroT = null;
  function setupScrollFx() { parallaxEls = $$('[data-parallax]', app); heroV = $('#heroVisual'); heroT = $('#heroText'); }
  function onScroll() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    FX.setScroll(y);
    nav.classList.toggle('is-scrolled', y > 30);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !links.classList.contains('is-open'));
    dock.classList.toggle('is-up', y > 240 || !app.dataset.view || app.dataset.view !== 'home');
    lastY = y;
    phase.setAttribute('cx', (23 + (h > 0 ? Math.min(1, y / h) : 1) * 24).toFixed(2));
    if (heroV) {
      const p = Math.min(1, y / innerHeight);
      heroV.style.transform = `translate3d(0, ${(y * .35).toFixed(1)}px, 0) scale(${(1 - p * .08).toFixed(3)})`;
      heroV.style.opacity = (1 - p * .9).toFixed(3);
      heroV.style.filter = p > .01 ? `blur(${(p * 6).toFixed(2)}px)` : '';
      heroT.style.transform = `translate3d(0, ${(y * .18).toFixed(1)}px, 0)`;
      heroT.style.opacity = (1 - p * 1.3).toFixed(3);
    }
    for (const el of parallaxEls) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--py', ((r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax)).toFixed(1) + 'px');
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- Newsletter ---------- */
  $('#newsletter').addEventListener('submit', e => {
    e.preventDefault();
    const r = e.target.querySelector('button').getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top, 20);
    FX.toast('🌕 Inscrit·e ! Rendez-vous à la prochaine pleine lune.');
    e.target.reset();
  });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Démarrage ---------- */
  renderCart();
  route();
  const loader = $('#loader');
  let hidden = false;
  const hide = () => {
    if (hidden) return; hidden = true;
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    booted = true; FX.scan(app); FX.pulse(.25, 900);
    setTimeout(() => loader.remove(), 1400);
  };
  loader.addEventListener('click', hide);
  let seen = false;
  try { seen = sessionStorage.getItem('selene-intro') === '1'; sessionStorage.setItem('selene-intro', '1'); } catch { /* stockage indisponible */ }
  if (FX.reduce || seen) { loader.style.transition = 'opacity .5s'; hide(); } else setTimeout(hide, 3300);
})();
