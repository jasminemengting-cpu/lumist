/* LUMIST Estate — a year on the vine.
   Click the Chardonnay and Pinot Noir sketch to watch one Carneros growing year
   on a spur-pruned, vertically trained cordon: dormant canes, pruning to two-bud
   spurs, woolly buds, budbreak, shoots climbing between the catch wires with
   alternate leaves, flower clusters opposite the basal leaves and tendrils
   opposite the upper ones, flowering, fruit set, leaf thinning around the fruit,
   berries swelling and colouring berry by berry, an early pick for sparkling
   wine, canes hardening, leaves turning and falling. Click again to return to
   the still drawing. */
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
  stage.setAttribute('aria-label', 'Show a year on the vine, from dormant canes and budbreak to flowering, fruit, harvest and falling leaves');
  const cap = fig.querySelector('figcaption');
  if (cap && !cap.querySelector('.vine-hint')) {
    const hint = document.createElement('span');
    hint.className = 'vine-hint';
    hint.textContent = ' Click the vines to watch a year go by.';
    cap.appendChild(hint);
  }

  const bare = new Image();
  bare.src = img.src.replace('03-vineyard-row-pencil-transparent', '03-vineyard-row-bare').split('?')[0] + '?v=2';
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--display').trim()) || 'Georgia, serif';

  // ---------- helpers ----------
  const IW = 1774, IH = 887, CORD = 499, GROUND = 700;
  const TOP_WIRE = 310;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
  const span = (m, a, b) => smooth((m - a) / (b - a));
  const mix = (a, b, t) => a + (b - a) * t;
  function rng(s) { s = s % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  let jitterSeed = 1, boil = 0;
  const jit = () => { jitterSeed = jitterSeed * 16807 % 2147483647; return jitterSeed / 2147483647 - .5; };
  const ink = a => `rgba(48,47,44,${a})`;

  // A hand-drawn line: one firm pass, one lighter pass slightly off it.
  function pencil(pts, alpha, width, key, closed) {
    for (let pass = 0; pass < 2; pass++) {
      jitterSeed = 7 + Math.abs(key * 31 + boil * 977 + pass * 13) % 2147483000;
      const j = pass ? 1.3 : .8;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i][0] + jit() * j, y = pts[i][1] + jit() * j;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (closed) ctx.closePath();
      ctx.strokeStyle = ink(pass ? alpha * .35 : alpha);
      ctx.lineWidth = pass ? width * .6 : width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // ---------- the leaf ----------
  // Built from its lobes, like a botanical drawing: a pointed middle lobe, two
  // upper and two lower side lobes, the petiolar lobes either side of the
  // stalk, and a toothed margin between every tip and sinus. Unit leaf, blade
  // pointing up (-y) from the petiole junction at (0,0); about 1 wide, 1 tall.
  function makeLeaf(v, seed) {
    const r = rng(seed);
    const pol = (a, d) => [Math.sin(a) * d * .7, -Math.cos(a) * d * .7];
    const wob = () => 1 + (r() - .5) * .06;
    // [angle, radius, isTip]
    const keys = [
      [0, 1.0 * wob(), 1],
      [.5, v.sinU * wob(), 0],
      [.98, .9 * wob(), 1],
      [1.45, v.sinL * wob(), 0],
      [1.92, .66 * wob(), 1],
      [2.5, .44 * wob(), 0],
      [v.petLobe, .4 * wob(), 1],
      [v.petSinus, .1, 0],
    ];
    const ring = [];
    keys.forEach(k => ring.push(k));
    for (let i = keys.length - 2; i >= 0; i--) ring.push([-keys[i][0], keys[i][1] * wob(), keys[i][2]]);
    // reorder from the right petiolar sinus round the top to the left one
    const seq = ring.slice(keys.length - 1).reverse().concat(ring.slice(0, keys.length).slice(0, -1).reverse().reverse());
    const order = [];
    for (let i = keys.length - 1; i >= 0; i--) order.push([-keys[i][0], keys[i][1], keys[i][2]]);
    for (let i = 1; i < keys.length; i++) order.push(keys[i]);
    const pts = [];
    for (let i = 0; i < order.length - 1; i++) {
      const A = pol(order[i][0], order[i][1]), B = pol(order[i + 1][0], order[i + 1][1]);
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const n = Math.max(2, Math.round(len / .075));
      const nx = (B[1] - A[1]) / len, ny = -(B[0] - A[0]) / len;   // outward normal (clockwise ring)
      const toTip = order[i + 1][2] ? 1 : -1;                         // teeth lean toward the lobe tip
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const bulge = Math.sin(Math.PI * t) * len * (order[i + 1][2] ? .16 : .1);   // margins swell between tips and sinuses
        const bx = A[0] + (B[0] - A[0]) * t - nx * bulge, by = A[1] + (B[1] - A[1]) * t - ny * bulge;
        pts.push([bx, by]);
        const t2 = (k + .5 + toTip * .3) / n;
        const tooth = (.028 + r() * .018) * (order[i + 1][1] < .2 || order[i][1] < .2 ? .3 : 1);
        const bulge2 = Math.sin(Math.PI * t2) * len * (order[i + 1][2] ? .16 : .1);
        pts.push([A[0] + (B[0] - A[0]) * t2 - nx * (tooth + bulge2), A[1] + (B[1] - A[1]) * t2 - ny * (tooth + bulge2)]);
      }
    }
    pts.push(pol(order[order.length - 1][0], order[order.length - 1][1]));
    const veins = [];
    const J = [0, -.07];
    keys.filter(k => k[2]).forEach(k => {
      for (const sg of k[0] ? [1, -1] : [1]) {
        const tip = pol(sg * k[0], k[1] * .93);
        const mid = [(J[0] + tip[0]) / 2 + (r() - .5) * .02, (J[1] + tip[1]) / 2 + (r() - .5) * .02];
        veins.push([J, mid, tip]);
        if (k[1] > .6) for (const t of [.38, .66]) {                  // secondary veins toward the teeth
          const p = [J[0] + (tip[0] - J[0]) * t, J[1] + (tip[1] - J[1]) * t];
          for (const sd of [-1, 1]) {
            const a = sg * k[0] + sd * .75;
            veins.push([p, [p[0] + Math.sin(a) * .16, p[1] - Math.cos(a) * .16]]);
          }
        }
      }
    });
    return { pts, veins, J, dark: v.dark };
  }

  function drawLeaf(L, x, y, size, angle, squash, alpha, autumn, back, key) {
    if (size < 2 || alpha <= .01) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    const T = ([a, b]) => [x + (a * size * squash) * c - (b * size) * s, y + (a * size * squash) * s + (b * size) * c];
    const outline = L.pts.map(T);
    // body
    ctx.beginPath();
    outline.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b));
    ctx.closePath();
    const paper = back ? 233 : 245;
    ctx.fillStyle = `rgba(${paper},${paper},${paper - 2},${alpha * .95})`;
    ctx.fill();
    // tone: pencil hatching, heavier as the leaf turns
    ctx.save(); ctx.clip();
    const tone = (back ? .24 : .15) + autumn * (L.dark ? .34 : .13);
    ctx.strokeStyle = ink(alpha * tone); ctx.lineWidth = .8;
    ctx.beginPath();
    for (let k = -size; k < size; k += 5) { ctx.moveTo(x + k - size * .4, y - size * 1.1); ctx.lineTo(x + k + size * .4, y + size * .2); }
    ctx.stroke();
    if (autumn > .2) {
      ctx.strokeStyle = ink(alpha * autumn * (L.dark ? .3 : .12));
      ctx.beginPath();
      for (let k = -size; k < size; k += 7) { ctx.moveTo(x + k + size * .4, y - size * 1.1); ctx.lineTo(x + k - size * .4, y + size * .2); }
      ctx.stroke();
    }
    // the lit side of the blade
    const [hx, hy] = T([-.2, -.62]);
    const lit = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * .42);
    lit.addColorStop(0, `rgba(${paper},${paper},${paper},${alpha * .7})`); lit.addColorStop(1, `rgba(${paper},${paper},${paper},0)`);
    ctx.fillStyle = lit; ctx.fillRect(x - size * 1.2, y - size * 1.3, size * 2.4, size * 1.6);
    ctx.restore();
    pencil(outline, alpha * (back ? .42 : .62), back ? .85 : 1.05, key, true);
    L.veins.forEach((v, i) => pencil(v.map(T), alpha * (back ? .28 : .48), i % 5 === 0 ? 1 : .75, key * 7 + i));
    
  }

  // ---------- the vines ----------
  // Spur positions are the knobs on the drawn cordons.
  const VINES = [
    { dark: false, sinU: .78, sinL: .62, petLobe: 2.72, petSinus: 2.95, leaf: 64, spurs: [255, 305, 382, 438, 560, 625, 712, 770] },        // Chardonnay
    { dark: true, sinU: .66, sinL: .52, petLobe: 3.08, petSinus: 3.14, leaf: 61, spurs: [1035, 1095, 1175, 1232, 1336, 1400, 1470, 1530] }, // Pinot Noir
  ];

  // A cluster: berries on a shouldered cone with a small wing (Chardonnay),
  // or a compact, cylindrical pine-cone shape (Pinot Noir).
  function makeCluster(v, r) {
    const berries = [];
    const len = v.dark ? 60 : 66, R = v.dark ? 5.2 : 5.6;
    const rows = Math.round(len / (R * 1.45));
    for (let i = 0; i < rows; i++) {
      const u = i / (rows - 1);
      const width = v.dark ? 24 * (1 - .45 * u * u) : 30 * Math.pow(1 - u, .75) + 3;
      const count = Math.max(1, Math.round(width / (R * 1.5)));
      for (let k = 0; k < count; k++) {
        const across = count === 1 ? 0 : (k / (count - 1) - .5) * width;
        berries.push({ u: i * R * 1.45 + (r() - .5) * 2, v: across + (i % 2 ? R * .5 : 0) + (r() - .5) * 2, z: r(), t: r(), rr: .85 + r() * .25 });
      }
    }
    if (!v.dark) {
      for (let k = 0; k < 4; k++) berries.push({ u: 6 + k * 5, v: 20 + k * 3 + (r() - .5) * 3, z: r() * .4, t: r(), rr: .8 + r() * .2 });
    }
    berries.sort((a, b) => a.z - b.z);
    return { berries, R, len, delay: r(), hang: (r() - .5) * .25 };
  }

  const shoots = [];
  VINES.forEach((v, vi) => {
    const shapes = [0, 1, 2].map(k => makeLeaf(v, 400 + vi * 50 + k));
    v.spurs.forEach((x0, si) => {
      const r = rng(1000 + vi * 100 + si * 17);
      const back = si % 2 === 1;
      const L = 318 + r() * 42;
      const sh = { v, x0: x0 + (r() - .5) * 6, back, L, lean: (r() - .5) * .07, droop: (r() - .5) * 1.4, nodes: [], key: vi * 1000 + si * 60 + 11 };
      let s = 0, side = r() < .5 ? -1 : 1, n = 0;
      const gaps = [20, 26, 32, 38, 42, 44, 44, 42, 40, 36, 30];
      for (;;) {
        s += gaps[Math.min(n, gaps.length - 1)] * (.92 + r() * .16);
        if (s > L) break;
        n++;
        const node = {
          s, n, side, leaf: shapes[Math.floor(r() * 3)],
          size: v.leaf * [.62, .78, .9, 1, 1.04, 1, .96, .9, .8, .66, .5][Math.min(n - 1, 10)] * (back ? .9 : 1),
          squash: .62 + r() * .38, tilt: .55 + r() * .5, delay: r(), drift: (r() - .5) * 120, spin: (r() - .5) * 6,
        };
        // the grapevine pattern: clusters opposite the 3rd and 4th leaves,
        // tendrils opposite the leaves above, every third node without either
        if (n === 3 || (n === 4 && r() < .7)) node.cluster = makeCluster(v, r);
        else if (n >= 5 && (n % 3) !== 1) node.tendril = { len: 26 + r() * 16, turns: 2.2 + r() * 1.5 };
        sh.nodes.push(node);
        side = -side;
      }
      shoots.push(sh);
    });
  });
  shoots.sort((a, b) => (b.back - a.back));             // back shoots first, front canopy over them
  const budLeaf = shoots[0].nodes[0].leaf;

  // Tied in between the catch wires, so nearly vertical; above the top wire
  // the tip leans and droops a little.
  function shootPoint(sh, s) {
    const y = CORD - 2 - Math.cos(sh.lean) * s;
    let x = sh.x0 + Math.sin(sh.lean) * s;
    if (y < TOP_WIRE) x += sh.droop * Math.pow((TOP_WIRE - y) / 40, 2) * 6;
    return [x, y];
  }

  // ---------- the year ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function stageName(m) {
    if (m < .9) return 'Winter · last year’s canes, dormant';
    if (m < 1.7) return 'Winter · pruning back to two-bud spurs';
    if (m < 2.4) return 'Late winter · the vines rest';
    if (m < 2.9) return 'Early spring · woolly buds swell';
    if (m < 3.4) return 'Spring · budbreak';
    if (m < 4.8) return 'Spring · shoots climb, flower clusters form';
    if (m < 5.4) return 'Late spring · flowering';
    if (m < 6.1) return 'Early summer · fruit set, leaves thinned around the fruit';
    if (m < 6.9) return 'Summer · berries swell, clusters close';
    if (m < 7.6) return 'Summer · colour change, berry by berry';
    if (m < 8.3) return 'Picked early, for bubbles';
    if (m < 9.5) return 'Autumn · canes harden, leaves turn';
    if (m < 11.2) return 'Autumn · leaves fall';
    return 'Winter · dormant canes';
  }

  function drawStem(pts, base, alpha, wood, key) {
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      ctx.strokeStyle = ink(alpha * (wood ? .85 : .68));
      ctx.lineWidth = base * (1 - t * .65) + (wood ? .6 : 0);
      jitterSeed = key + i * 3 + boil * 101;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0] + jit() * .6, pts[i - 1][1]); ctx.lineTo(pts[i][0] + jit() * .6, pts[i][1]); ctx.stroke();
    }
    pencil(pts.map(([a, b]) => [a + 1.5, b]), alpha * .25, .8, key + 5);   // shaded edge
  }

  function drawBud(x, y, swell, green, key) {
    const w = 2.6 + swell * 2.6, h = 3.6 + swell * 4.2;
    ctx.fillStyle = ink(.2 + swell * .1);
    ctx.beginPath(); ctx.ellipse(x, y - h, w, h, 0, 0, Math.PI * 2); ctx.fill();
    pencil([[x - w, y - h], [x, y - h * 2], [x + w, y - h]], .7, 1, key);
    if (swell > .2) {           // the wool showing between the bud scales
      ctx.strokeStyle = ink(.35 * swell); ctx.lineWidth = .6; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = -Math.PI * (i / 8); ctx.moveTo(x + Math.cos(a) * w * .8, y - h + Math.sin(a) * h * .8); ctx.lineTo(x + Math.cos(a) * (w + 2.5), y - h + Math.sin(a) * (h + 2.5)); }
      ctx.stroke();
    }
    if (green > 0) {            // the first leaves unfolding at the green tip
      drawLeaf(budLeaf, x - 2, y - h * 1.6, 6 + green * 8, -.7, .8, green, 0, false, key + 7);
      drawLeaf(budLeaf, x + 2, y - h * 1.9, 5 + green * 7, .6, .8, green, 0, false, key + 9);
    }
  }

  function drawCluster(c, x, y, side, m, vineDark, alpha, back, key) {
    if (alpha <= .01) return;
    const form = span(m, 3.3, 4.8);                 // flower cluster forming
    const flower = span(m, 4.8, 5.1) * (1 - span(m, 5.3, 5.6));
    const set = span(m, 5.4, 5.7);
    const swell = span(m, 5.6, 6.9);
    const hangT = span(m, 5.2, 6.3);
    if (form <= 0) return;
    // young clusters point up and out; the weight of fruit turns them down
    const angle = mix(side * 2.4, side * .25 + c.hang, hangT);   // 0 = straight down
    const scale = mix(.35, .62, form) * mix(1, 1 / .62, swell);
    const ped = 9 + 5 * hangT;
    const ax = x + side * 6, ay = y + 2;
    const ex = ax + Math.sin(angle) * ped, ey = ay + Math.cos(angle) * ped;
    pencil([[x, y], [ax, ay], [ex, ey]], alpha * .7, 1.1, key);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const place = b => [ex + (b.v * scale) * ca + (b.u * scale) * sa, ey - (b.v * scale) * sa + (b.u * scale) * ca];
    const tip = place({ u: c.len * .92, v: 0 });
    pencil([[ex, ey], [(ex + tip[0]) / 2, (ey + tip[1]) / 2], tip], alpha * .4, .8, key + 1);    // the stalk inside
    if (set <= 0) {             // flower buds, then the caps lifting off as it flowers
      c.berries.forEach(b => {
        const [bx, by] = place(b);
        ctx.fillStyle = ink(alpha * (back ? .35 : .55));
        ctx.beginPath(); ctx.arc(bx, by, 1.5 + form * .4, 0, Math.PI * 2); ctx.fill();
        if (flower > 0 && b.t < flower) {
          ctx.strokeStyle = ink(alpha * .45); ctx.lineWidth = .55; ctx.beginPath();
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + b.z * 6; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * 3.4, by + Math.sin(a) * 3.4); }
          ctx.stroke();
        }
      });
      return;
    }
    const R = c.R * mix(.42, 1, swell);
    c.berries.forEach(b => {
      const [bx, by] = place(b);
      const r = R * b.rr;
      const colour = vineDark ? smooth((m - 6.9 - b.t * .55) / .25) : smooth((m - 6.9 - b.t * .55) / .3) * .35;
      const g = Math.round(mix(back ? 226 : 238, vineDark ? 62 : 205, colour) - b.z * 14);
      ctx.fillStyle = `rgba(${g},${g},${g - 2},${alpha})`;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink(alpha * (.18 + colour * .2)); ctx.lineWidth = r * .45;          // form shadow
      ctx.beginPath(); ctx.arc(bx, by, r * .72, .1, 2.1); ctx.stroke();
      ctx.strokeStyle = ink(alpha * (back ? .4 : .6)); ctx.lineWidth = .85;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${alpha * (vineDark && colour > .5 ? .55 : .85)})`;  // highlight (bloom on dark skins)
      ctx.beginPath(); ctx.arc(bx - r * .35, by - r * .38, Math.max(.7, r * .2), 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawTendril(t, x, y, side, grow, wood, alpha, key) {
    if (grow <= 0) return;
    const pts = [[x, y]];
    const len = t.len * grow;
    let px = x, py = y, a = side * 1.1;
    for (let i = 0; i < 10; i++) { px += Math.sin(a) * len / 10; py -= Math.cos(a) * len / 10; a -= side * .07; pts.push([px, py]); }
    const turns = t.turns * grow;
    const steps = Math.round(18 * turns);
    for (let i = 1; i <= steps; i++) {
      const q = i / 18 * Math.PI * 2, rad = 5 * (1 - i / (steps + 1));
      pts.push([px + side * (1 - Math.cos(q)) * rad, py - Math.sin(q) * rad]);
    }
    pencil(pts, alpha * (wood ? .6 : .5), wood ? 1 : .8, key);
  }

  function scene(p, time) {
    const m = p * 12;
    if (bare.complete && bare.naturalWidth) ctx.drawImage(bare, 0, 0, IW, IH);

    const oldCanes = 1 - span(m, .9, 1.6);              // last year's wood until pruning
    const swell = span(m, 2.4, 2.9), green = span(m, 2.85, 3.3);
    const grow = smooth((m - 3.05) / 2.6);              // fast spring growth, done by June
    const wood = m < 1.7 ? 1 : span(m, 8.3, 9.3);
    const thin = span(m, 5.7, 6.1);                    // leaf pulling in the fruit zone
    const turn = span(m, 8.6, 9.8);
    const wind = Math.sin(time * 1.3) * .03 + Math.sin(time * .41) * .02;

    if (m >= 1.4 && m < 3.4) {                         // budded spurs: dormant, swelling, green tip
      const fade = 1 - span(m, 3.2, 3.4);
      shoots.forEach(sh => drawBud(sh.x0, CORD - 1, swell, green * fade, sh.key + 1));
    }

    shoots.forEach(sh => {
      if (m < 1.7 && oldCanes <= 0) return;
      const len = m < 1.7 ? sh.L : sh.L * grow;
      if (len < 4) return;
      const alphaShoot = (m < 1.7 ? oldCanes : 1) * (sh.back ? .62 : 1);
      const pts = [];
      for (let s = 0; s <= len; s += 9) pts.push(shootPoint(sh, s));
      pts.push(shootPoint(sh, len));
      drawStem(pts, sh.back ? 2.2 : 2.9, alphaShoot, wood > .5, sh.key);
      if (m >= 1.7 && len < sh.L - 2) {                // the soft, nodding growing tip
        const [tx, ty] = shootPoint(sh, len);
        pencil([[tx, ty], [tx + 4, ty - 6], [tx + 9, ty - 5], [tx + 8, ty - 1]], alphaShoot * .7, 1, sh.key + 9);
      }
      const later = [];
      sh.nodes.forEach(nd => {
        if (nd.s > len) return;
        const [nx, ny] = shootPoint(sh, nd.s);
        const age = clamp01((len - nd.s) / 70);
        if (nd.tendril && (m >= 3 || m < 1.7)) drawTendril(nd.tendril, nx, ny, -nd.side, m < 1.7 ? 1 : clamp01(age * 1.4), wood > .5, alphaShoot, sh.key + nd.n * 5);
        if (wood > .5) {                                // nodes on the hardened cane
          ctx.fillStyle = ink(alphaShoot * .5);
          ctx.beginPath(); ctx.ellipse(nx + nd.side * 1.5, ny, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        }
        if (nd.cluster && m >= 3.3 && m < 8.6) {        // clusters opposite the leaf, picked in August
          const picked = span(m, 7.7 + nd.cluster.delay * .35, 7.95 + nd.cluster.delay * .35);
          later.push(() => drawCluster(nd.cluster, nx, ny, -nd.side, m, sh.v.dark, (1 - picked) * (sh.back ? .7 : 1), sh.back, sh.key + nd.n * 11));
        }
        if (m >= 3.0 && m < 11.6) {
          const size = nd.size * (.18 + .82 * smooth(clamp01(age * 1.15)));
          let alpha = 1;
          if (nd.n <= 3 && !sh.back) alpha *= 1 - thin * (nd.n === 3 ? .7 : 1);   // fruit-zone leaves pulled
          const dropAt = 9.6 + nd.delay * 1.3 - (nd.n / 14) * .5;
          const drop = clamp01((m - dropAt) / .9);
          if (drop >= 1 || alpha <= .01) return;
          const autumn = clamp01((turn - nd.delay * .35) / .65);
          const ang = nd.side * nd.tilt + sh.lean + wind * (1 + nd.n * .1) + drop * nd.spin;
          const pet = size * .42;                       // the petiole carries the blade out from the node
          const px0 = nx + Math.sin(ang) * pet * .9, py0 = ny - Math.cos(ang) * pet * .9 + 2;
          const fx = px0 + nd.drift * drop * drop + Math.sin(drop * 9 + nd.n) * 14 * drop;
          const fy = py0 + (GROUND - py0) * drop * drop;
          const draw = () => {
            if (drop <= 0) pencil([[nx, ny], [(nx + px0) / 2 + nd.side * 2, (ny + py0) / 2 - 2], [px0, py0]], alpha * (sh.back ? .4 : .6), .9, sh.key + nd.n * 3);
            drawLeaf(nd.leaf, fx, fy, size, ang, nd.squash, alpha * (sh.back ? .9 : 1) * (1 - span(drop, .8, 1)), autumn, sh.back, sh.key + nd.n * 13);
          };
          if (nd.n <= 3) later.push(draw); else draw();
        }
      });
      later.forEach(f => f());
    });

    // the calendar
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `30px ${font}`;
    ctx.fillStyle = 'rgba(40,40,38,.85)';
    ctx.fillText(stageName(m), IW / 2, 52);
    const x0 = 560, x1 = 1214, y = 102;
    pencil([[x0, y], [x1, y]], .4, 1.1, 900);
    ctx.font = `15px ${font}`;
    MONTHS.forEach((name, i) => {
      const x = x0 + (x1 - x0) * (i + .5) / 12;
      pencil([[x, y - 4], [x, y + 4]], .35, 1, 910 + i);
      ctx.fillStyle = `rgba(40,40,38,${Math.floor(m) === i ? .9 : .38})`;
      ctx.fillText(name.toUpperCase(), x, y + 21);
    });
    ctx.fillStyle = 'rgba(40,40,38,.85)';
    ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * p, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- running ----------
  const YEAR = 36;                                    // seconds for one growing year
  let on = false, frame = 0, start = 0, lastPaint = 0;
  function size() {
    const w = img.clientWidth, h = img.clientHeight;
    if (!w) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function paint(p, time = 0) {
    ctx.setTransform(canvas.width / IW, 0, 0, canvas.height / IH, 0, 0);
    ctx.clearRect(0, 0, IW, IH);
    scene(p, time);
  }
  function tick(now) {
    frame = 0;
    if (!on || !stage.isConnected) return;
    if (!start) start = now;
    if (now - lastPaint > 66) {                       // about 15 drawings a second
      lastPaint = now;
      boil = (boil + 1) % 3;
      const t = (now - start) / 1000;
      paint((t / YEAR + .17) % 1, t);                 // start in late winter, just before budbreak
    }
    frame = requestAnimationFrame(tick);
  }
  function setOn(v) {
    on = v;
    stage.classList.toggle('on', on);
    stage.setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(frame); frame = 0;
    if (on) {
      size(); start = 0; lastPaint = 0;
      if (reduce.matches) paint(7.3 / 12); else frame = requestAnimationFrame(tick);
    }
  }
  bare.addEventListener('load', () => { if (on && reduce.matches) paint(7.3 / 12); });
  stage.addEventListener('click', () => setOn(!on));
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn(!on); } });
  addEventListener('resize', () => { if (on) { size(); if (reduce.matches) paint(7.3 / 12); } });
  stage._paintAt = p => { cancelAnimationFrame(frame); frame = 0; on = false; size(); paint(p, 3); };
})();
