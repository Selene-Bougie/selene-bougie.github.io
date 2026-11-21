/* SELENE — œuvres graphiques originales (SVG génératif) */
(function () {
  let uid = 0;
  const TAU = Math.PI * 2;
  const r2 = n => Math.round(n * 100) / 100;

  /* Phase de lune : f ∈ [0,1) — 0 nouvelle lune, .5 pleine lune */
  function phasePath(f, r) {
    const k = Math.cos(TAU * f);
    const rx = r2(Math.abs(k) * r);
    const waxing = f <= .5;
    const outer = waxing ? 1 : 0;
    const term = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
    return `M0 ${-r} A${r} ${r} 0 0 ${outer} 0 ${r} A${rx} ${r} 0 0 ${term} 0 ${-r}Z`;
  }
  function phaseGlyph(f, { size = 22, color = '#b9c6ff', cls = '' } = {}) {
    return `<svg class="phase-glyph ${cls}" viewBox="-12 -12 24 24" width="${size}" height="${size}" aria-hidden="true">
      <circle r="10" fill="none" stroke="${color}" stroke-width=".8" opacity=".7"/>
      ${f > .02 && f < .98 ? `<path d="${phasePath(f, 10)}" fill="${color}"/>` : ''}</svg>`;
  }

  /* Étoile scintillante à 4 branches */
  const sparkle = (x, y, s = 6, op = 1) =>
    `<path transform="translate(${x} ${y}) scale(${s / 10})" d="M0-10 C1-3 3-1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3-1 -1-3 0-10Z" opacity="${op}"/>`;

  /* Astrolabe gravé — anneaux, graduations, texte circulaire, phases */
  function astrolabe({ text = 'SELENE ✦ BOUGIES DE NUIT ✦ CIRE VÉGÉTALE ✦ COULÉES À LA MAIN ✦ POT RÉUTILISABLE ✦ ', cls = '' } = {}) {
    const id = 'as' + (++uid);
    let ticks = '';
    for (let i = 0; i < 180; i++) {
      const a = i * 2 * Math.PI / 180, len = i % 15 === 0 ? 16 : i % 5 === 0 ? 9 : 4;
      const c = Math.cos(a), s = Math.sin(a);
      ticks += `<line x1="${r2(c * 286)}" y1="${r2(s * 286)}" x2="${r2(c * (286 - len))}" y2="${r2(s * (286 - len))}"/>`;
    }
    let phases = '';
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * TAU / 8, x = r2(Math.cos(a) * 228), y = r2(Math.sin(a) * 228);
      phases += `<g transform="translate(${x} ${y})"><circle r="11" fill="#070b20" stroke="currentColor" stroke-width=".7"/>${i ? `<path d="${phasePath(i / 8, 11)}" fill="currentColor" opacity=".9"/>` : ''}</g>`;
    }
    let rays = '';
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16, c = Math.cos(a), s = Math.sin(a);
      rays += `<line x1="${r2(c * 202)}" y1="${r2(s * 202)}" x2="${r2(c * 214)}" y2="${r2(s * 214)}"/>`;
    }
    const sq = 196 / Math.SQRT2;
    return `<svg class="astrolabe ${cls}" viewBox="-300 -300 600 600" aria-hidden="true">
      <defs><path id="${id}t" d="M-262 0 A262 262 0 1 1 262 0 A262 262 0 1 1 -262 0"/></defs>
      <g class="astro__outer" fill="none" stroke="currentColor">
        <circle r="296" stroke-width=".5" opacity=".5"/>
        <circle r="286" stroke-width="1"/>
        <g stroke-width=".7" opacity=".85">${ticks}</g>
        <circle r="250" stroke-width=".6" stroke-dasharray="1 5" opacity=".7"/>
        <text font-family="Cinzel, serif" font-size="11" letter-spacing="3" fill="currentColor" stroke="none" opacity=".9"><textPath href="#${id}t" textLength="1640" lengthAdjust="spacing">${text}</textPath></text>
      </g>
      <g class="astro__inner" fill="none" stroke="currentColor">
        <circle r="242" stroke-width=".5" opacity=".6"/>
        ${phases}
        <circle r="214" stroke-width=".8"/>
        <g stroke-width=".6" opacity=".7">${rays}</g>
        <circle r="202" stroke-width=".5" opacity=".7"/>
        <rect x="${-sq}" y="${-sq}" width="${2 * sq}" height="${2 * sq}" stroke-width=".5" opacity=".35"/>
        <rect x="${-sq}" y="${-sq}" width="${2 * sq}" height="${2 * sq}" stroke-width=".5" opacity=".35" transform="rotate(45)"/>
      </g>
      <g class="astro__sparks" fill="currentColor">${sparkle(0, -300, 9)}${sparkle(0, 300, 9)}${sparkle(-300, 0, 9)}${sparkle(300, 0, 9)}</g>
    </svg>`;
  }

  /* Ornement séparateur : ligne — losange — croissant — losange — ligne */
  function ornament(cls = '') {
    return `<svg class="ornament ${cls}" viewBox="0 0 320 24" aria-hidden="true" fill="none" stroke="currentColor">
      <line x1="0" y1="12" x2="122" y2="12" stroke-width=".7"/><line x1="198" y1="12" x2="320" y2="12" stroke-width=".7"/>
      <path d="M132 12 l6-6 6 6-6 6z" stroke-width=".8"/><path d="M176 12 l6-6 6 6-6 6z" stroke-width=".8"/>
      <path d="M33.22 10.04 A24 24 0 1 0 53.72 44.2 A20 20 0 1 1 33.22 10.04 Z" fill="currentColor" stroke="none" transform="translate(148 0) scale(.36)"/>
      <circle cx="122" cy="12" r="1.5" fill="currentColor"/><circle cx="198" cy="12" r="1.5" fill="currentColor"/></svg>`;
  }

  /* Coin de carte de tarot */
  const corner = `<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width=".9">
    <path d="M2 38 V12 A10 10 0 0 1 12 2 H38"/><path d="M7 38 V15 A8 8 0 0 1 15 7 H38" opacity=".5"/>
    <path fill="currentColor" stroke="none" transform="translate(12 12) scale(.45)" d="M0-10 C1-3 3-1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3-1 -1-3 0-10Z"/></svg>`;

  /* Zellige : tuile à étoile à huit branches */
  function zelligeTile({ line = '#d9b26a', a = '#1b6f6a', b = '#b5553a', bg = 'none', op = 1 } = {}) {
    const s = 22;
    const star = `<rect x="${50 - s}" y="${50 - s}" width="${2 * s}" height="${2 * s}"/><rect x="${50 - s}" y="${50 - s}" width="${2 * s}" height="${2 * s}" transform="rotate(45 50 50)"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="${op}">
      <rect width="100" height="100" fill="${bg}"/>
      <g fill="${a}" fill-opacity=".55" stroke="${line}" stroke-width="1">${star}</g>
      <circle cx="50" cy="50" r="8" fill="${b}" fill-opacity=".8" stroke="${line}" stroke-width=".8"/>
      <g fill="${b}" fill-opacity=".5" stroke="${line}" stroke-width="1">
        <path d="M0 -14 L6 -6 L14 0 L6 6 L0 14 L-6 6 L-14 0 L-6 -6Z" transform="translate(0 0)"/>
        <path d="M0 -14 L6 -6 L14 0 L6 6 L0 14 L-6 6 L-14 0 L-6 -6Z" transform="translate(100 0)"/>
        <path d="M0 -14 L6 -6 L14 0 L6 6 L0 14 L-6 6 L-14 0 L-6 -6Z" transform="translate(0 100)"/>
        <path d="M0 -14 L6 -6 L14 0 L6 6 L0 14 L-6 6 L-14 0 L-6 -6Z" transform="translate(100 100)"/></g>
      <g stroke="${line}" stroke-width="1" fill="none">
        <path d="M14 0 L28 22 M86 0 L72 22 M14 100 L28 78 M86 100 L72 78 M0 14 L22 28 M100 14 L78 28 M0 86 L22 72 M100 86 L78 72"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  /* Constellation décorative (étoiles reliées) */
  function constellation(points, cls = '') {
    const pts = points.map(p => p.join(',')).join(' ');
    return `<svg class="constellation ${cls}" viewBox="0 0 100 100" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width=".25" stroke-dasharray="1 1.5" opacity=".7"/>
      <g fill="currentColor">${points.map(([x, y], i) => sparkle(x, y, i % 3 ? 1.6 : 2.6)).join('')}</g></svg>`;
  }

  /* Dos de carte de tarot */
  function cardBack() {
    return `<div class="tarot-back">
      ${astrolabe({ text: 'SELENE ✦ ORACLE DE LA LUNE ✦ SELENE ✦ ORACLE DE LA LUNE ✦ ', cls: 'astrolabe--mini' })}
      <svg class="tarot-back__moon" viewBox="0 0 64 64"><path d="M33.22 10.04 A24 24 0 1 0 53.72 44.2 A20 20 0 1 1 33.22 10.04 Z" fill="currentColor"/></svg>
    </div>`;
  }

  window.ART = { phaseGlyph, phasePath, sparkle, astrolabe, ornament, corner, zelligeTile, constellation, cardBack };
})();
