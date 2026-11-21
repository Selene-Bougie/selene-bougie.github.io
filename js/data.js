/* SELENE — catalogue & crédits */
window.SELENE = {
  sizes: {
    mini:      { label: 'Mini',      weight: '80 g',  burn: '≈ 20 h' },
    classique: { label: 'Classique', weight: '180 g', burn: '≈ 45 h' },
    coffret:   { label: 'Coffret',   weight: '3 × 80 g', burn: '≈ 60 h au total' }
  },

  products: [
    {
      id: 'nuit-blanche',
      name: 'Nuit Blanche',
      family: 'Linge frais',
      phase: 'Premier croissant',
      tagline: 'Des draps propres qui sèchent au clair de lune.',
      description: "L'odeur d'une chambre fraîche, fenêtre entrouverte sur la nuit. Une brise de coton et de muguet, posée sur un musc blanc tout doux. La bougie pour les dimanches soir, les nuits blanches et les nouveaux départs.",
      notes: { tete: 'Bergamote, aldéhydes', coeur: 'Fleur de coton, muguet', fond: 'Musc blanc, cèdre' },
      profile: { fraicheur: 90, douceur: 70, intensite: 45 },
      wax: '#f4f1ea', glass: '#cfd9f2', accent: '#9fb8ff',
      sizes: { mini: 10, classique: 16 },
      img: 'assets/img/nuit-blanche.jpg',
      signature: false
    },
    {
      id: 'clair-de-lune',
      name: 'Clair de Lune',
      family: 'Vanille',
      phase: 'Pleine lune',
      tagline: 'Une vanille dorée, ronde comme la lune d’août.',
      description: "Notre best-seller. Une vanille Bourbon chaude et crémeuse, réveillée par la fève tonka et posée sur un lit de santal. Comme un plaid, un livre et quelqu'un qui vous fait un chocolat chaud.",
      notes: { tete: 'Lait d’amande, poire', coeur: 'Vanille Bourbon, fève tonka', fond: 'Santal, ambre doux' },
      profile: { fraicheur: 20, douceur: 95, intensite: 75 },
      wax: '#f6e7c8', glass: '#e8d3a8', accent: '#ffc46b',
      sizes: { mini: 10, classique: 17 },
      img: 'assets/img/clair-de-lune.jpg',
      signature: false,
      badge: 'Best-seller'
    },
    {
      id: 'jardin-de-minuit',
      name: 'Jardin de Minuit',
      family: 'Floral',
      phase: 'Lune gibbeuse',
      tagline: 'Les fleurs qui ne s’ouvrent que la nuit.',
      description: "Un jardin secret après l'orage : pivoine gorgée d'eau, rose de Damas et jasmin sambac qui embaume quand tout le monde dort. Romantique, mais pas sage.",
      notes: { tete: 'Litchi, poivre rose', coeur: 'Pivoine, rose de Damas, jasmin', fond: 'Musc poudré, patchouli léger' },
      profile: { fraicheur: 55, douceur: 75, intensite: 65 },
      wax: '#f3d9dc', glass: '#e7b9c2', accent: '#ff9db5',
      sizes: { mini: 10, classique: 17 },
      img: 'assets/img/jardin-de-minuit.jpg',
      signature: false
    },
    {
      id: 'zahr',
      name: 'Zahr',
      family: 'Fleur d’oranger',
      phase: 'Signature Maroc',
      tagline: 'Les orangers de Marrakech, un soir de printemps.',
      description: "« Zahr », c'est la fleur d'oranger en darija. Celle qu'on distille dans les maisons, qui parfume les cornes de gazelle et les mains des grands-mères. Néroli lumineux, miel d'oranger et un musc tiède comme les murs ocres après le coucher du soleil.",
      notes: { tete: 'Néroli, petit-grain', coeur: 'Fleur d’oranger, miel', fond: 'Musc tiède, bois de cèdre de l’Atlas' },
      profile: { fraicheur: 60, douceur: 85, intensite: 70 },
      wax: '#fbeed3', glass: '#f2c98a', accent: '#ffb547',
      sizes: { mini: 11, classique: 19 },
      img: 'assets/img/zahr.jpg',
      signature: true,
      badge: 'Signature'
    },
    {
      id: 'atay',
      name: 'Atay',
      family: 'Thé à la menthe',
      phase: 'Signature Maroc',
      tagline: 'Le thé qu’on sert trois fois, et qu’on ne refuse jamais.',
      description: "« Atay », c'est le thé. Le vrai : thé vert gunpowder, menthe nanah fraîchement cueillie, une pointe de sucre de canne. Le premier verre est doux comme la vie, le deuxième fort comme l'amour, le troisième amer comme la mort — cette bougie, c'est les trois à la fois.",
      notes: { tete: 'Menthe nanah, citron vert', coeur: 'Thé vert gunpowder', fond: 'Sucre de canne, bois blond' },
      profile: { fraicheur: 95, douceur: 50, intensite: 60 },
      wax: '#e2efdf', glass: '#a9d3b0', accent: '#7fe0a6',
      sizes: { mini: 11, classique: 19 },
      img: 'assets/img/atay.jpg',
      signature: true,
      badge: 'Signature'
    },
    {
      id: 'coffret-phases',
      name: 'Coffret Phases',
      family: 'Coffret cadeau',
      phase: 'Cycle complet',
      tagline: 'Trois minis, trois lunes, un cadeau qui fait son effet.',
      description: "Le cadeau parfait quand on ne sait pas quoi offrir (ou qu'on veut tout goûter). Trois mini-bougies dans un écrin bleu nuit : Nuit Blanche, Zahr et Atay. Avec une carte à écrire à la main, parce que c'est mieux.",
      notes: { tete: 'Nuit Blanche — linge frais', coeur: 'Zahr — fleur d’oranger', fond: 'Atay — thé à la menthe' },
      profile: { fraicheur: 80, douceur: 70, intensite: 60 },
      wax: '#efe6f7', glass: '#b9b3e6', accent: '#c8b6ff',
      sizes: { coffret: 27 },
      img: 'assets/img/coffret.jpg',
      signature: false,
      badge: 'Idée cadeau'
    }
  ],

  promo: { code: 'PLEINELUNE', rate: 0.10 },
  shipping: { standard: 4.9, express: 7.9, freeFrom: 35 },

  credits: [
    { file: 'hero-flamme.jpg', author: 'Purwanto Widodo', site: 'Unsplash', url: 'https://unsplash.com/photos/sbOnhWT5UGA', profile: 'https://unsplash.com/@eko_jp' },
    { file: 'clair-de-lune.jpg', author: 'Joyce G', site: 'Unsplash', url: 'https://unsplash.com/photos/3y9ymqvRR_s', profile: 'https://unsplash.com/@joyce_' },
    { file: 'flamme-seule.jpg', author: 'Manoj Roy', site: 'Unsplash', url: 'https://unsplash.com/photos/KkqnhL3HjtA', profile: 'https://unsplash.com/@manojroy' },
    { file: 'pilier.jpg', author: 'Volodymyr Hryshchenko', site: 'Unsplash', url: 'https://unsplash.com/photos/-UYM-M8eQXQ', profile: 'https://unsplash.com/@lunarts' },
    { file: 'zahr.jpg', author: 'Benjamin Farren', site: 'Pexels', url: 'https://www.pexels.com/photo/candle-in-glass-in-dark-15617994/', profile: 'https://www.pexels.com/photo/candle-in-glass-in-dark-15617994/' },
    { file: 'jardin-de-minuit.jpg', author: 'cottonbro studio', site: 'Pexels', url: 'https://www.pexels.com/photo/lighted-candles-on-glass-containers-7407315/', profile: 'https://www.pexels.com/@cottonbro/' },
    { file: 'coffret.jpg', author: 'ENG_HK', site: 'Pexels', url: 'https://www.pexels.com/photo/cozy-candlelight-in-dark-room-scene-33010593/', profile: 'https://www.pexels.com/@eng_hk-2153621871/' },
    { file: 'nuit-blanche.jpg', author: 'Kaboompics', site: 'Pexels', url: 'https://www.pexels.com/photo/burning-candle-in-a-glass-jar-on-the-floor-6255810/', profile: 'https://www.pexels.com/@karola-g/' },
    { file: 'atay.jpg', author: 'Moussa Idrissi', site: 'Pexels', url: 'https://www.pexels.com/photo/traditional-moroccan-mint-tea-set-in-sunlight-30906049/', profile: 'https://www.pexels.com/@mographe/' },
    { file: 'the-maroc.jpg', author: 'Moussa Idrissi', site: 'Pexels', url: 'https://www.pexels.com/photo/traditional-moroccan-mint-tea-set-on-ornate-carpet-30906051/', profile: 'https://www.pexels.com/@mographe/' }
  ]
};
