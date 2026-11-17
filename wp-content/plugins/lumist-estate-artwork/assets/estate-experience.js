(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rail = document.getElementById('rail');
  const links = rail ? [...rail.querySelectorAll('a')] : [];
  const sections = links.map(link => document.querySelector(link.hash));
  function updateRail() {
    let current = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= innerHeight * .45) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', updateRail, { passive: true });
  addEventListener('resize', updateRail);
  updateRail();

  const canvas = document.getElementById('inbottle');
  const button = document.getElementById('estate-motion-toggle');
  if (!canvas || !button) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const air = document.getElementById('air');
  const airCtx = air ? air.getContext('2d') : null;
  const ambientButton = document.getElementById('estate-background-motion');
  let airWidth = 0, airHeight = 0, ambient = [];
  let width = 0, height = 0, frame = 0, previous = 0, clock = 0;
  let visible = false, paused = motion.matches;
  // Scrolling stirs the wine: bubbles speed up, wobble and drift, then settle.
  let stir = 0, lift = 0, drift = 0, lastScrollY = scrollY, lastScrollT = performance.now();
  addEventListener('scroll', () => {
    const now = performance.now();
    const dy = scrollY - lastScrollY, dt = Math.max(16, now - lastScrollT);
    lastScrollY = scrollY; lastScrollT = now;
    if (paused) return;
    const speed = Math.abs(dy) / dt; // px per ms
    stir = Math.min(3, stir + speed * .85);
    drift += Math.sign(dy) * Math.min(1, speed) * .6;
  }, { passive: true });
  const bottleArt = new Image();
  bottleArt.addEventListener('load', () => draw());
  bottleArt.src = canvas.getAttribute('data-bottle-art') || '';
  let seed = 1947;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // Three fixed origins suggest nucleation; depth varies the focus and reflection.
  const bubbles = Array.from({ length: 52 }, (_, i) => ({
    lane: [.455, .5, .548][i % 3], phase: random(), rate: .032 + random() * .024,
    radius: .65 + random() * 1.6, depth: random(), sway: random() * Math.PI * 2,
  }));
  // A bubble on paper: soft cast shadow, refracting body, dark lower rim,
  // bright upper rim, a sharp specular highlight and a faint reflected light.
  function paperBubble(c, x, y, r, a) {
    const k = Math.min(1, a * 3.8);
    const shadow = c.createRadialGradient(x + r * .28, y + r * .38, r * .2, x + r * .28, y + r * .38, r * 1.3);
    shadow.addColorStop(0, `rgba(0,0,0,${a * .3})`); shadow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = shadow; c.beginPath(); c.arc(x + r * .28, y + r * .38, r * 1.3, 0, Math.PI * 2); c.fill();
    const body = c.createRadialGradient(x - r * .22, y - r * .28, r * .08, x, y, r);
    body.addColorStop(0, `rgba(255,255,255,${k * .55})`);
    body.addColorStop(.5, `rgba(255,255,255,${k * .08})`);
    body.addColorStop(.8, `rgba(110,110,110,${k * .1})`);
    body.addColorStop(.95, `rgba(45,45,45,${k * .42})`);
    body.addColorStop(1, 'rgba(45,45,45,0)');
    c.fillStyle = body; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round';
    c.lineWidth = Math.max(.7, r * .07);
    c.strokeStyle = `rgba(30,30,30,${k * .6})`;
    c.beginPath(); c.arc(x, y, r * .93, -.15, Math.PI * .95); c.stroke();
    c.lineWidth = Math.max(.6, r * .055);
    c.strokeStyle = `rgba(255,255,255,${k * .95})`;
    c.beginPath(); c.arc(x, y, r * .86, Math.PI * 1.08, Math.PI * 1.62); c.stroke();
    if (r > 2.2) {
      c.save(); c.translate(x - r * .36, y - r * .4); c.rotate(-.65);
      const hi = c.createRadialGradient(0, 0, 0, 0, 0, r * .3);
      hi.addColorStop(0, 'rgba(255,255,255,1)'); hi.addColorStop(.45, `rgba(255,255,255,${k})`); hi.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hi; c.scale(1, .55); c.beginPath(); c.arc(0, 0, r * .3, 0, Math.PI * 2); c.fill();
      c.restore();
      c.save(); c.translate(x + r * .34, y + r * .44); c.rotate(-.65);
      c.strokeStyle = `rgba(255,255,255,${k * .55})`; c.lineWidth = Math.max(.5, r * .05);
      c.beginPath(); c.ellipse(0, 0, r * .3, r * .1, 0, Math.PI * .05, Math.PI * .95); c.stroke();
      c.restore();
    } else {
      c.fillStyle = `rgba(255,255,255,${k})`;
      c.beginPath(); c.arc(x - r * .35, y - r * .38, Math.max(.45, r * .22), 0, Math.PI * 2); c.fill();
    }
  }
  // Content the bubbles should pass behind: they fade out smoothly as they near it.
  const FADE = 64;                       // px of soft edge around text and drawings
  let blocks = [];                       // page-space rects
  function collectBlocks() {
    const sel = 'main :is(h1,h2,h3,h4,p,dl,li,blockquote,figcaption,.kicker,.kick,.eyebrow,.zoomnext,.masthead,.motto,.lead,.crumb,img,canvas#inbottle,.addr,.site,.btn)';
    const sx = scrollX, sy = scrollY;
    blocks = [...document.querySelectorAll(sel)].map(el => el.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0)
      .map(r => ({ l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy }));
  }
  function contentFade(x, y, radius) {
    const sy = scrollY, sx = scrollX;
    let d = Infinity;
    for (const k of blocks) {
      const t = k.t - sy, b = k.b - sy;
      if (b < y - FADE - radius || t > y + FADE + radius) continue;
      const l = k.l - sx, r = k.r - sx;
      const dx = Math.max(l - x, 0, x - r), dy = Math.max(t - y, 0, y - b);
      const dist = Math.hypot(dx, dy) - radius;
      if (dist < d) { d = dist; if (d <= 0) return 0; }
    }
    if (d >= FADE) return 1;
    const u = d / FADE; return u * u * (3 - 2 * u);
  }
  addEventListener('load', collectBlocks);
  addEventListener('resize', collectBlocks);
  if ('ResizeObserver' in window) new ResizeObserver(collectBlocks).observe(document.body);
  setTimeout(collectBlocks, 1500);
  function drawAir() {
    if (!airCtx) return;
    airCtx.clearRect(0, 0, airWidth, airHeight);
    for (const bubble of ambient) {
      const progress = (bubble.phase + (clock + lift) * bubble.rate) % 1;
      const y = airHeight + 24 - progress * (airHeight + 48);
      const swirl = Math.sin(clock * 2.1 + bubble.sway + y * .011) * stir * (5 + bubble.radius * .9);
      const x = bubble.x * airWidth + Math.sin(clock * .22 + bubble.sway) * (2 + bubble.radius * .3) + swirl + drift * (4 + bubble.radius * .5) * Math.sin(bubble.sway);
      const radius = bubble.radius * (.86 + progress * .14);
      const fade = Math.min(1, progress * 12, (1 - progress) * 12);
      const alpha = bubble.alpha * fade;
      const hide = contentFade(x, y, radius);
      if (hide > .01) paperBubble(airCtx, x, y, radius, alpha * hide);
    }
  }
  function sphere(x, y, radius, alpha) {
    const light = ctx.createRadialGradient(x - radius * .28, y - radius * .36, 0, x, y, radius);
    light.addColorStop(0, `rgba(235,234,226,${alpha * .07})`);
    light.addColorStop(.68, 'rgba(235,234,226,0)');
    light.addColorStop(.88, `rgba(230,230,222,${alpha * .13})`);
    light.addColorStop(1, `rgba(13,17,16,${alpha * .3})`);
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(.45, radius * .1);
    ctx.strokeStyle = `rgba(246,244,232,${alpha * .85})`;
    ctx.beginPath(); ctx.arc(x, y, radius * .86, Math.PI * 1.04, Math.PI * 1.55); ctx.stroke();
    ctx.strokeStyle = `rgba(196,202,196,${alpha * .35})`;
    ctx.beginPath(); ctx.arc(x, y, radius * .83, .06, .72); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha * 1.3)})`;
    ctx.beginPath(); ctx.arc(x - radius * .34, y - radius * .38, Math.max(.35, radius * .2), 0, Math.PI * 2); ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, '#343a37'); base.addColorStop(.45, '#161e1c'); base.addColorStop(1, '#303633');
    ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
    // A full bottle, with curved shoulders, a weighted base and cylindrical glass reflections.
    const mid = width * .5, half = Math.min(width * .245, height * .137);
    const neck = half * .32, top = height * .075, shoulder = height * .52, bottom = height * .965;
    const bottle = new Path2D();
    bottle.moveTo(mid - neck, top); bottle.lineTo(mid - neck, height * .21);
    bottle.bezierCurveTo(mid - neck, height * .36, mid - half, height * .43, mid - half, shoulder);
    bottle.lineTo(mid - half, bottom - half * .19);
    bottle.quadraticCurveTo(mid - half, bottom, mid - half * .78, bottom);
    bottle.lineTo(mid + half * .78, bottom);
    bottle.quadraticCurveTo(mid + half, bottom, mid + half, bottom - half * .19);
    bottle.lineTo(mid + half, shoulder);
    bottle.bezierCurveTo(mid + half, height * .43, mid + neck, height * .36, mid + neck, height * .21);
    bottle.lineTo(mid + neck, top); bottle.closePath();
    ctx.save(); ctx.clip(bottle);
    // Leave the body open: the pencil image supplies the glass texture and contours.
    const liquid = ctx.createLinearGradient(0, height * .2, 0, bottom);
    liquid.addColorStop(0, 'rgba(211,208,189,.012)');
    liquid.addColorStop(.65, 'rgba(211,208,189,.055)');
    liquid.addColorStop(1, 'rgba(211,208,189,.018)');
    ctx.fillStyle = liquid; ctx.fillRect(0, height * .185, width, bottom);
    for (const bubble of bubbles) {
      const progress = (bubble.phase + (clock + lift * 1.4) * bubble.rate) % 1;
      const rise = progress * progress * .18 + progress * .82;
      const y = bottom - rise * (bottom - height * .19);
      const x = width * bubble.lane + Math.sin(progress * 8 + bubble.sway) * (2 + progress * 5)
        + Math.sin(clock * 3 + bubble.sway + progress * 11) * stir * (1.5 + progress * 3.5);
      const radius = bubble.radius * (.65 + progress * 1.05) * Math.min(width / 420, 1.35);
      const fade = Math.min(1, progress * 12, (1 - progress) * 9);
      ctx.save();
      if (bubble.depth < .17) ctx.filter = 'blur(1px)';
      sphere(x, y, radius, (.3 + bubble.depth * .55) * fade);
      ctx.restore();
    }
    ctx.restore();
    if (bottleArt.complete && bottleArt.naturalWidth) {
      const artHeight = height, artWidth = artHeight * bottleArt.naturalWidth / bottleArt.naturalHeight;
      ctx.drawImage(bottleArt, (width - artWidth) / 2, 0, artWidth, artHeight);
    } else {
      // A quiet outline remains while the pencil texture loads.
      ctx.strokeStyle = 'rgba(216,224,210,.24)'; ctx.lineWidth = .8; ctx.stroke(bottle);
    }
    const vignette = ctx.createRadialGradient(width * .5, height * .45, width * .08, width * .5, height * .45, height * .75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.25)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }
  function tick(now) {
    frame = 0;
    if (paused || (!visible && !airCtx) || document.hidden) { previous = 0; return; }
    if (previous) {
      const dt = Math.min((now - previous) / 1000, .05);
      clock += dt;
      lift += dt * stir * 1.8;          // extra rise while stirred
      stir *= Math.pow(.12, dt);        // settles in about a second
      drift *= Math.pow(.2, dt);
      if (stir < .002) stir = 0;
    }
    previous = now; drawAir(); if (visible) draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    button.textContent = paused ? 'Play bubble motion' : 'Pause bubble motion';
    if (ambientButton) ambientButton.textContent = paused ? 'Play bubble motion' : 'Pause bubble motion';
    drawAir(); draw();
    if (!paused && (visible || airCtx) && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  button.hidden = false;
  button.addEventListener('click', () => { paused = !paused; sync(); });
  if (ambientButton) {
    ambientButton.hidden = false;
    ambientButton.addEventListener('click', () => { paused = !paused; sync(); });
  }
  function resizeAir() {
    if (!airCtx) return;
    airWidth = innerWidth; airHeight = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    air.width = Math.round(airWidth * dpr); air.height = Math.round(airHeight * dpr);
    airCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ambient = Array.from({ length: Math.min(36, Math.max(10, Math.round(airWidth * airHeight / 34000))) }, () => {
      const radius = random() < .12 ? 10 + random() * 8 : 3 + random() * 4.5;
      return { x: random(), phase: random(), rate: (4 + radius * .7) / (airHeight + 48),
        radius, alpha: .115 + random() * .04, sway: random() * Math.PI * 2 };
    });
    drawAir();
  }
  addEventListener('resize', resizeAir);
  motion.addEventListener('change', () => { paused = motion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .05 }).observe(canvas);
  } else { visible = true; }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else addEventListener('resize', resize);
  collectBlocks(); resizeAir(); resize(); sync();
})();
