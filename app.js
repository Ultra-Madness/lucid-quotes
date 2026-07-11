/* ==========================================================================
   LUCID — app logic
   Vanilla JS, zero dependencies, zero build step.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------- *
   * Config
   * ---------------------------------------------------------------------- */

  /* Each category carries two accents: one tuned for the dark theme, one
     darkened for the light theme so it still passes as readable on paper. */
  const CATEGORIES = [
    { id: 'all',         label: 'All',         dark: '#7c5cff', light: '#6d4bf0' },
    { id: 'inspiration', label: 'Inspiration', dark: '#7c5cff', light: '#6d4bf0' },
    { id: 'stoic',       label: 'Stoic',       dark: '#22d3ee', light: '#0e97b4' },
    { id: 'wisdom',      label: 'Wisdom',      dark: '#60a5fa', light: '#2563eb' },
    { id: 'grit',        label: 'Grit',        dark: '#fb7185', light: '#e11d48' },
    { id: 'creativity',  label: 'Creativity',  dark: '#f472b6', light: '#db2777' },
    { id: 'humor',       label: 'Humor',       dark: '#fbbf24', light: '#c2740a' }
  ];

  const THEME_BG = { dark: '#08080b', light: '#f2efe9' };

  const LS_FAVS  = 'lucid.favs.v1';
  const LS_CAT   = 'lucid.cat.v1';
  const LS_THEME = 'lucid.theme.v1';
  const SWIPE_THRESHOLD = 56;      // px before a swipe commits

  /* ---------------------------------------------------------------------- *
   * DOM
   * ---------------------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  const el = {
    root:        document.documentElement,
    chips:       $('chips'),
    stage:       $('stage'),
    card:        $('card'),
    quoteBox:    $('quoteBox'),
    quoteText:   $('quoteText'),
    quoteAuthor: $('quoteAuthor'),
    pillText:    $('pillText'),
    favBtn:      $('favBtn'),
    copyBtn:     $('copyBtn'),
    shareBtn:    $('shareBtn'),
    shuffleBtn:  $('shuffleBtn'),
    todayBtn:    $('todayBtn'),
    favViewBtn:  $('favViewBtn'),
    favViewBtn2: $('favViewBtn2'),
    themeBtn:    $('themeBtn'),
    themeColor:  $('themeColor'),
    favCount:    $('favCount'),
    drawer:      $('drawer'),
    drawerList:  $('drawerList'),
    drawerClose: $('drawerClose'),
    brandBtn:    $('brandBtn'),
    toast:       $('toast'),
    hint:        $('hint'),
    canvas:      $('shareCanvas')
  };

  /* ---------------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------------- */

  const ALL = (window.QUOTES || []).map((q, i) => ({ ...q, id: hashId(q.t) || 'q' + i }));

  const state = {
    category: loadCategory(),
    pool: [],
    history: [],          // quotes we've shown, oldest -> newest
    cursor: -1,           // index into history
    favs: loadFavs(),     // array of quote objects (kept whole, so they survive edits)
    drawerOpen: false,
    isToday: false
  };

  /* ---------------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------------- */

  function init() {
    if (!ALL.length) {
      el.quoteText.textContent = 'No quotes found. Add some to quotes.js!';
      el.quoteAuthor.textContent = '—';
      return;
    }

    initTheme();
    renderChips();
    rebuildPool();
    updateFavCount();
    showQuoteOfTheDay();     // first thing you see each day is the daily quote
    bindEvents();
    observeResize();
    registerSW();
  }

  /* ---------------------------------------------------------------------- *
   * Theme
   * ---------------------------------------------------------------------- *
   * The inline script in index.html already set data-theme before first
   * paint (no flash). Here we just sync the button and wire up the toggle.
   * With no saved choice, we follow the OS and keep following it live.
   */

  const currentTheme = () => el.root.getAttribute('data-theme') || 'dark';

  function initTheme() {
    syncThemeButton();

    // No manual override? Then track the OS setting as it changes.
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onSystemChange = (e) => {
      if (savedTheme()) return;                 // user has chosen; leave them alone
      applyTheme(e.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  function savedTheme() {
    try { return localStorage.getItem(LS_THEME); } catch { return null; }
  }

  function applyTheme(theme, persist = true) {
    el.root.setAttribute('data-theme', theme);
    if (el.themeColor) el.themeColor.setAttribute('content', THEME_BG[theme]);
    if (persist) {
      try { localStorage.setItem(LS_THEME, theme); } catch { /* private mode */ }
    }
    syncThemeButton();

    // Category accents differ per theme — re-apply for the quote on screen.
    const q = state.history[state.cursor];
    if (q) setAccent(accentFor(q));
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    haptic(10);
    toast(next === 'light' ? 'Light' : 'Dark');
  }

  function syncThemeButton() {
    if (!el.themeBtn) return;
    const light = currentTheme() === 'light';
    el.themeBtn.setAttribute('aria-pressed', String(light));
    el.themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }

  function accentFor(q) {
    const cat = CATEGORIES.find((c) => c.id === q.c) || CATEGORIES[0];
    return cat[currentTheme()] || cat.dark;
  }

  /* ---------------------------------------------------------------------- *
   * Pool + selection
   * ---------------------------------------------------------------------- */

  function rebuildPool() {
    state.pool = state.category === 'all'
      ? ALL.slice()
      : ALL.filter((q) => q.c === state.category);
    if (!state.pool.length) state.pool = ALL.slice();
  }

  function pickRandom() {
    const current = state.history[state.cursor];
    if (state.pool.length === 1) return state.pool[0];
    let q, guard = 0;
    do {
      q = state.pool[(Math.random() * state.pool.length) | 0];
      guard++;
    } while (current && q.id === current.id && guard < 24);
    return q;
  }

  function nextQuote(dir) {
    // dir: 1 = forward (new), -1 = back through history
    if (dir === -1) {
      if (state.cursor <= 0) { bounce(); return; }
      state.cursor--;
      state.isToday = false;
      render(state.history[state.cursor], -1);
      return;
    }

    if (state.cursor < state.history.length - 1) {
      state.cursor++;                       // walk forward through history first
    } else {
      state.history.push(pickRandom());
      if (state.history.length > 60) state.history.shift();
      state.cursor = state.history.length - 1;
    }
    state.isToday = false;
    render(state.history[state.cursor], 1);
  }

  function showQuoteOfTheDay() {
    // Deterministic: everyone sees the same quote on the same calendar day.
    const d = new Date();
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = state.pool[seededRand(key) % state.pool.length];
    state.history.push(q);
    state.cursor = state.history.length - 1;
    state.isToday = true;
    render(q, 1);
    el.todayBtn.classList.add('is-active');
  }

  /* ---------------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------------- */

  function render(q, dir = 1) {
    if (!q) return;
    const cat = CATEGORIES.find((c) => c.id === q.c) || CATEGORIES[0];

    setAccent(accentFor(q));

    el.quoteText.textContent = q.t;
    el.quoteAuthor.textContent = q.a;
    el.pillText.textContent = cat.label;

    const saved = isFav(q);
    el.favBtn.setAttribute('aria-pressed', String(saved));
    el.favBtn.querySelector('span').textContent = saved ? 'Saved' : 'Save';

    if (!state.isToday) el.todayBtn.classList.remove('is-active');

    // Re-trigger the entrance animation
    el.card.classList.remove('is-entering');
    el.card.style.transform = '';
    el.card.style.opacity = '';
    void el.card.offsetWidth;                 // force reflow
    el.card.classList.add('is-entering');

    fitQuote();
  }

  function setAccent(hex) {
    el.root.style.setProperty('--accent', hex);
    // Re-tint the aurora subtly toward the active category
    el.root.style.setProperty('--a1', hex);
  }

  /**
   * Auto-fit the quote so it ALWAYS fits inside the card, on any device.
   * Binary search over font-size until the body no longer overflows.
   */
  function fitQuote() {
    const body = el.quoteBox;
    const text = el.quoteText;
    if (!body || !text) return;

    const w = body.clientWidth || 320;
    let lo = 14;
    let hi = Math.min(44, Math.max(20, w * 0.115));

    text.style.fontSize = hi + 'px';
    if (!overflows(body)) { text.style.opacity = '1'; return; }

    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      text.style.fontSize = mid + 'px';
      if (overflows(body)) hi = mid; else lo = mid;
    }
    text.style.fontSize = Math.max(13, lo) + 'px';
    text.style.opacity = '1';
  }

  function overflows(node) {
    return node.scrollHeight > node.clientHeight + 1;
  }

  function observeResize() {
    let raf = 0;
    const refit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitQuote);
    };
    if ('ResizeObserver' in window) new ResizeObserver(refit).observe(el.stage);
    window.addEventListener('orientationchange', () => setTimeout(refit, 220));
    window.addEventListener('resize', refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  }

  /* ---------------------------------------------------------------------- *
   * Chips
   * ---------------------------------------------------------------------- */

  function renderChips() {
    el.chips.innerHTML = '';
    CATEGORIES.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.role = 'tab';
      b.textContent = c.label;
      b.dataset.cat = c.id;
      b.setAttribute('aria-selected', String(c.id === state.category));
      b.addEventListener('click', () => selectCategory(c.id));
      el.chips.appendChild(b);
    });
  }

  function selectCategory(id) {
    if (id === state.category) return;
    state.category = id;
    saveCategory(id);
    [...el.chips.children].forEach((c) =>
      c.setAttribute('aria-selected', String(c.dataset.cat === id))
    );
    rebuildPool();
    state.history = [];
    state.cursor = -1;
    state.isToday = false;
    haptic(8);
    nextQuote(1);
    closeDrawer();
  }

  /* ---------------------------------------------------------------------- *
   * Favorites
   * ---------------------------------------------------------------------- */

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(LS_FAVS)) || []; }
    catch { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(LS_FAVS, JSON.stringify(state.favs)); } catch { /* private mode */ }
  }
  function loadCategory() {
    try { return localStorage.getItem(LS_CAT) || 'all'; } catch { return 'all'; }
  }
  function saveCategory(c) {
    try { localStorage.setItem(LS_CAT, c); } catch { /* noop */ }
  }

  const isFav = (q) => state.favs.some((f) => f.id === q.id);

  function toggleFav() {
    const q = state.history[state.cursor];
    if (!q) return;

    if (isFav(q)) {
      state.favs = state.favs.filter((f) => f.id !== q.id);
      toast('Removed from saved');
      haptic(8);
    } else {
      state.favs.unshift(q);
      toast('Saved');
      haptic([10, 30, 14]);
      el.favBtn.classList.remove('is-pop');
      void el.favBtn.offsetWidth;
      el.favBtn.classList.add('is-pop');
    }
    saveFavs();
    updateFavCount();

    const saved = isFav(q);
    el.favBtn.setAttribute('aria-pressed', String(saved));
    el.favBtn.querySelector('span').textContent = saved ? 'Saved' : 'Save';
    if (state.drawerOpen) renderDrawer();
  }

  function updateFavCount() {
    const n = state.favs.length;
    el.favCount.textContent = n > 99 ? '99+' : String(n);
    el.favCount.hidden = n === 0;
  }

  /* ---------------------------------------------------------------------- *
   * Drawer
   * ---------------------------------------------------------------------- */

  function openDrawer() {
    state.drawerOpen = true;
    el.drawer.hidden = false;
    renderDrawer();
    el.favViewBtn2.classList.add('is-active');
    haptic(8);
  }
  function closeDrawer() {
    state.drawerOpen = false;
    el.drawer.hidden = true;
    el.favViewBtn2.classList.remove('is-active');
  }
  function toggleDrawer() {
    state.drawerOpen ? closeDrawer() : openDrawer();
  }

  function renderDrawer() {
    el.drawerList.innerHTML = '';

    if (!state.favs.length) {
      el.drawerList.innerHTML =
        '<div class="empty">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20.5S3.8 15.4 3.8 9.6A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.2 2.8c0 5.8-8.2 10.9-8.2 10.9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '<p>Nothing saved yet. Tap <strong>Save</strong> on a quote you want to keep.</p>' +
        '</div>';
      return;
    }

    state.favs.forEach((q) => {
      const row = document.createElement('div');
      row.className = 'fav';

      const main = document.createElement('div');
      main.innerHTML =
        '<div class="fav__t"></div><div class="fav__a"></div>';
      main.querySelector('.fav__t').textContent = q.t;
      main.querySelector('.fav__a').textContent = q.a;
      main.addEventListener('click', () => {
        state.history.push(q);
        state.cursor = state.history.length - 1;
        state.isToday = false;
        render(q, 1);
        closeDrawer();
      });

      const x = document.createElement('button');
      x.className = 'fav__x';
      x.type = 'button';
      x.setAttribute('aria-label', 'Remove from saved');
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        state.favs = state.favs.filter((f) => f.id !== q.id);
        saveFavs();
        updateFavCount();
        renderDrawer();
        const cur = state.history[state.cursor];
        if (cur && cur.id === q.id) {
          el.favBtn.setAttribute('aria-pressed', 'false');
          el.favBtn.querySelector('span').textContent = 'Save';
        }
        haptic(8);
      });

      row.append(main, x);
      el.drawerList.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------------- *
   * Copy + Share
   * ---------------------------------------------------------------------- */

  async function copyQuote() {
    const q = state.history[state.cursor];
    if (!q) return;
    const text = `"${q.t}"\n— ${q.a}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Copied to clipboard'); }
      catch { toast('Could not copy'); }
      ta.remove();
    }
    haptic(8);
  }

  async function shareQuote() {
    const q = state.history[state.cursor];
    if (!q) return;
    haptic(10);
    toast('Making your card…');

    try {
      const blob = await renderShareCard(q);
      const file = new File([blob], 'lucid-quote.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Lucid',
          text: `"${q.t}" — ${q.a}`
        });
        return;
      }

      // Fallback: download the PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lucid-quote.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Image downloaded');
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // user cancelled the sheet
      toast('Sharing not available');
    }
  }

  /** Draws a 1080×1350 shareable quote card and resolves with a PNG blob. */
  function renderShareCard(q) {
    return new Promise((resolve, reject) => {
      const W = 1080, H = 1350;
      const cv = el.canvas;
      const ctx = cv.getContext('2d');
      const accent = accentFor(q);
      const light = currentTheme() === 'light';

      /* The shared image follows whatever theme you're in — a light-mode
         card renders on warm paper, a dark-mode card on charcoal. */
      const T = light
        ? {
            base:  '#f2efe9',
            aurora: [0.30, 0.16, 0.18, 0.10],
            scrim: ['rgba(255,253,249,.42)', 'rgba(255,253,249,.10)', 'rgba(255,253,249,.55)'],
            glass: ['rgba(255,255,255,.80)', 'rgba(255,255,255,.55)', 'rgba(255,255,255,.72)'],
            edge:  'rgba(28,24,40,.10)',
            ink:   '#17141f',
            weight: 400,
            rule:  'rgba(28,24,40,.28)',
            author:'rgba(23,20,31,.62)',
            brand: 'rgba(23,20,31,.38)'
          }
        : {
            base:  '#08080b',
            aurora: [0.55, 0.28, 0.30, 0.16],
            scrim: ['rgba(6,6,10,.55)', 'rgba(6,6,10,.20)', 'rgba(6,6,10,.72)'],
            glass: ['rgba(255,255,255,.09)', 'rgba(255,255,255,.03)', 'rgba(255,255,255,.06)'],
            edge:  'rgba(255,255,255,.14)',
            ink:   '#f4f3f7',
            weight: 300,
            rule:  'rgba(255,255,255,.38)',
            author:'rgba(244,243,247,.62)',
            brand: 'rgba(244,243,247,.34)'
          };

      const draw = () => {
        ctx.clearRect(0, 0, W, H);

        // Base
        ctx.fillStyle = T.base;
        ctx.fillRect(0, 0, W, H);

        // Aurora
        blob(ctx, -60, -40, 700, accent, T.aurora[0]);
        blob(ctx, W + 60, 300, 620, light ? '#0e97b4' : '#22d3ee', T.aurora[1]);
        blob(ctx, 180, H + 60, 660, light ? '#db2777' : '#f472b6', T.aurora[2]);
        blob(ctx, W - 60, H - 120, 420, light ? '#c2740a' : '#fbbf24', T.aurora[3]);

        // Scrim
        const scrim = ctx.createLinearGradient(0, 0, 0, H);
        scrim.addColorStop(0, T.scrim[0]);
        scrim.addColorStop(0.45, T.scrim[1]);
        scrim.addColorStop(1, T.scrim[2]);
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, W, H);

        // Glass panel
        const P = 72, PW = W - P * 2, PH = H - P * 2;
        roundRect(ctx, P, P, PW, PH, 48);
        const glass = ctx.createLinearGradient(P, P, P + PW, P + PH);
        glass.addColorStop(0, T.glass[0]);
        glass.addColorStop(0.5, T.glass[1]);
        glass.addColorStop(1, T.glass[2]);
        ctx.fillStyle = glass;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = T.edge;
        ctx.stroke();

        // Quote text — auto-sized to fit
        const maxW = PW - 120;
        let size = 62;
        let lines = wrap(ctx, q.t, maxW, size);
        while ((lines.length * size * 1.32 > 620 || lines.length > 9) && size > 30) {
          size -= 2;
          lines = wrap(ctx, q.t, maxW, size);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lh = size * 1.32;
        const blockH = lines.length * lh;
        const top = H / 2 - blockH / 2 - 20;

        // Quote glyph, anchored just above the text block
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.fillStyle = accent;
        ctx.font = '700 120px Georgia, serif';
        ctx.fillText('“', W / 2, top - 76);
        ctx.restore();

        ctx.fillStyle = T.ink;
        ctx.font = `${T.weight} ${size}px Fraunces, Georgia, serif`;
        let y = top + lh / 2;
        lines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += lh; });

        // Rule
        const ruleY = top + blockH + 56;
        const rg = ctx.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(0.5, T.rule);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(W / 2 - 70, ruleY, 140, 2);

        // Author
        ctx.fillStyle = T.author;
        ctx.font = '500 26px Inter, sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
        ctx.fillText(q.a.toUpperCase(), W / 2, ruleY + 46);

        // Footer brand
        ctx.fillStyle = T.brand;
        ctx.font = '600 22px Inter, sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '7px';
        ctx.fillText('LUCID', W / 2, H - 118);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

        // Accent dot above the brand
        ctx.beginPath();
        ctx.arc(W / 2, H - 158, 5, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();

        cv.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      };

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw).catch(draw);
      else draw();
    });
  }

  function blob(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, alpha));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW, size) {
    ctx.font = `300 ${size}px Fraunces, Georgia, serif`;
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------------------------------------------------------------------- *
   * Gestures
   * ---------------------------------------------------------------------- */

  function bindGestures() {
    let startY = 0, startX = 0, dy = 0, dragging = false, pid = null;

    const onDown = (e) => {
      if (state.drawerOpen) return;
      // Never capture the pointer over a control — pointer capture would retarget
      // the resulting click to the card and the button would never fire.
      if (e.target.closest('button')) return;
      dragging = true;
      pid = e.pointerId;
      startY = e.clientY;
      startX = e.clientX;
      dy = 0;
      el.card.style.transition = 'none';
      el.card.setPointerCapture?.(pid);
    };

    const onMove = (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const rawY = e.clientY - startY;
      const rawX = e.clientX - startX;
      if (Math.abs(rawX) > Math.abs(rawY) * 1.6) return;   // horizontal → ignore (chips)
      dy = rawY;
      const damped = dy * 0.42;
      const op = Math.max(0.35, 1 - Math.abs(dy) / 420);
      const sc = Math.max(0.94, 1 - Math.abs(dy) / 2600);
      el.card.style.transform = `translate3d(0, ${damped}px, 0) scale(${sc})`;
      el.card.style.opacity = String(op);
    };

    const onUp = (e) => {
      if (!dragging || (pid !== null && e.pointerId !== pid)) return;
      dragging = false;
      el.card.releasePointerCapture?.(pid);
      pid = null;
      el.card.style.transition = 'transform .42s cubic-bezier(.22,1,.36,1), opacity .3s ease';

      if (Math.abs(dy) > SWIPE_THRESHOLD) {
        haptic(12);
        hideHint();
        nextQuote(dy < 0 ? 1 : -1);
      } else {
        el.card.style.transform = '';
        el.card.style.opacity = '';
      }
      dy = 0;
      setTimeout(() => { el.card.style.transition = ''; }, 440);
    };

    el.card.addEventListener('pointerdown', onDown);
    el.card.addEventListener('pointermove', onMove);
    el.card.addEventListener('pointerup', onUp);
    el.card.addEventListener('pointercancel', onUp);
  }
  function bounce() {
    el.card.style.transition = 'transform .38s cubic-bezier(.22,1,.36,1)';
    el.card.style.transform = 'translate3d(0, 10px, 0)';
    setTimeout(() => {
      el.card.style.transform = '';
      setTimeout(() => { el.card.style.transition = ''; }, 380);
    }, 90);
  }

  /* ---------------------------------------------------------------------- *
   * Events
   * ---------------------------------------------------------------------- */

  function bindEvents() {
    bindGestures();

    el.shuffleBtn.addEventListener('click', () => {
      haptic(12);
      hideHint();
      el.shuffleBtn.classList.remove('is-spin');
      void el.shuffleBtn.offsetWidth;
      el.shuffleBtn.classList.add('is-spin');
      // Always pull something genuinely new
      state.history = state.history.slice(0, state.cursor + 1);
      nextQuote(1);
    });

    el.favBtn.addEventListener('click', toggleFav);
    el.copyBtn.addEventListener('click', copyQuote);
    el.shareBtn.addEventListener('click', shareQuote);

    el.todayBtn.addEventListener('click', () => {
      haptic(10);
      hideHint();
      state.history = [];
      state.cursor = -1;
      showQuoteOfTheDay();
      closeDrawer();
      toast('Quote of the day');
    });

    el.themeBtn.addEventListener('click', toggleTheme);
    el.favViewBtn.addEventListener('click', toggleDrawer);
    el.favViewBtn2.addEventListener('click', toggleDrawer);
    el.drawerClose.addEventListener('click', closeDrawer);
    el.brandBtn.addEventListener('click', () => { closeDrawer(); hideHint(); nextQuote(1); });

    // Double-tap the card to save (ignore taps that land on a control)
    let lastTap = 0;
    el.card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const now = Date.now();
      if (now - lastTap < 300) { toggleFav(); lastTap = 0; return; }
      lastTap = now;
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault(); hideHint(); nextQuote(1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault(); nextQuote(-1);
      } else if (e.key.toLowerCase() === 's') { toggleFav(); }
      else if (e.key.toLowerCase() === 'c') { copyQuote(); }
      else if (e.key.toLowerCase() === 't') { toggleTheme(); }
      else if (e.key === 'Escape') { closeDrawer(); }
    });

    // Auto-hide the hint after a few seconds
    setTimeout(hideHint, 6000);
  }

  function hideHint() { el.hint.classList.add('is-hidden'); }

  /* ---------------------------------------------------------------------- *
   * Utils
   * ---------------------------------------------------------------------- */

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-on'), 1900);
  }

  function haptic(pattern) {
    try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* noop */ }
  }

  function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'q' + (h >>> 0).toString(36);
  }

  function seededRand(seed) {
    let x = seed * 9301 + 49297;
    x = x % 233280;
    return Math.abs(Math.floor((x / 233280) * 1e6));
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;     // SW can't run from file://
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline is a bonus */ });
    });
  }

  /* ---------------------------------------------------------------------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
