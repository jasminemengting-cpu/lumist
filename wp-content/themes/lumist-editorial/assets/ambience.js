/* LUMIST · Carneros ambience
   A soundscape synthesised in the browser (no recordings): wind off San Pablo Bay,
   water at the marsh edge, vine leaves in the gusts, the odd marsh bird, and an
   original piano theme written for LUMIST, played on sampled
   Salamander Grand Piano V3 recordings by Alexander Holm (CC BY 3.0).
   Off by default; a visitor turns it on. The choice is remembered between pages. */
(() => {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ME = document.currentScript && document.currentScript.src;
  const PIANO_BASE = ME ? new URL('piano/', ME).href : 'piano/';
  const PIANO_ON = false;   // piano paused for now; set to true to bring it back
  const KEY = 'lumist-ambience';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let ctx = null, master = null, on = false, birdTimer = 0, waveTimer = 0, gust = 0;
  let windGain, whistleGain, leafGain, windFilter, birdFn = null, rustleFn = null, leafTimer = 0, lastRustle = 0;
  let pianoFn = null, pianoTimer = 0, pianoBus = null, loadSamplesFn = null;

  const css = `
  /* room at the end of the page so the fixed button never sits on the footer text */
  body{padding-bottom:calc(clamp(12px,2vw,24px) + 56px)}
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
  .lumist-ambience-credit{position:fixed;left:clamp(12px,2vw,24px);bottom:calc(clamp(12px,2vw,24px) + 44px);z-index:260;
    font:italic 12px/1.3 "EB Garamond",Georgia,serif;color:#555;background:rgba(255,255,255,.85);padding:3px 6px;display:none}
  .lumist-ambience-credit a{color:inherit}
  .lumist-ambience[aria-pressed="true"] + .lumist-ambience-credit{display:block}
  @media print{.lumist-ambience,.lumist-ambience-credit{display:none}}`;
  const style = document.createElement('style'); style.textContent = css; style.dataset.lumistKeep = ''; document.head.appendChild(style);

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
  const credit = document.createElement('p');
  credit.className = 'lumist-ambience-credit';
  credit.innerHTML = 'Piano: <a href="https://archive.org/details/SalamanderGrandPianoV3" rel="noopener">Salamander Grand Piano</a>, Alexander Holm, <a href="https://creativecommons.org/licenses/by/3.0/" rel="noopener">CC BY 3.0</a>';
  if (PIANO_ON) document.body.appendChild(credit);

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

    // ---------- Piano: a real grand, sampled (Salamander Grand Piano V3, CC BY 3.0) ----------
    // Classical in shape, modern in colour, with a light Californio lilt in the left hand
    // (a soft habanera sway, a nod to the Mexican ranchos that named Los Carneros). Original music.
    pianoBus = ctx.createGain(); pianoBus.gain.value = .55;
    const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 220; warm.gain.value = 2;
    const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 5000; air.gain.value = -4;
    pianoBus.connect(warm); warm.connect(air); air.connect(master);
    const room = ctx.createGain(); room.gain.value = .55; air.connect(room); room.connect(space);
    const SAMPLE_NOTES = [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90];
    const samples = { 4: {}, 8: {} };
    let samplesReady = null;
    function loadSamples() {
      if (samplesReady) return samplesReady;
      const jobs = [];
      for (const layer of [4, 8]) for (const m of SAMPLE_NOTES) {
        jobs.push(fetch(PIANO_BASE + m + '-v' + layer + '.mp3').then(r => r.arrayBuffer())
          .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
          .then(buf => { samples[layer][m] = buf; }).catch(() => {}));
      }
      samplesReady = Promise.all(jobs);
      return samplesReady;
    }
    function voice(t, m, vel, layer, gain, release) {
      const near = SAMPLE_NOTES.reduce((a, x) => Math.abs(x - m) < Math.abs(a - m) ? x : a, SAMPLE_NOTES[0]);
      const buf = samples[layer][near]; if (!buf) return;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.playbackRate.value = Math.pow(2, (m - near) / 12);
      g.gain.setValueAtTime(gain, t);
      g.gain.setValueAtTime(gain, release);
      g.gain.setTargetAtTime(.0001, release, .28);          // the damper comes down
      let out = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-.45, Math.min(.45, (m - 62) / 36)); g.connect(p); out = p; }
      src.connect(g); out.connect(pianoBus); src.start(t); src.stop(release + 1.6);
    }
    // vel 0..1: blend the soft and medium recordings, like a real touch
    function note(t, m, vel, hold) {
      const release = t + Math.max(.25, hold || 1.5);
      const mix = Math.max(0, Math.min(1, (vel - .25) / .5));
      const level = .35 + vel * .65;
      if (mix < .98) voice(t, m, vel, 4, level * (1 - mix), release);
      if (mix > .02) voice(t, m, vel, 8, level * mix * .8, release);
    }
    const KEY = 53;                                   // F3
    const MAJ = [0, 2, 4, 5, 7, 9, 11];
    const deg = (d, oct = 0) => KEY + 12 * (oct + Math.floor(d / 7)) + MAJ[((d % 7) + 7) % 7];
    const PERIODS = [
      [[0], [5], [3], [4, 'half'], [0], [3], [4, 'sus'], [0, 'end']],
      [[5], [3], [0], [4, 'half'], [1, 7], [4, 7], [0, 'add9'], [0, 'end']],
      [[0, 7], [2], [3], [0], [1, 7], [4, 'sus'], [5], [0, 'end']],
      [[0], [4], [5], [2], [3], [0], [1, 7], [0, 'end']],
      [[3, 'add9'], [0], [1, 7], [4, 'half'], [3], [0], [4, 'sus'], [0, 'end']],
    ];
    function chordTones(root, kind) {
      const t = [root, root + 2, root + 4];
      if (kind === 7) t.push(root + 6);
      if (kind === 'add9' || (kind === 'end' && Math.random() < .5)) t.push(root + 8);
      return t;
    }
    let prevDeg = 9;
    function phrase() {
      if (!on) return;
      if (!samples[4][60]) { pianoTimer = setTimeout(phrase, 1500); return; }   // still loading
      const tempo = 64 + Math.random() * 8;
      let t = ctx.currentTime + .25;
      const period = PERIODS[Math.floor(Math.random() * PERIODS.length)];
      const style = Math.random() < .45 ? 'lilt' : Math.random() < .55 ? 'alberti' : 'roll';
      const human = () => (Math.random() - .5) * .03;
      period.forEach(([root, kind], bar) => {
        // rubato: breathe a little at the start and at cadences
        const local = tempo * (bar === 0 ? .94 : kind === 'end' ? .86 : kind === 'half' ? .93 : 1 + (Math.random() - .5) * .04);
        const beat = 60 / local, eighth = beat / 2, barLen = beat * 4;
        const tones = chordTones(root, kind);
        const sparse = !kind && Math.random() < .14;
        const pedal = t + barLen * (kind === 'end' ? 2.2 : 1) - .05;   // change pedal with the harmony
        // ---- left hand ----
        let bass = deg(root, -1); if (bass > 50) bass -= 12;
        const fifth = bass + 7; let third = deg(root + 2, -1); if (third < bass) third += 12;
        const lv = .2 + Math.random() * .05;
        if (sparse || kind === 'end') {
          [bass, fifth, third + 12].forEach((m, i) => note(t + i * .07 + human(), m, lv * (1.1 - i * .12), pedal - t));
        } else if (style === 'lilt') {
          // habanera sway: bass on 1, chord on the "and-a", chord on 2, fifth on 3, chord on 4
          const hab = [[0, bass, 1.15], [beat * .75, third + 12, .8], [beat, fifth + 12, .85], [beat * 2, fifth, 1], [beat * 2.75, third + 12, .75], [beat * 3, fifth + 12, .8]];
          hab.forEach(([o, m, k]) => note(t + o + human(), m, lv * k, pedal - t - o));
        } else if (style === 'alberti') {
          const pat = [bass, fifth, third + 12, fifth];
          for (let i = 0; i < 8; i++) note(t + i * eighth + human(), i === 0 ? bass : pat[i % 4] + (i % 4 ? 0 : 12), lv * (i === 0 ? 1.15 : i % 2 ? .72 : .82), pedal - t - i * eighth);
        } else {
          const up = [bass, fifth, third + 12, fifth + 12, third + 12, fifth];
          for (let i = 0; i < 6; i++) note(t + i * (barLen / 6) + human(), up[i], lv * (i === 0 ? 1.15 : .78), pedal - t - i * (barLen / 6));
        }
        // ---- right hand ----
        const cadence = kind === 'half' || kind === 'end';
        const target = kind === 'end' ? 7 : kind === 'half' ? (Math.random() < .5 ? 8 : 6) : null;
        let beats = sparse ? [0] : cadence ? [0, 1, 2] : [0, 1, 2, 3];
        // a little syncopation in lilt bars: push beat 3 forward by an eighth
        if (style === 'lilt' && !cadence && !sparse && Math.random() < .5) beats = [0, 1, 1.5, 3];
        beats.forEach((bt, i) => {
          const strong = bt === 0 || bt === 2 || bt === 1.5;
          let d;
          if (cadence && i === beats.length - 1) d = target;
          else if (strong) {
            const opts = tones.flatMap(x => [x + 7, x + 14]).filter(x => x >= 7 && x <= 16);
            d = opts.reduce((a, x) => Math.abs(x - prevDeg) < Math.abs(a - prevDeg) ? x : a, opts[0]);
            if (d === prevDeg && Math.random() < .5) d += Math.random() < .5 ? 1 : -1;
          } else d = prevDeg + (Math.random() < .5 ? 1 : -1) * (Math.random() < .8 ? 1 : 2);
          d = Math.max(7, Math.min(16, d));
          const m = deg(d, 0);
          const at = t + bt * beat + human() + (bt === 0 ? .012 : 0);      // melody leans slightly late, like a singer
          const next = beats[i + 1] !== undefined ? beats[i + 1] * beat : barLen;
          const hold = Math.max(next - bt * beat, beat * .9) + .15;
          const v = (strong ? .42 : .32) + Math.random() * .08 + (cadence && i === beats.length - 1 ? -.06 : 0);
          if (strong && !cadence && Math.random() < .1) note(at - .08, deg(d + 1, 0), v * .6, .12);   // grace note
          if (kind === 'sus' && bt === 2) { note(at, deg(d + 1, 0), v, beat * .9); note(at + beat * .9, m, v * .85, hold); }
          else note(at, m, v, cadence && i === beats.length - 1 ? pedal - at : hold);
          prevDeg = d;
        });
        t += barLen;
      });
      pianoTimer = setTimeout(phrase, (t - ctx.currentTime + 5 + Math.random() * 6) * 1000);
    }
    pianoFn = phrase; loadSamplesFn = loadSamples;
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
    clearTimeout(pianoTimer); if (PIANO_ON && pianoFn) { loadSamplesFn && loadSamplesFn(); pianoTimer = setTimeout(pianoFn, 3500); }
    try { localStorage.setItem(KEY, 'on'); } catch (e) {}
  }
  function stop(remember = true) {
    on = false; paint(); clearTimeout(pianoTimer);
    if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, .35); setTimeout(() => { if (!on) ctx.suspend(); }, 1600); }
    if (remember) { try { localStorage.setItem(KEY, 'off'); } catch (e) {} }
  }
  btn.addEventListener('click', () => (on ? stop() : start()));


  // ---------- Keep the sound going between pages ----------
  // While the sound is on, links inside the site swap the page in place instead of
  // reloading it, so the audio never stops. The address bar, Back and Forward work as usual.
  const SITE = ME ? new URL('../../../../', ME).href : location.origin + '/';
  const RERUN = /(site|commerce|estate-experience|estate-harvest|estate-vines|lumist-store)\.js(\?|$)/;
  let swapped = false, busy = false;
  function internal(u) {
    return u.origin === location.origin && u.href.startsWith(SITE)
      && !/\.(png|jpe?g|webp|gif|svg|mp3|pdf|zip|css|js|txt|json)$/i.test(u.pathname)
      && !/\/(backup|archive|wp-admin|wp-content)\//.test(u.pathname);
  }
  function loadCss(href) {
    return new Promise(res => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
      const done = () => res(l); l.onload = done; l.onerror = done; setTimeout(done, 2000);
      document.head.appendChild(l);
    });
  }
  function runScript(src) {
    return new Promise(res => { const sc = document.createElement('script'); sc.src = src; sc.onload = sc.onerror = () => res(); document.body.appendChild(sc); });
  }
  async function go(url, push) {
    if (busy) return; busy = true;
    try {
      const r = await fetch(url.href, { credentials: 'same-origin' });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('text/html')) throw new Error('not html');
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const base = new URL(url.href);
      const abs = h => new URL(h, base).href;
      // stylesheets: add the new page's first, then drop what it doesn't use
      const keep = el => el.hasAttribute('data-lumist-keep');
      const curLinks = [...document.head.querySelectorAll('link[rel="stylesheet"]')].filter(l => !keep(l));
      const newHrefs = [...doc.head.querySelectorAll('link[rel="stylesheet"]')].map(l => abs(l.getAttribute('href')));
      const have = new Set(curLinks.map(l => l.href));
      await Promise.all(newHrefs.filter(h => !have.has(h)).map(loadCss));
      curLinks.filter(l => !newHrefs.includes(l.href)).forEach(l => l.remove());
      document.head.querySelectorAll('style').forEach(el => { if (!keep(el)) el.remove(); });
      doc.head.querySelectorAll('style').forEach(el => document.head.appendChild(el.cloneNode(true)));
      document.title = doc.title;
      // body: everything except the sound button stays in step with the new page
      document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
      document.documentElement.classList.remove('drawer-open');
      document.body.className = doc.body.className;
      const persist = new Set([btn, credit]);
      [...document.body.childNodes].forEach(n => { if (!persist.has(n)) n.remove(); });
      const frag = document.createDocumentFragment();
      [...doc.body.childNodes].forEach(n => { if (n.nodeName !== 'SCRIPT') frag.appendChild(document.importNode(n, true)); });
      document.body.insertBefore(frag, btn);
      // fix relative links/images: the new page's paths are relative to its own folder
      if (base.pathname !== location.pathname) {
        document.body.querySelectorAll('[href],[src]').forEach(el => {
          if (persist.has(el) || btn.contains(el)) return;
          for (const at of ['href', 'src']) {
            const v = el.getAttribute(at);
            if (v && !/^(#|[a-z]+:|\/\/)/i.test(v)) el.setAttribute(at, abs(v));
          }
        });
      }
      if (push) history.pushState({ lumist: 1 }, '', url.href);
      swapped = true;
      // restart the page's own scripts (they are written to run again safely)
      for (const sc of doc.querySelectorAll('script[src]')) {
        const src = abs(sc.getAttribute('src'));
        if (RERUN.test(src)) await runScript(src);
      }
      if (url.hash) { const t = document.getElementById(decodeURIComponent(url.hash.slice(1))); if (t) t.scrollIntoView(); else scrollTo(0, 0); }
      else scrollTo(0, 0);
      const main = document.querySelector('main'); if (main) { main.setAttribute('tabindex', '-1'); main.style.outline = 'none'; main.focus({ preventScroll: true, focusVisible: false }); }
    } catch (e) {
      location.href = url.href;          // anything unexpected: fall back to a normal page load
    } finally { busy = false; }
  }
  document.addEventListener('click', e => {
    if (!on || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (!internal(u)) return;
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return;   // same-page anchor
    e.preventDefault(); go(u, true);
  });
  history.replaceState(Object.assign({}, history.state, { lumist: 1 }), '');
  addEventListener('popstate', e => { if (swapped || (e.state && e.state.lumist && on)) go(new URL(location.href), false); });

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
