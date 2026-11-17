/* LUMIST Estate — a year on the vine.
   Click the Chardonnay and Pinot Noir sketch to watch one Carneros growing year
   on a spur-pruned, vertically trained cordon: dormant canes, pruning to two-bud
   spurs, woolly buds, budbreak, shoots climbing between the catch wires with
   alternate leaves, flower clusters opposite the basal leaves and tendrils
   opposite the upper ones, flowering, fruit set, leaf thinning around the fruit,
   berries swelling and colouring berry by berry, harvest, canes hardening, leaves turning and falling. Click again to return to
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
  // Every leaf is drawn on its own: lobes, sinuses, teeth, vein angles, the
  // tilt of the blade and the pencil marks all vary from leaf to leaf.
  // Unit leaf: blade pointing up (-y) from the petiole junction at (0,0), about 1 across.
  function makeLeaf(v, seed) {
    const r = rng(seed);
    const g = s => (r() + r() + r() - 1.5) * s * 1.15;   // gentle, bell-shaped variation
    const pol = (a, d) => [Math.sin(a) * d * .7, -Math.cos(a) * d * .7];
    const asym = 1 + g(.08);
    const keys = [
      [g(.07), 1 + g(.06), 1],                 // middle lobe tip
      [.5 + g(.05), v.sinU + g(.07), 0],       // upper sinus
      [.98 + g(.08), .9 + g(.07), 1],          // upper side lobe
      [1.45 + g(.06), v.sinL + g(.07), 0],     // lower sinus
      [1.92 + g(.09), .65 + g(.07), 1],        // lower side lobe
      [2.5 + g(.05), .44 + g(.05), 0],
      [v.petLobe + g(.06), .4 + g(.05), 1],    // petiolar lobe
      [v.petSinus, .1, 0],
    ];
    const order = [];
    for (let i = keys.length - 1; i >= 1; i--) order.push([-keys[i][0] * (1 + g(.02)), keys[i][1] * (1 + g(.03)), keys[i][2]]);
    order.push(keys[0]);
    for (let i = 1; i < keys.length; i++) order.push([keys[i][0] * (1 + g(.02)), keys[i][1] * asym * (1 + g(.03)), keys[i][2]]);
    const toothScale = 1 + g(.35);
    const pts = [], tips = [];
    for (let i = 0; i < order.length - 1; i++) {
      const A = pol(order[i][0], order[i][1]), B = pol(order[i + 1][0], order[i + 1][1]);
      if (order[i][2]) tips.push({ p: A, a: order[i][0], d: order[i][1] });
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const n = Math.max(2, Math.round(len / (.065 + r() * .025)));
      const nx = (B[1] - A[1]) / len, ny = -(B[0] - A[0]) / len;
      const toTip = order[i + 1][2] ? 1 : -1;
      const swell = (order[i + 1][2] ? .15 : .1) * (1 + g(.25));
      const small = order[i + 1][1] < .2 || order[i][1] < .2 ? .3 : 1;
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = (k + .5 + toTip * (.25 + r() * .12)) / n;
        const b1 = Math.sin(Math.PI * t) * len * swell, b2 = Math.sin(Math.PI * t2) * len * swell;
        pts.push([A[0] + (B[0] - A[0]) * t - nx * b1, A[1] + (B[1] - A[1]) * t - ny * b1]);
        const tooth = (.012 + r() * .014) * toothScale * small;
        pts.push([A[0] + (B[0] - A[0]) * t2 - nx * (b2 + tooth), A[1] + (B[1] - A[1]) * t2 - ny * (b2 + tooth)]);
      }
    }
    pts.push(pol(order[order.length - 1][0], order[order.length - 1][1]));
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    // veins: five main veins curving gently to the lobe tips, smaller ones toward the teeth
    const J = [g(.01), -.05];
    const veins = [];
    tips.forEach(tp => {
      const end = [tp.p[0] * .93, tp.p[1] * .93];
      const bend = g(.035);
      const mid = [(J[0] + end[0]) / 2 - (end[1] - J[1]) * bend, (J[1] + end[1]) / 2 + (end[0] - J[0]) * bend];
      const main = Math.abs(tp.a) < .3 ? 1.5 : Math.abs(tp.a) < 1.3 ? 1.2 : Math.abs(tp.a) < 2.3 ? .95 : .7;
      veins.push({ p: [J, mid, end], w: main });
      const L0 = Math.hypot(end[0] - J[0], end[1] - J[1]);
      const dir = Math.atan2(end[0] - J[0], -(end[1] - J[1]));
      const count = tp.d > .6 ? 4 : 2;
      for (let k = 1; k <= count; k++) {
        const t = k / (count + 1) + g(.03);
        const p = [J[0] + (end[0] - J[0]) * t, J[1] + (end[1] - J[1]) * t];
        for (const sd of [-1, 1]) {
          if (r() < .12) continue;
          const a = dir + sd * (.62 + g(.12));
          const l = (1 - t) * L0 * (.5 + r() * .2);
          const q = [p[0] + Math.sin(a) * l, p[1] - Math.cos(a) * l];
          if (!inside(q[0], q[1])) continue;
          const mq = [(p[0] + q[0]) / 2 + Math.cos(a) * l * .08 * sd, (p[1] + q[1]) / 2 + Math.sin(a) * l * .08 * sd];
          veins.push({ p: [p, mq, q], w: .55 });
        }
      }
    });
    // pencil tone, laid in short strokes running with the veins: darker on the
    // shaded side (lower right), in the pockets near the midrib and at the junction
    const hatch = [];
    const mains = tips.map(tp => Math.atan2(tp.p[0], -tp.p[1]));
    for (let i = 0; i < 330; i++) {
      const x = (r() - .5) * 1.5, y = -1 + r() * 1.35;
      if (!inside(x, y)) continue;
      const d = Math.hypot(x - J[0], y - J[1]);
      let shade = .18 + .38 * clamp01(x / .7 + .5) * .9 + .25 * clamp01((y + .3) / .5) + (d < .2 ? .35 : 0);
      shade += g(.12);
      if (r() > shade) continue;
      const pa = Math.atan2(x - J[0], -(y - J[1]));
      let near = mains[0];
      mains.forEach(a => { if (Math.abs(a - pa) < Math.abs(near - pa)) near = a; });
      const ang = near + (pa > near ? 1 : -1) * (.55 + g(.15));
      const l = .05 + r() * .08;
      hatch.push([x - Math.sin(ang) * l / 2, y + Math.cos(ang) * l / 2, x + Math.sin(ang) * l / 2, y - Math.cos(ang) * l / 2, clamp01(shade)]);
    }
    // a few spots, used once the leaf turns in autumn
    const spots = [];
    for (let i = 0; i < 26; i++) {
      const x = (r() - .5) * 1.3, y = -.95 + r() * 1.2;
      if (inside(x, y)) spots.push([x, y, .012 + r() * .03, r()]);
    }
    // the pressure of the outline changes along the edge, with the odd lifted pencil
    const pressure = [];
    for (let i = 0; i < pts.length; i += 7) pressure.push(r() < .07 ? 0 : .55 + r() * .45);
    return { pts, veins, hatch, spots, pressure, J, dark: v.dark, under: r() < .15, sheen: r() };
  }

  function drawLeaf(L, x, y, size, angle, squash, alpha, autumn, back, key, young = 0) {
    if (size < 2 || alpha <= .01) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    const sx = size * squash * (L.under ? -1 : 1);
    const T = ([a, b]) => [x + a * sx * c - b * size * s, y + a * sx * s + b * size * c];
    const outline = L.pts.map(T);
    ctx.beginPath();
    outline.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b));
    ctx.closePath();
    const paper = back ? 234 : (L.under ? 249 : 245);
    ctx.fillStyle = `rgba(${paper},${paper},${paper - 2},${alpha * .95})`;
    ctx.fill();
    ctx.save(); ctx.clip();
    // tone
    const k = alpha * (back ? 1.25 : 1) * (L.under ? .5 : 1) * (1 - young * .55) * (1 + autumn * (L.dark ? 1.3 : .5));
    for (const band of [[0, .45, .22], [.45, .75, .4], [.75, 1.01, .58]]) {
      ctx.strokeStyle = ink(Math.min(.9, k * band[2])); ctx.lineWidth = .8;
      ctx.beginPath();
      for (const h of L.hatch) {
        if (h[4] < band[0] || h[4] >= band[1]) continue;
        const [a, b] = T([h[0], h[1]]), [e, f] = T([h[2], h[3]]);
        ctx.moveTo(a, b); ctx.lineTo(e, f);
      }
      ctx.stroke();
    }
    if (autumn > .15) {          // the turning leaf: crossed strokes and blotches
      ctx.strokeStyle = ink(alpha * autumn * (L.dark ? .28 : .1)); ctx.lineWidth = .6; ctx.beginPath();
      for (let i = 0; i < L.hatch.length; i += 2) {
        const h = L.hatch[i];
        const [a, b] = T([h[0], h[3]]), [e, f] = T([h[2], h[1]]);
        ctx.moveTo(a, b); ctx.lineTo(e, f);
      }
      ctx.stroke();
      ctx.fillStyle = ink(alpha * autumn * (L.dark ? .3 : .14));
      for (const sp of L.spots) {
        if (sp[3] > autumn) continue;
        const [a, b] = T([sp[0], sp[1]]);
        ctx.beginPath(); ctx.arc(a, b, sp[2] * size, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (young > .2) {            // fine hairs on a young, still-folded leaf
      ctx.fillStyle = ink(alpha * young * .35);
      for (let i = 0; i < L.hatch.length; i += 5) {
        const [a, b] = T([L.hatch[i][0], L.hatch[i][1]]);
        ctx.fillRect(a, b, .8, .8);
      }
    }
    // a soft sheen on the lit lobes
    const [hx, hy] = T([-.22 * (L.under ? -1 : 1), -.6]);
    const lit = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * (.25 + L.sheen * .2));
    lit.addColorStop(0, `rgba(${paper},${paper},${paper},${alpha * .75})`); lit.addColorStop(1, `rgba(${paper},${paper},${paper},0)`);
    ctx.fillStyle = lit; ctx.fillRect(x - size * 1.2, y - size * 1.3, size * 2.4, size * 1.6);
    ctx.restore();
    // veins: tapered main veins, finer side veins; raised and pale on an underside
    const va = alpha * (back ? .3 : .5) * (L.under ? 1.25 : 1) * (1 - young * .3);
    L.veins.forEach((vn, i) => {
      const p = vn.p.map(T);
      jitterSeed = key * 13 + i * 7 + boil * 31;
      ctx.strokeStyle = ink(va * (vn.w > 1 ? 1 : .8));
      ctx.lineCap = 'round';
      ctx.lineWidth = vn.w * (back ? .8 : 1) * Math.min(1.3, size / 50);
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.quadraticCurveTo(p[1][0] + jit() * .8, p[1][1] + jit() * .8, (p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2); ctx.stroke();
      ctx.lineWidth *= .55;
      ctx.beginPath(); ctx.moveTo((p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2); ctx.lineTo(p[2][0] + jit() * .6, p[2][1] + jit() * .6); ctx.stroke();
    });
    if (squash < .45) {          // the crease of a leaf still folded along its midrib
      pencil([T([0, -.05]), T([0, -.7])], alpha * .55 * (1 - squash), 1.1, key + 1);
    }
    // outline in short runs, pressure varying, the pencil lifting now and then
    const oa = alpha * (back ? .45 : .7) * (1 - young * .35);
    for (let i = 0, run = 0; i < outline.length - 1; i += 7, run++) {
      const pr = L.pressure[run] ?? .8;
      if (!pr) continue;
      const seg = outline.slice(i, Math.min(outline.length, i + 8));
      pencil(seg, oa * pr, (back ? .8 : 1.05) * (.8 + pr * .4), key * 3 + run, false);
    }
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
          s, n, side, leaf: makeLeaf(v, 5000 + vi * 997 + si * 131 + n * 17), mature: 70 + r() * 50, flutter: .6 + r() * .9, phase: r() * 6,
          size: v.leaf * [.62, .78, .9, 1, 1.04, 1, .96, .9, .8, .66, .5][Math.min(n - 1, 10)] * (back ? .9 : 1),
          squash: .5 + r() * .5, tilt: .55 + r() * .5, delay: r(), drift: (r() - .5) * 120, spin: (r() - .5) * 6,
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
    if (m < 6.0) return 'Early summer · fruit set';
    if (m < 6.65) return 'Summer · leaf thinning around the fruit';
    if (m < 6.9) return 'Summer · berries swell, clusters close';
    if (m < 7.6) return 'Summer · colour change, berry by berry';
    if (m < 8.3) return 'Harvest';
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

  function drawBud(sh, x, y, swell, green, key) {
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
      drawLeaf(sh.nodes[0].leaf, x - 1, y - h * 1.5, 5 + green * 9, -.35 - green * .4, .2 + green * .35, green, 0, false, key + 7, 1 - green * .4);
      drawLeaf(sh.nodes[1].leaf, x + 1, y - h * 1.9, 4 + green * 6, .25 + green * .35, .18 + green * .3, green, 0, false, key + 9, 1);
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
        const turn = span(m, 8.6, 9.8);
    const wind = Math.sin(time * 1.3) * .03 + Math.sin(time * .41) * .02;

    if (m >= 1.4 && m < 3.4) {                         // budded spurs: dormant, swelling, green tip
      const fade = 1 - span(m, 3.2, 3.4);
      shoots.forEach(sh => drawBud(sh, sh.x0, CORD - 1, swell, green * fade, sh.key + 1));
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
          // leaves open from the tip: small, folded and upright at first, then
          // unfolding, turning outward and expanding at their own pace
          const lage = clamp01((len - nd.s) / nd.mature);
          const size = nd.size * (.4 + .6 * smooth(lage));
          const unfold = smooth(clamp01(lage * 4 + .15));
          const young = 1 - smooth(clamp01(lage * 2.2));
          let alpha = 1;
          // leaf thinning: the leaves around the clusters are picked off one by one
          // and drop to the ground, opening the fruit to light and air
          const thinned = sh.back ? nd.n <= 1 : nd.n <= 3;
          const pulled = thinned ? clamp01((m - 6.05 - nd.delay * .4) / .22) : 0;
          const dropAt = 9.6 + nd.delay * 1.3 - (nd.n / 14) * .5;
          const drop = Math.max(clamp01((m - dropAt) / .9), pulled);
          if (drop >= 1 || alpha <= .01) return;
          const autumn = clamp01((turn - nd.delay * .35) / .65);
          const ang = nd.side * mix(.1, nd.tilt, smooth(lage * 1.3)) + sh.lean + wind * nd.flutter * Math.sin(time * (.9 + nd.flutter) + nd.phase) * 1.6 + drop * nd.spin;
          const pet = size * .42 * mix(.45, 1, unfold);                       // the petiole carries the blade out from the node
          const px0 = nx + Math.sin(ang) * pet * .9, py0 = ny - Math.cos(ang) * pet * .9 + 2;
          const fx = px0 + nd.drift * drop * drop + Math.sin(drop * 9 + nd.n) * 14 * drop;
          const fy = py0 + (GROUND - py0) * drop * drop;
          const draw = () => {
            if (drop <= 0) pencil([[nx, ny], [(nx + px0) / 2 + nd.side * 2, (ny + py0) / 2 - 2], [px0, py0]], alpha * (sh.back ? .4 : .6), .9, sh.key + nd.n * 3);
            drawLeaf(nd.leaf, fx, fy, size, ang, mix(.16, nd.squash, unfold) * (1 - drop * .3 * Math.sin(drop * 7 + nd.phase)), alpha * (sh.back ? .9 : 1) * (1 - span(drop, .8, 1)), autumn, sh.back, sh.key + nd.n * 13, young);
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
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
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
    if (now - lastPaint > 83) {                       // about 12 drawings a second, like flipped pages
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
