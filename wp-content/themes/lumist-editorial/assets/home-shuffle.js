/* LUMIST home — the Journal entries come in a new order on every visit. */
(() => {
  const box = document.querySelector('.entries');
  if (!box || box.dataset.shuffled) return;
  box.dataset.shuffled = '1';
  const items = [...box.children];
  for (let i = items.length - 1; i > 0; i--) {          // Fisher–Yates
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach(el => box.appendChild(el));
})();
