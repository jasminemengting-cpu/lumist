/* LUMIST Journal — set the page like old newsprint.
   Adds the folio line, edition line and byline, sets running text in ruled,
   justified columns with a drop initial, and screens photographs as halftone. */
(() => {
  const main = document.querySelector('main');
  if (!main || main.dataset.newsprint) return;
  main.dataset.newsprint = '1';
  document.body.classList.add('newsprint');

  const ISSUES = {
    'the-space-between-notes': [1, 'Essays'], 'no-special-occasion': [2, 'Essays'],
    'a-different-kind-of-attention': [3, 'Essays'], 'quiet-neighbours': [4, 'Field notes'],
    'fog-then-light': [5, 'Place'], 'in-plain-english': [6, 'Bubble wine'],
    'same-road-new-chapter': [7, 'History'], 'stories-from-ramal-road': [8, 'Place'],
  };
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  // Halftone screen over every photograph (drawings and bottles stay clean).
  main.querySelectorAll('figure img, .im img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (/placeholder|estate-art/.test(src) || img.closest('.np-photo') || img.closest('.im')) return;
    const wrap = el('span', 'np-photo');
    wrap.style.cssText = 'position:relative;display:block;height:100%';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    wrap.appendChild(el('span', 'np-dots'));
  });

  // The Journal front page: an edition line under the nameplate.
  const jtitle = main.querySelector('.jhead .jtitle');
  if (jtitle && !main.querySelector('.np-edition')) {
    const n = Object.keys(ISSUES).length;
    jtitle.after(el('div', 'np-edition', `<span>Vol. I · No. ${n}</span><span>Carneros, Napa &amp; Sonoma</span><span>${today}</span><span>Fog, then light</span>`));
    return;
  }

  // An essay: folio line, byline, ruled columns.
  const essay = main.querySelector('.essay');
  if (!essay) return;
  const slug = (location.pathname.match(/\/([^/]+)\/?$/) || [])[1] || '';
  const [no, section] = ISSUES[slug] || [0, 'Journal'];
  const article = essay.closest('article') || essay;
  article.insertBefore(el('div', 'np-folio', `<span>The Journal</span><b>${section}</b><span>Carneros, California · No. ${no}</span>`), article.firstChild);
  const h1 = essay.querySelector('h1');
  if (h1 && !essay.querySelector('.np-byline')) {
    let after = h1;
    const next = h1.nextElementSibling;
    if (next && next.tagName === 'P' && next.textContent.length < 260) after = next;
    after.after(el('p', 'np-byline', 'By the LUMIST editors · Filed from Carneros'));
  }

  // Group runs of plain paragraphs into justified, ruled columns.
  const plain = p => p && p.tagName === 'P' && !p.className && !p.getAttribute('style') && !p.closest('.essay-wine,figure,li,table,blockquote');
  let first = true;
  const hasDrop = !!essay.querySelector('[class*="drop"]');
  essay.querySelectorAll('p').forEach(p => {
    if (!plain(p) || p.parentNode.classList.contains('np-cols')) return;
    const run = [p];
    let n = p.nextElementSibling;
    while (plain(n)) { run.push(n); n = n.nextElementSibling; }
    const words = run.reduce((a, q) => a + q.textContent.split(/\s+/).length, 0);
    const wide = p.parentNode.getBoundingClientRect().width > 640;
    if (run.length >= 2 && words > 110 && wide) {
      const box = el('div', 'np-cols' + (first && !hasDrop ? ' np-lead' : ''));
      p.parentNode.insertBefore(box, p);
      run.forEach(q => box.appendChild(q));
      first = false;
    } else run.forEach(q => q.classList.add('np-just'));
  });
})();
