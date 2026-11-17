/* LUMIST · Carneros ambience
   A soundscape synthesised in the browser (no recordings): wind off San Pablo Bay,
   water at the marsh edge, vine leaves in the gusts, the odd marsh bird, and an
   original, unhurried piano theme written for LUMIST.
   Off by default; a visitor turns it on. The choice is remembered between pages. */
(() => {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const KEY = 'lumist-ambience';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let ctx = null, master = null, on = false, birdTimer = 0, waveTimer = 0, gust = 0;
  let windGain, whistleGain, leafGain, windFilter, birdFn = null, rustleFn = null, leafTimer = 0, lastRustle = 0;
  let pianoFn = null, pianoTimer = 0, pianoBus = null;

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
    btn.setAttribute('aria-label', on ? 'Turn off the sound of Carneros' : 'Play the sound of Carneros: wind, bay water, marsh birds and a quiet piano');
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
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 360; windFilter.Q.value = .6;
    windGain = ctx.createGain(); windGain.gain.value = .051;
    const windPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    loop(noiseBuffer('brown', 8)).connect(windFilter); windFilter.connect(windGain);
    if (windPan) { windGain.connect(windPan); windPan.connect(master); lfo(.031, .55, windPan.pan); } else windGain.connect(master);
    lfo(.05, 140, windFilter.frequency); lfo(.035, .015, windGain.gain, 3);

    // Gust whistle through the trellis wires.
    const whistle = ctx.createBiquadFilter(); whistle.type = 'bandpass'; whistle.frequency.value = 1150; whistle.Q.value = 9;
    whistleGain = ctx.createGain(); whistleGain.gain.value = .0021;
    loop(noiseBuffer('pink', 7)).connect(whistle); whistle.connect(whistleGain); whistleGain.connect(master);
    lfo(.11, 380, whistle.frequency); lfo(.05, .0015, whistleGain.gain, 1);

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

    // ---------- Piano: original, classical in shape with a modern touch (F major, ~68 bpm) ----------
    // Written for LUMIST; each period is generated from the progressions below, so it never loops exactly.
    pianoBus = ctx.createGain(); pianoBus.gain.value = .2;
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = .3;
    pianoBus.connect(warm); warm.connect(master);
    const pianoSend = ctx.createGain(); pianoSend.gain.value = .9; warm.connect(pianoSend); pianoSend.connect(space);
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    function note(t, m, vel) {
      const f = hz(m), dur = Math.min(7, Math.max(2.2, 2.4 + (84 - m) * .09));
      const env = ctx.createGain(), tone = ctx.createBiquadFilter();
      tone.type = 'lowpass'; tone.Q.value = .5;
      tone.frequency.setValueAtTime(Math.min(9000, f * (6 + vel * 8)), t);
      tone.frequency.setTargetAtTime(Math.max(400, f * 2.2), t + .02, dur / 5);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vel, t + .005);
      env.gain.setTargetAtTime(vel * .45, t + .005, .09);
      env.gain.setTargetAtTime(.0001, t + .2, dur / 4.2);
      let out = env;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-.6, Math.min(.6, (m - 62) / 30)); env.connect(p); out = p; }
      tone.connect(env); out.connect(pianoBus);
      const parts = [1, .5, .26, .14, .08, .04];
      parts.forEach((a, i) => {
        const k = i + 1, fk = f * k * (1 + .00035 * k * k);
        if (fk > 9000) return;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = fk; g.gain.value = a / 2.2;
        o.connect(g); g.connect(tone); o.start(t); o.stop(t + dur + .6);
        if (k === 1) { // a second string, a hair out of tune, for warmth
          const o2 = ctx.createOscillator(), g2 = ctx.createGain();
          o2.type = 'sine'; o2.frequency.value = fk * 1.0009; g2.gain.value = a / 3.4;
          o2.connect(g2); g2.connect(tone); o2.start(t); o2.stop(t + dur + .6);
        }
      });
      // felt hammer
      const n = ctx.createBufferSource(), nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .03), ctx.sampleRate), d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      nf.type = 'bandpass'; nf.frequency.value = Math.min(6000, f * 3); nf.Q.value = 1.2; ng.gain.value = vel * .05;
      n.buffer = nb; n.connect(nf); nf.connect(ng); ng.connect(pianoBus); n.start(t);
    }
    // Classical shape, modern colour: 8-bar periods (question then answer) with
    // broken-chord / Alberti accompaniment, a singing right-hand line, real cadences,
    // and occasional added 9ths, suspensions and quiet held bars. Original material.
    const KEY = 53;                                   // F3
    const MAJ = [0, 2, 4, 5, 7, 9, 11];
    const deg = (d, oct = 0) => KEY + 12 * (oct + Math.floor(d / 7)) + MAJ[((d % 7) + 7) % 7];
    // chord = scale degree of root; quality comes from the key. color: extra degree (6 = 7th, 8 = 9th)
    const PERIODS = [
      [[0], [5], [3], [4, 'half'], [0], [3], [4, 'sus'], [0, 'end']],
      [[5], [3], [0], [4, 'half'], [1, 7], [4, 7], [0, 'add9'], [0, 'end']],
      [[0, 7], [2], [3], [0], [1, 7], [4, 'sus'], [5], [0, 'end']],
      [[0], [4], [5], [2], [3], [0], [1, 7], [0, 'end']],          // a slow descending-bass walk
      [[3, 'add9'], [0], [1, 7], [4, 'half'], [3], [0], [4, 'sus'], [0, 'end']],
    ];
    function chordTones(root, kind) {
      const t = [root, root + 2, root + 4];
      if (kind === 7) t.push(root + 6);
      if (kind === 'add9' || kind === 'end' && Math.random() < .5) t.push(root + 8);
      return t;
    }
    let prevDeg = 9;                                  // melody memory, in scale degrees above KEY
    function phrase() {
      if (!on) return;
      const beat = 60 / (64 + Math.random() * 8), eighth = beat / 2;
      const period = PERIODS[Math.floor(Math.random() * PERIODS.length)];
      let t = ctx.currentTime + .2;
      const human = () => (Math.random() - .5) * .025;
      const alberti = Math.random() < .55;
      period.forEach(([root, kind], bar) => {
        const tones = chordTones(root, kind);
        const sparse = !kind && Math.random() < .14;   // a modern held bar: let it breathe
        // ---- left hand ----
        const bass = deg(root, -1) - (deg(root, -1) > 50 ? 12 : 0);
        const fifth = bass + 7, third = deg(root + 2, -1) + (deg(root + 2, -1) < bass ? 12 : 0);
        const top = third + (fifth - bass > 0 ? 5 : 0);
        const lv = .07 + Math.random() * .015;
        if (sparse || kind === 'end') {
          note(t + human(), bass, lv * 1.2); note(t + .06 + human(), fifth, lv); note(t + .12 + human(), third + 12, lv * .9);
        } else if (alberti) {
          const pat = [bass, fifth, third + 12, fifth];
          for (let i = 0; i < 8; i++) note(t + i * eighth + human(), i === 0 ? bass : pat[i % 4] + (i % 4 ? 0 : 12), i === 0 ? lv * 1.25 : lv * (i % 2 ? .78 : .9));
        } else {
          const up = [bass, fifth, third + 12, fifth + 12, third + 12, fifth];
          for (let i = 0; i < 6; i++) note(t + i * (beat * 4 / 6) + human(), up[i], i === 0 ? lv * 1.25 : lv * .82);
        }
        // ---- right hand ----
        const cadence = kind === 'half' || kind === 'end';
        const target = kind === 'end' ? 7 : kind === 'half' ? (Math.random() < .5 ? 8 : 6) : null;
        const beats = sparse ? [0] : cadence ? [0, 1, 2] : [0, 1, 2, 3];
        beats.forEach((bt, i) => {
          const strong = bt === 0 || bt === 2;
          let d;
          if (cadence && i === beats.length - 1) d = target;
          else if (strong) {                          // a chord tone near the last note
            const opts = tones.flatMap(x => [x + 7, x + 14]).filter(x => x >= 7 && x <= 16);
            d = opts.reduce((a, x) => Math.abs(x - prevDeg) < Math.abs(a - prevDeg) ? x : a, opts[0]);
            if (Math.abs(d - prevDeg) === 0 && Math.random() < .5) d += Math.random() < .5 ? 1 : -1;
          } else d = prevDeg + (Math.random() < .5 ? 1 : -1) * (Math.random() < .8 ? 1 : 2);   // passing / neighbour
          d = Math.max(7, Math.min(16, d));
          const m = deg(d, 0);
          const at = t + bt * beat + human();
          const dur8 = !strong && !cadence && Math.random() < .3;   // two eighths now and then
          const v = (strong ? .13 : .1) + Math.random() * .025;
          if (strong && !cadence && Math.random() < .12) note(at - .09, deg(d + 1, 0), v * .55);   // appoggiatura
          if (kind === 'sus' && bt === 2) { note(at, deg(d + 1, 0), v); note(at + beat * .9, m, v * .85); }
          else note(at, m, v);
          if (dur8) { const d2 = d + (Math.random() < .5 ? 1 : -1); note(at + eighth, deg(Math.max(7, Math.min(16, d2)), 0), v * .85); prevDeg = d2; }
          else prevDeg = d;
        });
        t += beat * 4 * (kind === 'end' ? 1.35 : kind === 'half' ? 1.08 : 1);   // a little ritardando at cadences
      });
      pianoTimer = setTimeout(phrase, (t - ctx.currentTime + 5 + Math.random() * 6) * 1000);
    }
    pianoFn = phrase;
  }

  // Scrolling stirs the air a little, like the page's bubbles.
  let lastY = scrollY, lastT = performance.now();
  addEventListener('scroll', () => {
    const now = performance.now(), v = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
    lastY = scrollY; lastT = now;
    if (!on || !ctx || reduce.matches) return;
    gust = Math.min(1, gust + v * .5);
    const t = ctx.currentTime;
    windGain.gain.setTargetAtTime(.051 + gust * .024, t, .2);
    windGain.gain.setTargetAtTime(.051, t + .5, 1.1);
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
    clearTimeout(pianoTimer); if (pianoFn) pianoTimer = setTimeout(pianoFn, 3500);
    try { localStorage.setItem(KEY, 'on'); } catch (e) {}
  }
  function stop(remember = true) {
    on = false; paint(); clearTimeout(pianoTimer);
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
