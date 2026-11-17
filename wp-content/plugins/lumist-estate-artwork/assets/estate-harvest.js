/* LUMIST Estate — harvest day.
   Click the two-counties sketch: pencil-drawn pickers fill a bin in the Sonoma
   vineyard, and a small truck carries the bins along the harvest route to the
   Napa winery. Click again and the scene fades away. */
(() => {
  const img = document.querySelector('img.estate-art[src*="05-two-counties"]');
  if (!img) return;
  const fig = img.closest('figure');
  if (!fig || fig.dataset.harvest) return;
  fig.dataset.harvest = '1';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Stage: a canvas laid exactly over the sketch.
  const stage = document.createElement('div');
  stage.className = 'harvest-stage';
  img.parentNode.insertBefore(stage, img);
  stage.appendChild(img);
  const canvas = document.createElement('canvas');
  canvas.className = 'harvest-layer';
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const css = document.createElement('style');
  css.textContent = `.harvest-stage{position:relative;cursor:pointer;line-height:0}
.harvest-stage img{display:block;width:100%;height:auto}
.harvest-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 1.2s ease}
.harvest-stage.on .harvest-layer{opacity:1}
.harvest-stage:focus-visible{outline:1px solid #888;outline-offset:4px}`;
  document.head.appendChild(css);
  stage.tabIndex = 0;
  stage.setAttribute('role', 'button');
  stage.setAttribute('aria-pressed', 'false');
  stage.setAttribute('aria-label', 'Show harvest day on the sketch: pickers in the Sonoma vineyard and a truck carrying bins to the Napa winery');
  const cap = fig.querySelector('figcaption');
  if (cap && !cap.querySelector('.harvest-hint')) {
    const hint = document.createElement('span');
    hint.className = 'harvest-hint';
    hint.textContent = ' Click the sketch to watch harvest day.';
    cap.appendChild(hint);
  }

  // Everything below is drawn in the sketch's own pixel space (1774 × 887).
  const IW = 1774, IH = 887;
  const INK = 'rgba(232,231,224,';
  let seed = 1, boil = 0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - .5; };

  // A pencil line: two slightly different passes, re-drawn a few times a second.
  function pencil(points, alpha = .85, width = 1.6, closed = false) {
    for (let pass = 0; pass < 2; pass++) {
      seed = 97 + boil * 31 + pass * 7 + points.length * 13 + Math.round(points[0][0] * 3);
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        const jx = x + rnd() * 1.6, jy = y + rnd() * 1.6;
        i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy);
      });
      if (closed) ctx.closePath();
      ctx.strokeStyle = INK + (pass ? alpha * .45 : alpha) + ')';
      ctx.lineWidth = pass ? width * .7 : width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }
  function circle(x, y, r, alpha = .85, width = 1.4, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    pencil(pts, alpha, width);
  }
  function hatch(x, y, w, h, alpha = .35, gap = 4) {
    const pts = [];
    for (let i = 0; i < w + h; i += gap) {
      pencil([[x + Math.max(0, i - h), y + Math.min(h, i)], [x + Math.min(w, i), y + Math.max(0, i - w)]], alpha, .9);
    }
  }
  function grapes(x, y, n, alpha) {
    for (let i = 0; i < n; i++) {
      const gx = x + ((i * 7) % 11) - 5, gy = y - Math.floor(i / 4) * 3 + ((i * 3) % 4) - 1;
      ctx.beginPath(); ctx.arc(gx, gy, 2.3, 0, Math.PI * 2);
      ctx.strokeStyle = INK + alpha * .8 + ')'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // A picking bin: open top, slatted sides, grapes heaped by how full it is.
  function bin(x, y, fill, alpha = 1) {
    const w = 30, h = 18;
    pencil([[x - w / 2, y - h], [x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h]], .85 * alpha, 1.5);
    pencil([[x - w / 2, y - h], [x + w / 2, y - h]], .5 * alpha, 1.1);
    pencil([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2]], .35 * alpha, .9);
    if (fill > 0) {
      const n = Math.round(fill * 14);
      for (let i = 0; i < n; i++) {
        const gx = x - 11 + (i % 6) * 4.4 + (Math.floor(i / 6) % 2) * 2.2;
        const gy = y - h - 1 - Math.floor(i / 6) * 3.4;
        ctx.beginPath(); ctx.arc(gx, gy, 2.4, 0, Math.PI * 2);
        ctx.strokeStyle = INK + .75 * alpha + ')'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  // A picker with a wide hat: bends to the vine, then drops the cluster in the bin.
  function picker(x, y, t, dir, offset) {
    const cycle = (t * .55 + offset) % 1;                  // one pick every ~1.8 s
    const reach = cycle < .5 ? Math.sin(cycle / .5 * Math.PI) : 0;
    const drop = cycle >= .5 ? Math.sin((cycle - .5) / .5 * Math.PI) : 0;
    const bend = .25 + reach * .35;                        // lean toward the vines
    const hip = [x, y - 22];
    const neck = [x + dir * Math.sin(bend) * 22, y - 22 - Math.cos(bend) * 22];
    const head = [neck[0] + dir * Math.sin(bend) * 6, neck[1] - Math.cos(bend) * 6];
    pencil([[x - 6, y], hip, [x + 6, y]], .85, 1.7);       // legs
    pencil([hip, neck], .9, 1.9);                          // back
    circle(head[0], head[1], 4.6, .85, 1.3, 10);
    pencil([[head[0] - 9, head[1] - 3], [head[0] + 9, head[1] - 3]], .9, 1.5);   // brim
    pencil([[head[0] - 4, head[1] - 3], [head[0] - 3, head[1] - 8], [head[0] + 3, head[1] - 8], [head[0] + 4, head[1] - 3]], .8, 1.3);
    // arms: reach up and forward to the vine, or down and back to the bin
    const hand = [neck[0] + dir * (8 + reach * 12) - dir * drop * 18, neck[1] + 10 - reach * 14 + drop * 12];
    const elbow = [(neck[0] + hand[0]) / 2 + dir * 2, (neck[1] + hand[1]) / 2 + 4];
    pencil([neck, elbow, hand], .85, 1.4);
    pencil([neck, [neck[0] - dir * 3, neck[1] + 10], [neck[0] + dir * 2, neck[1] + 17]], .6, 1.2);
    if (reach > .4 || drop > .05) grapes(hand[0], hand[1] + 4, 5, .9);
  }

  // A small flatbed truck facing right, wheels turning.
  function truck(x, y, angle, roll, loads, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha;
    const r = 6.5;
    // bed and chassis
    pencil([[-40, -r - 4], [12, -r - 4], [12, -r - 10], [-40, -r - 10], [-40, -r - 4]], .9, 1.6);
    // cab
    pencil([[12, -r - 4], [12, -r - 30], [26, -r - 30], [34, -r - 18], [38, -r - 16], [38, -r - 4], [12, -r - 4]], .9, 1.7);
    pencil([[15, -r - 27], [25, -r - 27], [31, -r - 18], [15, -r - 18], [15, -r - 27]], .55, 1.1);   // window
    hatch(16, -r - 26, 8, 7, .25, 3);
    // wheels with spokes
    for (const wx of [-26, 26]) {
      circle(wx, -r, r, .9, 1.6, 12);
      for (let k = 0; k < 3; k++) {
        const a = roll + k * Math.PI / 3;
        pencil([[wx - Math.cos(a) * r * .8, -r - Math.sin(a) * r * .8], [wx + Math.cos(a) * r * .8, -r + Math.sin(a) * r * .8]], .5, .9);
      }
    }
    loads.forEach((a, i) => { if (a > 0) { ctx.globalAlpha = alpha * a; bin(-27 + i * 30, -r - 10, 1, 1); ctx.globalAlpha = alpha; } });
    ctx.restore();
  }

  // The dotted harvest route on the sketch, as a curve.
  const P0 = [560, 468], C = [866, 366], P2 = [1172, 462];
  const at = u => [
    (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * C[0] + u * u * P2[0],
    (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * C[1] + u * u * P2[1],
  ];
  const slope = u => Math.atan2(2 * (1 - u) * (C[1] - P0[1]) + 2 * u * (P2[1] - C[1]), 2 * (1 - u) * (C[0] - P0[0]) + 2 * u * (P2[0] - C[0]));
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  const LOOP = 16, U0 = .085, U1 = .875;
  function scene(t) {
    const s = t % LOOP;
    // pickers between the rows, and the bin they fill
    const fill = clamp01(s / 5);
    const binOnGround = s < 5 ? 1 : clamp01(1 - (s - 5) / .6);
    bin(410, 548, s < 5 ? fill : 1, binOnGround);
    picker(372, 552, t, 1, 0);
    picker(452, 556, t, -1, .45);
    // the truck: waits, drives the route, unloads, then comes round again
    let u = 0, alpha = 1, loads = [1, clamp01((s - 5) / .6)];
    if (s < 1) alpha = s;
    if (s >= 6 && s < 13) u = ease((s - 6) / 7);
    if (s >= 13) { u = 1; loads = loads.map(() => clamp01(1 - (s - 13.4) / .8)); }
    if (s >= 15) alpha = clamp01(LOOP - s);
    const v = U0 + (U1 - U0) * u;                  // park clear of the vines and the barn
    const [x, y] = at(v);
    truck(x, y - 1, slope(v) * .45, u * 26, loads, alpha);
  }

  let on = false, frame = 0, start = 0, lastBoil = 0;
  function size() {
    const w = img.clientWidth, h = img.clientHeight;
    if (!w) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function paint(t) {
    const k = canvas.width / IW;
    ctx.setTransform(k, 0, 0, canvas.height / IH, 0, 0);
    ctx.clearRect(0, 0, IW, IH);
    scene(t);
  }
  function tick(now) {
    frame = 0;
    if (!on || !stage.isConnected) return;
    if (!start) start = now;
    if (now - lastBoil > 140) { boil = (boil + 1) % 4; lastBoil = now; }
    paint((now - start) / 1000);
    frame = requestAnimationFrame(tick);
  }
  function setOn(v) {
    on = v;
    stage.classList.toggle('on', on);
    stage.setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(frame); frame = 0;
    if (on) {
      size(); start = 0;
      if (reduce.matches) paint(10); else frame = requestAnimationFrame(tick);
    }
  }
  stage.addEventListener('click', () => setOn(!on));
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn(!on); } });
  addEventListener('resize', () => { if (on) { size(); if (reduce.matches) paint(10); } });
})();
