/* SELENE — application (routeur, boutique, panier, commande) */
(function () {
  const { products, sizes, promo: PROMO, shipping: SHIP, credits } = window.SELENE;
  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const euro = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const byId = id => products.find(p => p.id === id);
  const minPrice = p => Math.min(...Object.values(p.sizes));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
  };

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
  function openCart() { renderCart(); drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); }
  function closeCart() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); }
  $('#cartBtn').addEventListener('click', openCart);
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCart(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  function lineHTML(i) {
    const p = byId(i.id), price = p.sizes[i.size];
    return `
      <div class="line">
        <a class="line__thumb" href="#/produit/${p.id}" data-link>${FX.candleSVG(p, { label: false })}</a>
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
    const body = $('#drawerBody'), foot = $('#drawerFoot');
    if (!cart.items.length) {
      body.innerHTML = `<div class="empty">${FX.candleSVG(products[1], { lit: false, label: false })}<p>Votre panier attend sa première flamme.</p><a href="#/boutique" class="btn btn--small" data-link>Découvrir la collection</a></div>`;
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
    const p = byId(id);
    FX.toast(`✦ <b>${p.name}</b> (${sizes[size].label}) a rejoint votre panier`);
  }

  /* =========================================================
     Composants
     ========================================================= */
  function cardHTML(p, i = 0) {
    const from = Object.keys(p.sizes).length > 1 ? 'dès ' : '';
    const defSize = p.sizes.classique ? 'classique' : Object.keys(p.sizes)[0];
    return `
    <article class="card" style="--glow:${p.accent}; --i:${i}">
      <a class="card__link" href="#/produit/${p.id}" data-link aria-label="Voir ${p.name}"></a>
      <div class="card__stage">
        <div class="card__photo" style="background-image:url('${p.img}')"></div>
        ${p.badge ? `<span class="card__badge ${p.signature ? 'card__badge--sig' : ''}">${p.badge}</span>` : ''}
        <span class="card__phase">${p.phase}</span>
        <div class="card__candle">${FX.candleSVG(p)}</div>
      </div>
      <div class="card__meta">
        <div><h3 class="card__name">${p.name}</h3><p class="card__family">${p.family}</p></div>
        <p class="card__price">${from}${euro(minPrice(p))}</p>
      </div>
      <p class="card__tag">${p.tagline}</p>
      <div class="card__actions">
        <button class="btn btn--small" data-add="${p.id}" data-size="${defSize}">Ajouter · ${euro(p.sizes[defSize])}</button>
      </div>
    </article>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    addToCart(b.dataset.add, b.dataset.size, 1, b);
  });

  const icon = {
    leaf: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15Zm0 0 7-7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    wick: '<svg viewBox="0 0 24 24"><path d="M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8Zm0 12v6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    hand: '<svg viewBox="0 0 24 24"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-5a1.5 1.5 0 0 1 3 0v6m0-3a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7s-6-2-7-5l-2-4a1.5 1.5 0 0 1 2.6-1.4L7 14" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    jar: '<svg viewBox="0 0 24 24"><path d="M7 4h10v3H7zM6 7h12v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 13c2-2 4 2 6 0" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
  };

  /* =========================================================
     Vues
     ========================================================= */
  const views = {};

  /* ---------- Accueil ---------- */
  views.home = () => {
    const sig = products.filter(p => p.signature);
    return `
    <section class="hero" id="hero">
      <div class="hero__photo" aria-hidden="true"></div>
      <div class="hero__light" aria-hidden="true"></div>
      <div class="hero__moon" id="moon" data-parallax="-0.25" title="Touchez la lune…"></div>
      <div class="hero__candle" aria-hidden="true" data-parallax="0.15">${FX.candleSVG(byId('zahr'))}</div>
      <div class="hero__inner">
        <span class="eyebrow" data-reveal>Bougies naturelles · coulées à la main</span>
        <h1 data-split>Allume <em>la nuit.</em></h1>
        <p class="hero__lead" data-reveal style="--d:.5s">Des bougies en cire végétale nées sous le regard de Séléné, déesse de la Lune. Pour vos soirées à vous — ou pour quelqu'un qui le mérite.</p>
        <div class="hero__cta" data-reveal style="--d:.7s">
          <a href="#/boutique" class="btn" data-link>Découvrir la collection</a>
          <a href="#/oracle" class="btn btn--ghost" data-link>Quel parfum es-tu ?</a>
        </div>
        <div class="hero__badges" data-reveal style="--d:.9s"><span>100 % cire végétale</span><span>Mèche coton</span><span>Pot réutilisable</span><span>Dès 10 €</span></div>
      </div>
      <a href="#collection" class="scroll-cue" data-scroll aria-label="Défiler"><span>Défiler</span><i></i></a>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee__track">
      ${Array(2).fill(['Coulées à la main', 'Sans paraffine', 'Fleur d’oranger de Marrakech', 'Thé à la menthe', 'Vanille de pleine lune', 'Pot réutilisable', 'Code PLEINELUNE : −10 %']
        .map(t => `<span>${t}</span>`).join('')).join('')}
    </div></div>

    <section class="section" id="collection">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow" data-reveal>La collection</span>
          <h2 data-split>Six lunes, <em>six humeurs.</em></h2>
          <p class="muted" data-reveal style="--d:.3s">Des parfums qu'on aime tout de suite, et deux signatures venues du Maroc. Survolez une bougie pour voir sa nuit.</p>
        </div>
        <div class="grid-products">${products.map(cardHTML).join('')}</div>
      </div>
    </section>

    <section class="section maroc" id="maroc">
      <div class="maroc__pattern" style="background-image:${FX.zelligeBg}"></div>
      <div class="wrap maroc__grid">
        <div class="maroc__visual" data-reveal="left">
          ${FX.khatamSVG()}
          <div class="arch"><img src="assets/img/zahr.jpg" alt="Bougie allumée dans un pot en verre, dans la pénombre" data-parallax="0.08" loading="lazy"></div>
          <div class="arch arch--small"><img src="assets/img/atay.jpg" alt="Théière marocaine en argent et verres de thé à la menthe" loading="lazy"></div>
        </div>
        <div>
          <span class="eyebrow" data-reveal>Signatures du Maroc</span>
          <h2 style="font-size:clamp(2.4rem,6vw,4.4rem);margin:18px 0 0" data-split>Une nuit à <em>Marrakech</em>, dans un pot.</h2>
          <p class="muted" data-reveal>Nos deux parfums signature racontent les soirs d'été là-bas : les orangers en fleur dans les riads, et le thé qu'on sert trois fois, de très haut, pour faire mousser.</p>
          <div class="maroc__list">
            ${sig.map((p, i) => `
              <a class="maroc__item" href="#/produit/${p.id}" data-link data-reveal style="--d:${.15 * i}s; --c:${p.accent}">
                <span class="maroc__dot"></span>
                <div><h3>${p.name} <span class="arabic">${p.id === 'zahr' ? 'زهر' : 'أتاي'}</span></h3><p>${p.family} — ${p.notes.coeur}</p></div>
                <span class="card__price">${euro(minPrice(p))}</span>
              </a>`).join('')}
          </div>
          <a class="link-arrow" href="#/boutique?f=maroc" data-link>Voir les signatures <span>→</span></a>
        </div>
      </div>
    </section>

    <section class="ritual" id="rituel" aria-label="Le rituel SELENE">
      <div class="ritual__sticky">
        <div class="ritual__stage">
          <div class="ritual__orbit" id="orbit"><i></i></div>
          <div class="ritual__halo"></div>
          <div class="ritual__candle" id="ritualCandle">${FX.candleSVG(byId('clair-de-lune'))}</div>
        </div>
        <div>
          <span class="eyebrow">Le rituel · faites défiler, la bougie se consume</span>
          <div class="ritual__steps">
            ${[
              ['01', 'Cire 100 % végétale', 'Un mélange de cire de soja et de colza, sans paraffine ni dérivé du pétrole. Elle brûle lentement, proprement, et diffuse le parfum à froid comme à chaud.'],
              ['02', 'Mèche en coton', 'Une mèche tressée en coton naturel, sans plomb ni zinc. Une flamme calme, régulière, qui danse sans fumer. Pensez à la recouper à 5 mm avant chaque allumage.'],
              ['03', 'Coulée à la main', 'Chaque bougie est coulée à la main, en petites séries, puis laissée au repos deux semaines pour que le parfum s’épanouisse. Comme la lune : elle prend son temps.'],
              ['04', 'Un pot pour la suite', 'Une fois la dernière flamme éteinte, le pot devient verre à thé, pot à crayons, mini-jardinière ou maison pour votre prochaine bougie. Rien ne se perd.']
            ].map((s, i) => `
              <div class="ritual__step ${i === 0 ? 'is-active' : ''}" data-step="${i}">
                <span class="num">${s[0]}</span><h3>${s[1]}</h3><p>${s[2]}</p>
              </div>`).join('')}
          </div>
          <div class="ritual__bar">${'<span><i></i></span>'.repeat(4)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap stats">
        <div class="stat" data-reveal><b data-count="100" data-suffix=" %">0</b><span>Cire végétale</span></div>
        <div class="stat" data-reveal style="--d:.1s"><b data-count="45" data-suffix=" h">0</b><span>De douceur</span></div>
        <div class="stat" data-reveal style="--d:.2s"><b data-count="0" data-suffix=" g">0</b><span>De paraffine</span></div>
        <div class="stat" data-reveal style="--d:.3s"><b data-count="10" data-suffix=" €">0</b><span>Pour commencer</span></div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="section-head section-head--center">
          <span class="eyebrow" data-reveal>Ils ont allumé la nuit</span>
          <h2 data-split>Mots <em>doux</em></h2>
        </div>
        <div class="reviews">
          <div class="review" data-reveal><span class="stars">★★★★★</span><p>« Atay sent vraiment le thé de ma grand-mère à Fès. J'ai failli pleurer, j'en ai racheté deux. »</p><small>Yasmine, 24 ans</small></div>
          <div class="review" data-reveal style="--d:.12s"><span class="stars">★★★★★</span><p>« Offerte à ma coloc pour son anniv, elle me l'a volée… enfin, re-volée. Clair de Lune, c'est un câlin. »</p><small>Hugo, 27 ans</small></div>
          <div class="review" data-reveal style="--d:.24s"><span class="stars">★★★★★</span><p>« Le pot est devenu mon verre à brosses de maquillage. Joli, pas cher, et ça sent bon le propre. »</p><small>Inès, 21 ans</small></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="gift" data-reveal="zoom">
          <div class="gift__lanterns" id="lanterns"></div>
          <span class="eyebrow">Pour offrir</span>
          <h2 data-split>Le cadeau qui <em>éclaire</em> une soirée.</h2>
          <p>Le Coffret Phases réunit trois minis dans un écrin bleu nuit, avec une carte à écrire à la main. 27 €, et vous passez pour quelqu'un de très attentionné.</p>
          <a href="#/produit/coffret-phases" class="btn" data-link>Offrir le coffret</a>
        </div>
      </div>
    </section>`;
  };
  views.home.after = () => {
    FX.lanterns($('#lanterns'), 22);
    // Easter egg : touchez 3 fois la lune
    const moon = $('#moon'); let taps = 0, tt;
    moon.addEventListener('click', e => {
      taps++; clearTimeout(tt); tt = setTimeout(() => taps = 0, 1200);
      FX.burst(e.clientX, e.clientY, 14, ['#f3ecd6', '#c8b6ff', '#ffffff']);
      if (taps >= 3) {
        taps = 0; moon.classList.remove('eclipsed'); void moon.offsetWidth; moon.classList.add('eclipsed');
        FX.toast('🌑 Éclipse ! Séléné vous offre le code <b>PLEINELUNE</b> : −10 %');
      }
    });
    const hero = $('#hero');
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  };

  /* ---------- Boutique ---------- */
  const FILTERS = [
    ['tout', 'Tout', () => true],
    ['classiques', 'Les classiques', p => !p.signature && p.id !== 'coffret-phases'],
    ['maroc', 'Signatures Maroc', p => p.signature],
    ['cadeaux', 'Coffrets', p => p.id === 'coffret-phases']
  ];
  views.shop = (q) => {
    const f = FILTERS.find(x => x[0] === q.get('f')) ? q.get('f') : 'tout';
    return `
    <section class="page"><div class="wrap section" style="padding-top:30px">
      <div class="shop-head">
        <div>
          <span class="eyebrow" data-reveal>Boutique</span>
          <h1 data-split>La <em>collection</em></h1>
          <p class="muted" data-reveal>Mini 80 g dès 10 € · Classique 180 g de 16 à 19 € · Livraison offerte dès 35 €</p>
        </div>
        <div style="display:grid;gap:14px;justify-items:end">
          <div class="filters" role="tablist">${FILTERS.map(([k, l]) => `<button class="chip ${k === f ? 'is-on' : ''}" data-filter="${k}" role="tab" aria-selected="${k === f}">${l}</button>`).join('')}</div>
          <div class="field" style="min-width:220px">
            <select id="sort" aria-label="Trier"><option value="def">Notre sélection</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="az">De A à Z</option></select>
            <label for="sort">Trier par</label>
          </div>
        </div>
      </div>
      <div class="grid-products" id="shopGrid"></div>
    </div></section>`;
  };
  views.shop.after = (q) => {
    let f = q.get('f') || 'tout', sort = 'def';
    const draw = () => {
      let list = products.filter((FILTERS.find(x => x[0] === f) || FILTERS[0])[2]);
      if (sort === 'asc') list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      if (sort === 'desc') list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      $('#shopGrid').innerHTML = list.map(cardHTML).join('');
    };
    draw();
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
      f = b.dataset.filter;
      $$('[data-filter]').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
      history.replaceState(null, '', '#/boutique' + (f !== 'tout' ? '?f=' + f : ''));
      draw();
    }));
    $('#sort').addEventListener('change', e => { sort = e.target.value; draw(); });
  };

  /* ---------- Produit ---------- */
  views.product = (q, id) => {
    const p = byId(id);
    if (!p) return views.notfound();
    const keys = Object.keys(p.sizes);
    const sel = p.sizes.classique ? 'classique' : keys[0];
    const others = products.filter(x => x.id !== p.id).slice(0, 3);
    const gallery = [p.img, ...(p.signature ? ['assets/img/the-maroc.jpg'] : ['assets/img/hero-flamme.jpg']), 'assets/img/pilier.jpg'];
    return `
    <section class="page" style="--accent:${p.accent}"><div class="wrap section" style="padding-top:30px">
      <p class="small muted" data-reveal style="margin-bottom:24px"><a href="#/boutique" data-link>Boutique</a> · ${p.family} · ${p.name}</p>
      <div class="pdp">
        <div class="pdp__visual" data-reveal="zoom">
          <div class="pdp__stage" id="pdpStage">
            <div class="pdp__ring"></div>
            <p class="pdp__hint" id="pdpHint">Cliquez sur la flamme pour la souffler</p>
            ${FX.candleSVG(p)}
          </div>
          <div class="pdp__thumbs">${gallery.map((g, i) => `<img src="${g}" alt="Ambiance ${p.name} ${i + 1}" loading="lazy" data-zoom>`).join('')}</div>
        </div>
        <div class="pdp__info">
          <span class="eyebrow" data-reveal>${p.signature ? 'Signature Maroc · ' + p.family : p.family + ' · ' + p.phase}</span>
          <h1 data-split>${p.name}</h1>
          <p class="pdp__tag" data-reveal>${p.tagline}</p>
          <p class="pdp__price" data-reveal><span id="pdpPrice">${euro(p.sizes[sel])}</span><small>TTC</small></p>
          <p class="pdp__desc" data-reveal>${p.description}</p>
          <div data-reveal>
            <p class="small muted" style="letter-spacing:.2em;text-transform:uppercase">Format</p>
            <div class="sizes">${keys.map(k => `
              <button class="size ${k === sel ? 'is-on' : ''}" data-size-pick="${k}">
                <b>${sizes[k].label} · ${euro(p.sizes[k])}</b><span>${sizes[k].weight} · ${sizes[k].burn}</span>
              </button>`).join('')}</div>
            <div class="buy-row">
              <div class="qty"><button id="qMinus" aria-label="Moins">−</button><output id="qVal">1</output><button id="qPlus" aria-label="Plus">+</button></div>
              <button class="btn" id="buyBtn">Ajouter au panier</button>
            </div>
          </div>
          <div class="perks" data-reveal>
            <div class="perk">${icon.leaf}100 % cire végétale</div>
            <div class="perk">${icon.wick}Mèche en coton</div>
            <div class="perk">${icon.hand}Coulée à la main</div>
            <div class="perk">${icon.jar}Pot réutilisable</div>
          </div>
          <div class="notes">
            ${[['Tête', p.notes.tete], ['Cœur', p.notes.coeur], ['Fond', p.notes.fond]].map(([k, v], i) => `<div class="note" data-reveal style="--d:${i * .1}s"><span>${k}</span><p>${v}</p></div>`).join('')}
          </div>
          <div class="meters">
            ${[['Fraîcheur', p.profile.fraicheur], ['Douceur', p.profile.douceur], ['Intensité', p.profile.intensite]].map(([k, v]) => `
              <div class="meter"><span>${k}</span><div class="meter__bar"><i data-meter="${v}"></i></div><span>${v}%</span></div>`).join('')}
          </div>
          <details class="acc"><summary>Conseils d'allumage</summary><p>Laissez brûler 2 h la première fois, jusqu'à ce que toute la surface soit fondue : c'est ce qui évite l'effet « tunnel ». Recoupez la mèche à 5 mm avant chaque allumage, ne laissez jamais une bougie sans surveillance, et éteignez-la avec un éteignoir (ou le couvercle) plutôt qu'en soufflant.</p></details>
          <details class="acc"><summary>Composition</summary><p>Cire de soja et de colza, parfum (conforme IFRA), mèche en coton tressé. Sans paraffine, sans colorant. Pot en verre et couvercle réutilisables.</p></details>
          <details class="acc"><summary>Livraison & retours</summary><p>Expédition sous 48 h, livraison offerte dès 35 €. Retours gratuits sous 14 jours pour une bougie jamais allumée. (Prototype : aucune commande réelle n'est expédiée.)</p></details>
        </div>
      </div>
    </div></section>
    <section class="section" style="padding-top:0"><div class="wrap">
      <div class="section-head"><span class="eyebrow" data-reveal>Sous la même lune</span><h2 data-split>Vous aimerez <em>aussi</em></h2></div>
      <div class="grid-products">${others.map(cardHTML).join('')}</div>
    </div></section>`;
  };
  views.product.after = (q, id) => {
    const p = byId(id); if (!p) return;
    let size = p.sizes.classique ? 'classique' : Object.keys(p.sizes)[0], qty = 1;
    const price = $('#pdpPrice'), qv = $('#qVal');
    const update = () => { price.textContent = euro(p.sizes[size] * qty); qv.textContent = qty; };
    $$('[data-size-pick]').forEach(b => b.addEventListener('click', () => {
      size = b.dataset.sizePick;
      $$('[data-size-pick]').forEach(x => x.classList.toggle('is-on', x === b));
      price.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
      update();
    }));
    $('#qMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); update(); });
    $('#qPlus').addEventListener('click', () => { qty = Math.min(20, qty + 1); update(); });
    $('#buyBtn').addEventListener('click', e => addToCart(p.id, size, qty, e.currentTarget));
    // souffler / rallumer
    const stage = $('#pdpStage'), svg = stage.querySelector('.candle-svg'), hint = $('#pdpHint');
    svg.addEventListener('click', e => {
      const off = svg.classList.toggle('is-off');
      const fl = svg.querySelector('.flame').getBoundingClientRect(), sr = stage.getBoundingClientRect();
      if (off) { FX.smoke(stage, fl.left - sr.left + fl.width / 2, fl.top - sr.top + fl.height); hint.textContent = 'Fffff… Cliquez pour la rallumer'; }
      else { FX.burst(e.clientX, e.clientY, 16); hint.textContent = 'Et la lumière fut. Cliquez pour la souffler'; }
    });
    // zoom images
    $$('[data-zoom]').forEach(img => img.addEventListener('click', () => {
      const o = document.createElement('div');
      o.className = 'paying'; o.style.cursor = 'zoom-out';
      o.innerHTML = `<img src="${img.src}" alt="${img.alt}" style="max-width:min(900px,92vw);max-height:84vh;border-radius:18px;box-shadow:0 30px 100px rgba(0,0,0,.7)">`;
      o.addEventListener('click', () => o.remove());
      document.body.appendChild(o);
      o.firstElementChild.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
    }));
  };

  /* ---------- Commande ---------- */
  views.checkout = () => {
    if (!cart.items.length) {
      return `<section class="page notfound"><div><span class="eyebrow">Commande</span><h1 data-split>Rien à <em>allumer</em>…</h1><p class="muted" style="margin:20px 0 30px">Votre panier est vide pour le moment.</p><a href="#/boutique" class="btn" data-link>Aller à la boutique</a></div></section>`;
    }
    return `
    <section class="page"><div class="wrap section" style="padding-top:30px">
      <div class="checkout">
        <form id="checkoutForm" novalidate>
          <span class="eyebrow">Commande sécurisée · simulation</span>
          <h1 data-split>Presque <em>à vous.</em></h1>
          <div class="steps"><b>Panier</b> → <b>Informations</b> → <b>Paiement</b> → <span>Pleine lune</span></div>

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
              <div class="field full"><select id="country" name="country" autocomplete="country-name"><option>France</option><option>Belgique</option><option>Suisse</option><option>Luxembourg</option><option>Maroc</option></select><label for="country">Pays</label></div>
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
      else { cart.promo = null; cart.save(); m.textContent = v ? 'Ce code ne brille pas… (indice : regardez le ciel)' : ''; m.className = 'promo-msg ko'; }
      renderSummary();
    });
    // carte vivante
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
      // simulation de paiement
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
        const order = {
          id: 'SEL-' + Date.now().toString(36).toUpperCase().slice(-6),
          date: new Date().toISOString(),
          name: v('firstname'), email: v('email'),
          city: v('city'), ship: shipMethod(), gift: $('#isGift').checked, giftMsg: v('giftMsg'),
          items: cart.items.map(i => ({ ...i, name: byId(i.id).name, price: byId(i.id).sizes[i.size] })),
          totals: t, last4: digits.slice(-4)
        };
        store.set('selene-last-order', order);
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
    const eta = new Date(Date.now() + (o.ship === 'express' ? 1 : 4) * 864e5).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
    <section class="thanks" id="thanks">
      <div>
        <div class="thanks__candle" id="thanksCandle">${FX.candleSVG(byId(o.items[0]?.id) || products[1], { lit: false })}</div>
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
    const svg = $('#thanksCandle .candle-svg');
    if (svg) setTimeout(() => { svg.classList.remove('is-off'); const r = svg.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height * .2, 24); }, 900);
  };

  /* ---------- Oracle ---------- */
  const QUIZ = [
    { q: 'Ta nuit idéale ?', a: [
      ['Plaid, série & chocolat chaud', 'Le cocon absolu', { 'clair-de-lune': 2 }],
      ['Une terrasse étoilée à Marrakech', 'Les orangers, la chaleur', { zahr: 2, atay: 1 }],
      ['Des draps frais et 10 h de sommeil', 'Le luxe, le vrai', { 'nuit-blanche': 2 }],
      ['Un dîner aux chandelles', 'Romantique, mais pas sage', { 'jardin-de-minuit': 2 }]] },
    { q: 'Choisis une lumière.', a: [
      ['La pleine lune', 'Ronde, dorée, rassurante', { 'clair-de-lune': 2 }],
      ['Le premier croissant', 'Fin, frais, plein de promesses', { 'nuit-blanche': 2 }],
      ['Un coucher de soleil ocre', 'Sur les remparts', { zahr: 2 }],
      ['Les lanternes d’une médina', 'Ciselées, vivantes', { atay: 2, 'jardin-de-minuit': 1 }]] },
    { q: 'Et dans ta tasse, ce soir ?', a: [
      ['Thé à la menthe, bien sucré', 'Servi de très haut', { atay: 3 }],
      ['Une infusion, puis au lit', 'Sage comme une image', { 'nuit-blanche': 2 }],
      ['Un verre de rosé', 'Entre amis, sous les fleurs', { 'jardin-de-minuit': 2 }],
      ['Un lait chaud à la fleur d’oranger', 'Comme chez mamie', { zahr: 2, 'clair-de-lune': 1 }]] }
  ];
  views.oracle = () => `
    <section class="page oracle"><div class="wrap oracle__card">
      <div id="oracleBox">
        <div class="crystal" aria-hidden="true"></div>
        <span class="eyebrow" data-reveal style="margin-top:26px">L'oracle de Séléné</span>
        <h1 data-split>Quel parfum <em>es-tu ?</em></h1>
        <p class="muted" data-reveal>Trois questions, une bougie. La lune ne se trompe (presque) jamais.</p>
        <button class="btn" id="oracleStart" style="margin-top:30px" data-reveal>Consulter l'oracle</button>
      </div>
    </div></section>`;
  views.oracle.after = () => {
    const box = $('#oracleBox'); let step = 0; const score = {};
    const show = () => {
      if (step >= QUIZ.length) return result();
      const Q = QUIZ[step];
      box.innerHTML = `<div class="oracle__q"><span class="eyebrow">Question ${step + 1} / ${QUIZ.length}</span><h2>${Q.q}</h2>
        <div class="oracle__opts">${Q.a.map((a, i) => `<button class="oracle__opt" data-o="${i}"><b>${a[0]}</b><span>${a[1]}</span></button>`).join('')}</div>
        <div class="oracle__progress">${QUIZ.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div></div>`;
      $$('[data-o]', box).forEach(b => b.addEventListener('click', e => {
        Object.entries(Q.a[+b.dataset.o][2]).forEach(([k, v]) => score[k] = (score[k] || 0) + v);
        FX.burst(e.clientX, e.clientY, 12, ['#c8b6ff', '#f3ecd6', '#ffb547']);
        step++; show();
      }));
    };
    const result = () => {
      box.innerHTML = `<div class="crystal" style="animation-duration:1s"></div><p class="muted" style="margin-top:24px;font-family:var(--serif);font-size:1.4rem;font-style:italic">La lune réfléchit…</p>`;
      setTimeout(() => {
        const id = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
        const p = byId(id);
        box.innerHTML = `<div class="oracle__result">
          <span class="eyebrow">Ta bougie, c'est</span>
          ${FX.candleSVG(p)}
          <h2>${p.name}</h2>
          <p class="pdp__tag" style="max-width:520px">${p.tagline}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
            <button class="btn" data-add="${p.id}" data-size="${p.sizes.classique ? 'classique' : 'coffret'}">L'adopter · ${euro(p.sizes.classique || p.sizes.coffret)}</button>
            <a class="btn btn--ghost" href="#/produit/${p.id}" data-link>La découvrir</a>
          </div>
          <button class="link-arrow" id="oracleAgain" style="margin-top:10px">Recommencer <span>↺</span></button></div>`;
        const r = box.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + 120, 30);
        $('#oracleAgain').addEventListener('click', () => { step = 0; Object.keys(score).forEach(k => delete score[k]); show(); });
      }, 1600);
    };
    $('#oracleStart').addEventListener('click', show);
  };

  /* ---------- Histoire ---------- */
  views.story = () => `
    <section class="story-hero">
      <svg class="chariot" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true"><path id="chariotPath" d="M0 260 C300 20 900 20 1200 260"/><circle r="7"><animateMotion dur="14s" repeatCount="indefinite" rotate="auto"><mpath href="#chariotPath"/></animateMotion></circle></svg>
      <div>
        <span class="eyebrow" data-reveal>La légende</span>
        <h1 data-split>Σελήνη <br><em>Séléné</em></h1>
        <p data-reveal style="--d:.6s">Chaque soir, la déesse de la Lune attelle ses chevaux d'argent et traverse le ciel pour veiller sur ceux qui ne dorment pas encore.</p>
      </div>
    </section>
    <section class="section"><div class="wrap chapters">
      <article class="chapter">
        <div class="chapter__img" data-reveal="left"><img src="assets/img/flamme-seule.jpg" alt="Une flamme de bougie dans l'obscurité" data-parallax="0.1" loading="lazy"></div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre I</span>
          <h2 data-split>Une lumière <em>dans le noir</em></h2>
          <p data-reveal>Dans la mythologie grecque, Séléné est la sœur d'Hélios, le Soleil, et d'Éos, l'Aurore. Lui éclaire les jours ; elle, les nuits. Pas pour les chasser — pour les rendre douces.</p>
          <p data-reveal>C'est exactement ce qu'on attend d'une bougie : pas d'éblouir, mais d'accompagner. Une lumière à hauteur de visage, qui transforme une chambre en refuge.</p>
        </div>
      </article>
      <article class="chapter">
        <div class="chapter__img" data-reveal="right"><img src="assets/img/the-maroc.jpg" alt="Thé à la menthe et théière marocaine" data-parallax="0.1" loading="lazy"></div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre II</span>
          <h2 data-split>De Fès <em>à votre table de nuit</em></h2>
          <p data-reveal>SELENE est née d'un souvenir : les soirées d'été au Maroc, quand l'air sent la fleur d'oranger et que le thé à la menthe passe de main en main jusqu'à tard.</p>
          <p data-reveal>On a voulu mettre ces nuits-là dans un pot. À côté, il fallait aussi les parfums qu'on aime tous : le linge propre, la vanille, les fleurs. Les classiques, mais faits bien.</p>
        </div>
      </article>
      <article class="chapter">
        <div class="chapter__img" data-reveal="left"><img src="assets/img/pilier.jpg" alt="Bougie pilier allumée sur fond noir" data-parallax="0.1" loading="lazy"></div>
        <div>
          <span class="eyebrow" data-reveal>Chapitre III</span>
          <h2 data-split>Simple, <em>propre</em>, abordable</h2>
          <p data-reveal>Cire 100 % végétale, mèche en coton, coulée à la main, pot qu'on garde. Et un prix qui ne fait pas peur : une mini à 10 €, une classique entre 16 et 19 €.</p>
          <p data-reveal>Parce qu'une belle bougie, ça ne devrait pas être un luxe réservé aux grandes occasions. Un mardi soir, c'est une occasion.</p>
          <a class="btn" href="#/boutique" data-link style="margin-top:14px" data-reveal>Voir la collection</a>
        </div>
      </article>
    </div></section>
    <section class="section" style="padding-top:0"><p class="big-quote" data-split>« Quand la nuit tombe, <em>allumez quelque chose</em> qui vous ressemble. »</p></section>`;

  /* ---------- Crédits ---------- */
  views.credits = () => `
    <section class="page"><div class="wrap section" style="padding-top:30px">
      <div class="section-head"><span class="eyebrow" data-reveal>Merci aux photographes</span><h1 style="font-size:clamp(3rem,8vw,6rem);font-weight:300" data-split>Crédits <em>photos</em></h1>
      <p class="muted" data-reveal>Toutes les photographies proviennent d'Unsplash et de Pexels, sous leurs licences respectives (utilisation libre, y compris commerciale). Les bougies illustrées, le logo et l'univers graphique sont des créations originales SELENE.</p></div>
      <div class="credits">${credits.map((c, i) => `
        <figure class="credit" data-reveal style="--d:${(i % 4) * .08}s">
          <img src="assets/img/${c.file}" alt="Photo de ${c.author}" loading="lazy">
          <div>Photo de <a href="${c.profile}" target="_blank" rel="noopener">${c.author}</a> sur <a href="${c.url}" target="_blank" rel="noopener">${c.site}</a></div>
        </figure>`).join('')}</div>
    </div></section>`;

  views.notfound = () => `<section class="page notfound"><div><span class="eyebrow">Erreur 404</span><h1 data-split>Nuit <em>sans lune</em></h1><p class="muted" style="margin:20px 0 30px">Cette page s'est perdue dans les étoiles.</p><a href="#/" class="btn" data-link>Retour à l'accueil</a></div></section>`;

  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* =========================================================
     Routeur
     ========================================================= */
  let booted = false;
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    return { parts, q: new URLSearchParams(qs || '') };
  }
  function route() {
    const { parts, q } = parse();
    let view, arg, anchor;
    switch (parts[0]) {
      case undefined: view = 'home'; break;
      case 'rituel': view = 'home'; anchor = 'rituel'; break;
      case 'boutique': view = 'shop'; break;
      case 'produit': view = 'product'; arg = parts[1]; break;
      case 'commande': view = 'checkout'; break;
      case 'merci': view = 'thanks'; break;
      case 'oracle': view = 'oracle'; break;
      case 'histoire': view = 'story'; break;
      case 'credits': view = 'credits'; break;
      default: view = 'notfound';
    }
    app.innerHTML = views[view](q, arg);
    app.dataset.view = view;
    window.scrollTo(0, 0);
    views[view].after && views[view].after(q, arg);
    if (booted) FX.scan(app);
    setupScrollFx();
    const titles = { home: 'Bougies naturelles coulées à la main', shop: 'Boutique', checkout: 'Commande', thanks: 'Merci', oracle: "L'oracle", story: 'La légende de Séléné', credits: 'Crédits photos', notfound: 'Page introuvable' };
    document.title = 'SELENE — ' + (view === 'product' && byId(arg) ? byId(arg).name : titles[view]);
    $$('.nav__links a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#/' + (parts[0] || '') && !!parts[0]));
    if (anchor) setTimeout(() => { const el = document.getElementById(anchor); if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' }); }, 120);
    onScroll();
  }
  function go(hash, x = innerWidth / 2, y = innerHeight / 2) {
    closeCart(); closeMenu();
    FX.eclipse(x, y, () => {
      if (location.hash === hash) route(); else location.hash = hash;
    });
  }
  addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const href = a.getAttribute('href');
    if (a.hasAttribute('data-scroll') || !href.startsWith('#/')) {
      const el = document.getElementById(href.slice(1));
      if (el) { e.preventDefault(); window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' }); }
      return;
    }
    e.preventDefault();
    go(href, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  });

  /* ---------- Menu mobile ---------- */
  const burger = $('#burger'), links = $('#navLinks');
  function closeMenu() { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });

  /* =========================================================
     Scroll : nav, phase de lune, parallaxe, rituel
     ========================================================= */
  const nav = $('#nav'), phase = $('#phaseShadow');
  let lastY = 0, parallaxEls = [], ritual = null, ticking = false;
  function setupScrollFx() {
    parallaxEls = $$('[data-parallax]', app);
    const sec = $('#rituel');
    ritual = sec ? { sec, steps: $$('.ritual__step', sec), bars: $$('.ritual__bar i', sec), svg: $('#ritualCandle .candle-svg'), orbit: $('#orbit') } : null;
  }
  function onScroll() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    FX.setScroll(y);
    nav.classList.toggle('is-scrolled', y > 30);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !links.classList.contains('is-open'));
    lastY = y;
    const p = h > 0 ? Math.min(1, y / h) : 1;
    phase.setAttribute('cx', (23 + p * 24).toFixed(2));
    for (const el of parallaxEls) {
      const r = el.getBoundingClientRect();
      const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax);
      el.style.setProperty('--py', off.toFixed(1) + 'px');
      if (!el.matches('img')) el.style.transform = `translateY(${off.toFixed(1)}px)`;
    }
    if (ritual) {
      const r = ritual.sec.getBoundingClientRect();
      const total = ritual.sec.offsetHeight - innerHeight;
      const rp = Math.min(1, Math.max(0, -r.top / total));
      const idx = Math.min(3, Math.floor(rp * 4));
      ritual.steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      ritual.bars.forEach((b, i) => b.style.setProperty('--p', Math.min(1, Math.max(0, rp * 4 - i))));
      FX.setCandleLevel(ritual.svg, 1 - rp * .78);
      ritual.orbit.style.transform = `rotate(${rp * 300}deg)`;
    }
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });

  /* ---------- Newsletter ---------- */
  $('#newsletter').addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'), r = btn.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top, 20);
    FX.toast('🌕 Inscrit·e ! Rendez-vous à la prochaine pleine lune.');
    e.target.reset();
  });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Démarrage ---------- */
  renderCart();
  route();
  const loader = $('#loader');
  const hide = () => { loader.classList.add('is-done'); booted = true; setTimeout(() => FX.scan(app), 250); setTimeout(() => loader.remove(), 1300); };
  if (FX.reduce) hide(); else setTimeout(hide, 2900);
})();
