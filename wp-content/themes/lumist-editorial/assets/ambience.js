/* LUMIST · Carneros ambience
   A soundscape synthesised in the browser (no recordings): wind off San Pablo Bay,
   water at the marsh edge, vine leaves in the gusts, and the odd marsh bird.
   Off by default; a visitor turns it on. The choice is remembered between pages. */
(() => {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const KEY = 'lumist-ambience';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let ctx = null, master = null, on = false, birdTimer = 0, waveTimer = 0, gust = 0;
  let windGain, whistleGain, leafGain, windFilter, birdFn = null, rustleFn = null, leafTimer = 0, lastRustle = 0;

  const css = `
  .lumist-ambience{position:fixed;left:clamp(12px,2vw,24px);bottom:clamp(12px,2vw,24px);z-index:260;
    display:inline-flex;align-items:center;gap:10px;padding:9px 14px 9px 12px;border:1px solid #212121;
    background:#FFFFFF;color:#212121;font:400 15px/1 "IM Fell English SC","IM Fell English",Georgia,serif;
    letter-spacing:.06em;cursor:pointer;border-radius:0}
  .lumist-ambience:hover{background:#212121;color:#FFFFFF}
  .lumist-ambience:focus-visible{outline:2px solid #212121;outline-offset:3px}
  .lumist-ambience svg{width:18px;height:18px;flex:none}
  .lumist-ambience .bars i{display:inline-block;width:2px;height:10px;margin-left:2px;background:currentColor;
    transform-origin:bottom;transform:scaleY(.25)}
  .lumist-ambience[aria-pressed="true"] .bars i{animation:lumistBar 1.4s ease-in-out infinite}
  .lumist-ambience .bars i:nth-child(2){animation-delay:.25s}.lumist-ambience .bars i:nth-child(3){animation-delay:.5s}
  @keyframes lumistBar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
  @media (prefers-reduced-motion:reduce){.lumist-ambience[aria-pressed="true"] .bars i{animation:none;transform:scaleY(.6)}}
  @media print{.lumist-ambience{display:none}}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'lumist-ambience'; btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path class="w" d="M15.5 9.2c1 .8 1.5 1.7 1.5 2.8s-.5 2-1.5 2.8M18 7c1.7 1.4 2.5 3 2.5 5s-.8 3.6-2.5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg><span class="label">Sound of Carneros</span><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>';
  const label = btn.querySelector('.label');
  function paint() {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn off the sound of Carneros' : 'Play the sound of Carneros: wind, bay water and marsh birds');
    label.textContent = on ? 'Sound of Carneros · on' : 'Sound of Carneros';
  }
  paint();
  document.body.appendChild(btn);

  // ---------- building blocks ----------
  function noiseBuffer(kind, seconds = 6) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
        else if (kind === 'pink') {
          b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
          b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
        } else d[i] = w;
      }
    }
    return buf;
  }
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function lfo(freq, depth, target, offset = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(ctx.currentTime + offset);
    return o;
  }
  function reverb(seconds = 2.6) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const c = ctx.createConvolver(); c.buffer = buf; return c;
  }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const space = reverb(); const wet = ctx.createGain(); wet.gain.value = .28; space.connect(wet); wet.connect(master);

    // Wind off the bay: brown noise, low-passed, swelling slowly.
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 520; windFilter.Q.value = .6;
    windGain = ctx.createGain(); windGain.gain.value = .32;
    const windPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    loop(noiseBuffer('brown', 8)).connect(windFilter); windFilter.connect(windGain);
    if (windPan) { windGain.connect(windPan); windPan.connect(master); lfo(.031, .55, windPan.pan); } else windGain.connect(master);
    lfo(.07, 260, windFilter.frequency); lfo(.043, .12, windGain.gain, 3);

    // Gust whistle through the trellis wires.
    const whistle = ctx.createBiquadFilter(); whistle.type = 'bandpass'; whistle.frequency.value = 1150; whistle.Q.value = 9;
    whistleGain = ctx.createGain(); whistleGain.gain.value = .007;
    loop(noiseBuffer('pink', 7)).connect(whistle); whistle.connect(whistleGain); whistleGain.connect(master);
    lfo(.11, 380, whistle.frequency); lfo(.05, .005, whistleGain.gain, 1);

    // Vine leaves: no constant hiss. Each gust is a short cloud of tiny, irregular leaf
    // contacts that swells and fades, then the vines go quiet again.
    leafGain = ctx.createGain(); leafGain.gain.value = .9;
    const leafBand = ctx.createBiquadFilter(); leafBand.type = 'bandpass'; leafBand.frequency.value = 2600; leafBand.Q.value = .8;
    const leafSoft = ctx.createBiquadFilter(); leafSoft.type = 'lowpass'; leafSoft.frequency.value = 6500;
    leafGain.connect(leafBand); leafBand.connect(leafSoft); leafSoft.connect(master); leafSoft.connect(space);
    function rustleBuffer(seconds, density) {
      const sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let i = 0;
        while (i < len) {
          const x = i / len, env = Math.pow(Math.sin(Math.PI * x), 1.6);       // swell and fade
          const gap = Math.max(1, Math.floor(sr / (40 + density * 900 * env) * (.3 + Math.random() * 1.7)));
          const amp = (.15 + Math.random() * .85) * env, dur = Math.floor(sr * (.0015 + Math.random() * .006));
          for (let k = 0; k < dur && i + k < len; k++) d[i + k] += (Math.random() * 2 - 1) * amp * Math.pow(1 - k / dur, 2);
          i += gap;
        }
      }
      return buf;
    }
    const rustles = [rustleBuffer(2.4, .5), rustleBuffer(3.4, .8), rustleBuffer(1.6, .35)];
    rustleFn = (strength = .5) => {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = rustles[Math.floor(Math.random() * rustles.length)];
      src.playbackRate.value = .85 + Math.random() * .3;
      g.gain.value = (.025 + Math.random() * .025) * (.6 + strength);
      let out = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.4 - .7; g.connect(p); out = p; }
      src.connect(g); out.connect(leafGain); src.start();
    };
    function leafLoop() {
      if (on && !document.hidden) rustleFn(Math.random() * .6);
      leafTimer = setTimeout(leafLoop, 6000 + Math.random() * 10000);
    }
    leafTimer = setTimeout(leafLoop, 4000);

    // Water at the marsh edge: pink noise, small slow laps.
    const water = ctx.createBiquadFilter(); water.type = 'lowpass'; water.frequency.value = 700;
    const waterGain = ctx.createGain(); waterGain.gain.value = .0;
    loop(noiseBuffer('pink', 9)).connect(water); water.connect(waterGain); waterGain.connect(master); waterGain.connect(space);
    function lap() {
      const t = ctx.currentTime, peak = .05 + Math.random() * .05, rise = .9 + Math.random() * .8, fall = 1.6 + Math.random() * 1.6;
      waterGain.gain.cancelScheduledValues(t);
      waterGain.gain.setTargetAtTime(peak, t, rise / 3);
      waterGain.gain.setTargetAtTime(.012, t + rise, fall / 3);
      water.frequency.setTargetAtTime(500 + Math.random() * 500, t, .8);
      waveTimer = setTimeout(lap, (rise + fall + Math.random() * 2.5) * 1000);
    }
    lap();

    // Marsh birds: short, distant calls with a touch of space.
    const birdBus = ctx.createGain(); birdBus.gain.value = .5;
    const birdHP = ctx.createBiquadFilter(); birdHP.type = 'highpass'; birdHP.frequency.value = 1400;
    birdBus.connect(birdHP); birdHP.connect(master); birdHP.connect(space);
    function chirp(t, f0, f1, dur, vol, pan) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .2); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      let node = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
      o.connect(g); node.connect(birdBus); o.start(t); o.stop(t + dur + .05);
    }
    function bird() {
      if (!on) return;
      const t = ctx.currentTime + .05, pan = Math.random() * 1.6 - .8, kind = Math.random();
      if (kind < .45) { // a blackbird-like "conk-la-ree" with a buzzy trill
        chirp(t, 1900, 2600, .09, .05, pan); chirp(t + .14, 2400, 3300, .08, .05, pan);
        for (let i = 0; i < 9; i++) chirp(t + .28 + i * .035, 3600, 3000, .03, .035, pan);
      } else if (kind < .8) { // a few quick wren-like notes
        const n = 4 + Math.floor(Math.random() * 5), base = 3200 + Math.random() * 900;
        for (let i = 0; i < n; i++) chirp(t + i * .09, base, base * (1.12 + Math.random() * .1), .06, .028, pan);
      } else { // a single far-off, falling whistle
        chirp(t, 2900, 1900, .45, .03, pan);
      }
      birdTimer = setTimeout(bird, 7000 + Math.random() * 14000);
    }
    birdFn = bird;
  }

  // Scrolling stirs the air a little, like the page's bubbles.
  let lastY = scrollY, lastT = performance.now();
  addEventListener('scroll', () => {
    const now = performance.now(), v = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
    lastY = scrollY; lastT = now;
    if (!on || !ctx || reduce.matches) return;
    gust = Math.min(1, gust + v * .5);
    const t = ctx.currentTime;
    windGain.gain.setTargetAtTime(.32 + gust * .22, t, .15);
    windGain.gain.setTargetAtTime(.32, t + .5, .9);
    if (rustleFn && gust > .35 && now - lastRustle > 1800) { lastRustle = now; rustleFn(gust); }
    setTimeout(() => { gust *= .5; }, 400);
  }, { passive: true });

  function start() {
    if (!ctx) build();
    ctx.resume();
    on = true; paint();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(.55, ctx.currentTime, .9);
    clearTimeout(birdTimer); if (birdFn) birdTimer = setTimeout(birdFn, 2500);
    try { localStorage.setItem(KEY, 'on'); } catch (e) {}
  }
  function stop(remember = true) {
    on = false; paint();
    if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, .35); setTimeout(() => { if (!on) ctx.suspend(); }, 1600); }
    if (remember) { try { localStorage.setItem(KEY, 'off'); } catch (e) {} }
  }
  btn.addEventListener('click', () => (on ? stop() : start()));

  // Keep it quiet in background tabs.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });

  // If the visitor turned it on earlier, resume on their first interaction with this page.
  let wanted = false; try { wanted = localStorage.getItem(KEY) === 'on'; } catch (e) {}
  if (wanted) {
    label.textContent = 'Sound of Carneros · tap to resume';
    const resume = e => { if (e.target === btn || btn.contains(e.target)) return; start(); off(); };
    const off = () => ['pointerdown', 'keydown'].forEach(n => removeEventListener(n, resume, true));
    ['pointerdown', 'keydown'].forEach(n => addEventListener(n, resume, true));
  }
})();
