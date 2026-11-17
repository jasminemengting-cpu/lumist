/* LUMIST Estate — a year on the vine.
   Click the Chardonnay and Pinot Noir sketch: the vines go from bare winter wood
   to budbreak, flowering, fruit set, colour change, harvest and falling leaves,
   then rest again. Click again to return to the still drawing. */
(() => {
  const img = document.querySelector('img.estate-art[src*="03-vineyard-row"]');
  if (!img) return;
  const fig = img.closest('figure');
  if (!fig || fig.dataset.vines) return;
  fig.dataset.vines = '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const stage = document.createElement('div');
  stage.className = 'vine-stage';
  img.parentNode.insertBefore(stage, img);
  stage.appendChild(img);
  const canvas = document.createElement('canvas');
  canvas.className = 'vine-layer';
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const css = document.createElement('style');
  css.textContent = `.vine-stage{position:relative;cursor:pointer;line-height:0}
.vine-stage img{display:block;width:100%;height:auto;transition:opacity 1.2s ease}
.vine-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 1.2s ease}
.vine-stage.on img{opacity:0}
.vine-stage.on .vine-layer{opacity:1}
.vine-stage:focus-visible{outline:1px solid #888;outline-offset:4px}`;
  document.head.appendChild(css);
  stage.tabIndex = 0;
  stage.setAttribute('role', 'button');
  stage.setAttribute('aria-pressed', 'false');
  stage.setAttribute('aria-label', 'Show a year on the vine: budbreak, flowering, fruit, colour change, harvest and falling leaves');
  const cap = fig.querySelector('figcaption');
  if (cap && !cap.querySelector('.vine-hint')) {
    const hint = document.createElement('span');
    hint.className = 'vine-hint';
    hint.textContent = ' Click the vines to watch a year go by.';
    cap.appendChild(hint);
  }

  const bare = new Image();
  bare.src = img.src.replace('03-vineyard-row-pencil-transparent', '03-vineyard-row-bare');
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--display').trim()) || 'Georgia, serif';

  // Drawn in the sketch's own pixel space (1774 × 887).
  const IW = 1774, IH = 887, CORDON = 506;
  const INK = 'rgba(52,52,49,';
  let seed = 1, boil = 0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - .5; };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
  const span = (p, a, b) => smooth((p - a) / (b - a));

  function pencil(points, alpha = .8, width = 1.6, closed = false, key = 0) {
    for (let pass = 0; pass < 2; pass++) {
      seed = 131 + boil * 29 + pass * 11 + key;
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        const jx = x + rnd() * 1.4, jy = y + rnd() * 1.4;
        i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy);
      });
      if (closed) ctx.closePath();
      ctx.strokeStyle = INK + (pass ? alpha * .4 : alpha) + ')';
      ctx.lineWidth = pass ? width * .65 : width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // A grape leaf: five lobes, toothed edge, veins; shade deepens in autumn.
  function leaf(x, y, size, angle, alpha, autumn, key) {
    if (size < 1.5 || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40 * Math.PI * 2;
      const lobe = .72 + .28 * Math.cos(5 * (t - Math.PI / 2));
      const tooth = 1 + .06 * Math.sin(t * 23);
      const sinus = Math.abs(Math.sin((t - Math.PI / 2) / 2)) < .12 ? .55 : 1;   // the notch at the stalk
      const r = size * lobe * tooth * sinus;
      pts.push([Math.cos(t) * r, -size * .55 + Math.sin(t) * r * .92]);
    }
    if (autumn > 0) {           // grey shading for turning leaves
      ctx.fillStyle = `rgba(90,90,86,${alpha * autumn * .28})`;
      ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.fill();
    }
    ctx.fillStyle = `rgba(242,242,240,${alpha * .85 * (1 - autumn * .6)})`;
    ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.fill();
    pencil(pts, .75 * alpha, 1.3, true, key);
    for (let v = -2; v <= 2; v++) {
      const t = -Math.PI / 2 + v * .62;
      pencil([[0, 0], [Math.cos(t) * size * .78, -size * .55 + Math.sin(t) * size * .7]], .45 * alpha, .9, false, key + v);
    }
    ctx.restore();
  }

  // Where the vines grow, measured from the drawing.
  const VINES = [
    { shoots: [[300, -1], [372, 1], [632, -1], [712, 1]], bunches: [400, 578], dark: false },
    { shoots: [[1092, -1], [1150, 1], [1404, -1], [1472, 1]], bunches: [1200, 1362], dark: true },
  ];

  function shootPath(x0, lean, g) {
    const len = 300 * g;
    return t => [x0 + lean * 34 * t * t * g + Math.sin(t * 3 + x0) * 6 * g, CORDON - len * t];
  }

  function bunch(x, flower, berry, colour, dark, harvest, key) {
    const alpha = 1 - harvest;
    if (alpha <= 0) return;
    const top = CORDON + 24;
    pencil([[x, CORDON + 2], [x - 2, top]], .7 * alpha, 1.3, false, key);
    const rows = [5, 5, 4, 4, 3, 2, 1];
    if (berry <= 0) {           // flowering: a fine cone of tiny buds and blossoms
      if (flower <= 0) return;
      ctx.fillStyle = INK + .55 * alpha * flower + ')';
      rows.forEach((n, r) => {
        for (let i = 0; i < n; i++) {
          const bx = x + (i - (n - 1) / 2) * 6, by = top + 4 + r * 6;
          ctx.beginPath(); ctx.arc(bx, by, 1.6 * flower, 0, Math.PI * 2); ctx.fill();
          if (flower > .6 && (i + r) % 2) pencil([[bx - 2.5, by - 2.5], [bx + 2.5, by + 2.5]], .35 * alpha, .7, false, key + i + r * 7);
        }
      });
      return;
    }
    const rad = 2.4 + berry * 6.2, step = rad * 1.75;
    rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) {
        const bx = x + (i - (n - 1) / 2) * step + (r % 2 ? step * .25 : 0);
        const by = top + rad + r * step * .86;
        const shade = dark ? .1 + colour * .72 : .06 + colour * .18;
        ctx.fillStyle = `rgba(40,40,38,${shade * alpha})`;
        ctx.beginPath(); ctx.arc(bx, by, rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK + .7 * alpha + ')'; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${.7 * alpha})`;
        ctx.beginPath(); ctx.arc(bx - rad * .35, by - rad * .38, Math.max(.8, rad * .2), 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function stageName(m) {
    if (m < 2.2) return 'Winter · the vines rest';
    if (m < 3.9) return 'Spring · budbreak';
    if (m < 5) return 'Spring · shoots and leaves';
    if (m < 5.8) return 'Late spring · flowering';
    if (m < 6.9) return 'Summer · fruit set';
    if (m < 7.7) return 'Summer · the grapes change colour';
    if (m < 8.8) return 'Harvest';
    if (m < 11) return 'Autumn · the leaves turn and fall';
    return 'Winter · pruning, then rest';
  }

  function scene(p) {
    const m = p * 12;                                     // months since January
    if (bare.complete && bare.naturalWidth) ctx.drawImage(bare, 0, 0, IW, IH);
    const g = span(m, 2.2, 6.6);                          // shoot growth
    const flower = span(m, 4.6, 5.2) * (1 - span(m, 5.6, 6.0));
    const berry = span(m, 5.6, 7.4);
    const colour = span(m, 6.9, 7.7);
    const harvest = span(m, 8.0, 8.8);
    const autumn = span(m, 8.8, 9.8);
    const fall = span(m, 9.6, 11.2);
    const buds = span(m, 2.2, 3.2);
    const prune = 1 - span(m, 11, 11.8);                  // winter pruning clears the old canes
    VINES.forEach((vine, vi) => {
      vine.shoots.forEach(([x0, lean], si) => {
        const key = vi * 100 + si * 10;
        if (g > .02 && prune > 0) {
          const path = shootPath(x0, lean, g);
          const pts = []; for (let i = 0; i <= 10; i++) pts.push(path(i / 10));
          ctx.globalAlpha = (1 - fall * .85) * prune;
          pencil(pts, .75, 1.7, false, key);
          // a curling tendril near the tip
          if (g > .5) {
            const [tx, ty] = path(.82);
            const curl = []; for (let k = 0; k <= 14; k++) { const a = k * .7; curl.push([tx + lean * (8 + Math.cos(a) * (8 - k * .45)), ty - 6 + Math.sin(a) * (8 - k * .45)]); }
            pencil(curl, .5, 1, false, key + 3);
          }
          ctx.globalAlpha = 1;
          // leaves at alternate nodes, unfolding as the shoot passes them
          for (let n = 1; n <= 5; n++) {
            const t = n / 5.6;
            const grow = clamp01((g - t * .85) * 3.2);
            if (grow <= 0) continue;
            const [lx, ly] = path(t);
            const side = (n + si) % 2 ? 1 : -1;
            const size = (14 + 30 * grow) * (n === 5 ? .7 : 1);
            const delay = ((n * 37 + si * 13 + vi * 7) % 10) / 10;
            const drop = clamp01(fall * 1.6 - delay * .6);
            const dx = side * size * .9 + Math.sin(drop * 6 + n) * 30 * drop;
            const dy = drop * (720 - ly) * drop;
            leaf(lx + dx, ly - 4 + dy, size, side * .55 + drop * side * 2.4, 1 - clamp01((drop - .7) / .3), autumn, key + n);
          }
        } else if (buds > 0 && buds < 1) {
          // swelling buds on the bare wood
          ctx.fillStyle = INK + .6 * buds + ')';
          ctx.beginPath(); ctx.ellipse(x0, CORDON - 6, 3 * buds, 5 * buds, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
      vine.bunches.forEach((bx, bi) => bunch(bx, flower, berry, colour, vine.dark, harvest, vi * 50 + bi * 5));
    });

    // The calendar: season name and a thin year line with a moving mark.
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `34px ${font}`;
    ctx.fillStyle = 'rgba(40,40,38,.85)';
    ctx.fillText(stageName(m), IW / 2, 70);
    const x0 = 560, x1 = 1214, y = 128;
    pencil([[x0, y], [x1, y]], .45, 1.1, false, 900);
    ctx.font = `16px ${font}`;
    MONTHS.forEach((name, i) => {
      const x = x0 + (x1 - x0) * (i + .5) / 12;
      pencil([[x, y - 4], [x, y + 4]], .4, 1, false, 910 + i);
      ctx.fillStyle = `rgba(40,40,38,${Math.floor(m) === i ? .9 : .4})`;
      ctx.fillText(name.toUpperCase(), x, y + 22);
    });
    const mx = x0 + (x1 - x0) * p;
    ctx.fillStyle = 'rgba(40,40,38,.85)';
    ctx.beginPath(); ctx.arc(mx, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const YEAR = 26;                                         // seconds for one year
  let on = false, frame = 0, start = 0, lastBoil = 0;
  function size() {
    const w = img.clientWidth, h = img.clientHeight;
    if (!w) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function paint(p) {
    ctx.setTransform(canvas.width / IW, 0, 0, canvas.height / IH, 0, 0);
    ctx.clearRect(0, 0, IW, IH);
    scene(p);
  }
  function tick(now) {
    frame = 0;
    if (!on || !stage.isConnected) return;
    if (!start) start = now;
    if (now - lastBoil > 150) { boil = (boil + 1) % 4; lastBoil = now; }
    paint(((now - start) / 1000 / YEAR) % 1);
    frame = requestAnimationFrame(tick);
  }
  function setOn(v) {
    on = v;
    stage.classList.toggle('on', on);
    stage.setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(frame); frame = 0;
    if (on) {
      size(); start = 0;
      if (reduce.matches) paint(7.2 / 12); else frame = requestAnimationFrame(tick);
    }
  }
  bare.addEventListener('load', () => { if (on && reduce.matches) paint(7.2 / 12); });
  stage.addEventListener('click', () => setOn(!on));
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn(!on); } });
  addEventListener('resize', () => { if (on) { size(); if (reduce.matches) paint(7.2 / 12); } });
  // expose for checks
  stage._paintAt = p => { cancelAnimationFrame(frame); frame = 0; on = false; size(); paint(p); };
})();
