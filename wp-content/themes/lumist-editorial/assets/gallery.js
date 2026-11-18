/* LUMIST Gallery — click a book on the shelf and leaf through it like a photo album.
   Pages turn on click (right page forward, left page back), with the arrow keys,
   by swiping, or with the buttons. Esc closes the album. */
(() => {
  const shelf = document.querySelector('.g-shelf');
  if (!shelf || shelf.dataset.ready) return;
  shelf.dataset.ready = '1';
  const BOOKS = JSON.parse(shelf.dataset.books);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const viewer = document.createElement('div');
  viewer.className = 'g-viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.innerHTML = `<div class="bar"><span class="name"></span><button type="button" class="close" aria-label="Close the album">×</button></div>
    <div class="stage"><div class="album closed"></div></div>
    <div class="controls"><button type="button" class="prev">← Previous</button><span class="count" aria-live="polite"></span><button type="button" class="next">Next →</button></div>`;
  document.body.appendChild(viewer);
  const album = viewer.querySelector('.album');
  let leaves = [], at = 0, lastFocus = null, book = null;

  // Page content -------------------------------------------------------------
  function photoPage(p, n) {
    const tilt = ((n * 37) % 5 - 2) * .6;
    const paper = p.paper ? ' paper' : '';
    return `<div class="inner"><figure class="snap${paper}" style="--tilt:${tilt}deg;margin:0">${p.paper ? '' : '<i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i>'}<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">${p.paper ? '' : '<span class="gap"></span>'}</figure>
      <p class="cap">${esc(p.caption)}${p.credit ? `<small>${esc(p.credit)}</small>` : ''}</p></div><span class="folio">${n}</span>`;
  }
  function build(b) {
    const pages = [];
    pages.push({ cls: 'cover-face', html: `<div class="window${b.coverPaper ? ' paper' : ''}"><img src="${esc(b.cover)}" alt=""></div><h2>${esc(b.title)}</h2><p>${esc(b.sub)}</p>` });
    pages.push({ cls: 'page title-page', html: `<div class="inner"><h3>${esc(b.title)}</h3><div class="rule"></div><p>${esc(b.intro)}</p></div>` });
    b.photos.forEach((p, i) => pages.push({ cls: 'page', html: photoPage(p, i + 2) }));
    if (pages.length % 2) pages.push({ cls: 'page end-page', html: '<div class="inner"><p>LUMIST · Carneros</p></div>' });
    pages.push({ cls: 'page end-page', html: '<div class="inner"><p>~</p></div>' });
    pages.push({ cls: 'cover-face', html: `<p>LUMIST</p>` });
    album.innerHTML = '';
    album.style.setProperty('--cloth', b.cloth);
    leaves = [];
    for (let i = 0; i < pages.length; i += 2) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.innerHTML = `<div class="face front ${pages[i].cls}">${pages[i].html}</div><div class="face back ${pages[i + 1].cls}">${pages[i + 1].html}</div><div class="shade"></div>`;
      album.appendChild(leaf);
      leaves.push(leaf);
    }
    at = 0;
    layout(false);
  }

  // Turning -------------------------------------------------------------------
  function layout(animate) {
    leaves.forEach((leaf, i) => {
      const turned = i < at;
      leaf.classList.toggle('turned', turned);
      leaf.style.zIndex = turned ? i + 1 : leaves.length - i;
    });
    album.classList.toggle('closed', at === 0);
    album.classList.toggle('ended', at === leaves.length);
    const total = leaves.length * 2 - 2;
    const left = at * 2 - 1, right = at * 2;
    viewer.querySelector('.count').textContent =
      at === 0 ? 'Cover' : at === leaves.length ? 'Back cover' : `${Math.max(1, left)}–${Math.min(right, total)} of ${total}`;
    viewer.querySelector('.prev').disabled = at === 0;
    viewer.querySelector('.next').disabled = at === leaves.length;
  }
  function turn(dir) {
    const next = Math.max(0, Math.min(leaves.length, at + dir));
    if (next === at) return;
    const leaf = leaves[dir > 0 ? at : at - 1];
    leaf.style.zIndex = 999;
    leaf.classList.add('moving');
    setTimeout(() => leaf.classList.remove('moving'), 1000);
    at = next;
    leaf.classList.toggle('turned', dir > 0);
    setTimeout(() => layout(true), 520);   // settle the stacking once the page is upright
    album.classList.toggle('closed', at === 0);
    album.classList.toggle('ended', at === leaves.length);
    const prev = viewer.querySelector('.prev'), nxt = viewer.querySelector('.next');
    prev.disabled = at === 0; nxt.disabled = at === leaves.length;
  }

  // Open / close --------------------------------------------------------------
  function open(id, from) {
    book = BOOKS.find(b => b.id === id); if (!book) return;
    lastFocus = from || document.activeElement;
    viewer.querySelector('.name').textContent = book.title;
    build(book);
    viewer.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    viewer.querySelector('.next').focus({ preventScroll: true });
    setTimeout(() => turn(1), 450);          // open the cover
  }
  function close() {
    viewer.classList.remove('on');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }

  shelf.addEventListener('click', e => { const b = e.target.closest('.g-book'); if (b) open(b.dataset.book, b); });
  viewer.querySelector('.close').addEventListener('click', close);
  viewer.querySelector('.prev').addEventListener('click', () => turn(-1));
  viewer.querySelector('.next').addEventListener('click', () => turn(1));
  album.addEventListener('click', e => {
    const r = album.getBoundingClientRect();
    turn(e.clientX > r.left + r.width / 2 ? 1 : -1);
  });
  document.addEventListener('keydown', e => {
    if (!viewer.classList.contains('on') || !viewer.isConnected) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
  });
  let sx = null;
  album.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  album.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) turn(dx < 0 ? 1 : -1);
  });
  // Deep link: gallery/#ramal-road opens that album.
  const want = location.hash.slice(1);
  if (want && BOOKS.some(b => b.id === want)) setTimeout(() => open(want, shelf.querySelector(`[data-book="${want}"]`)), 300);
})();
