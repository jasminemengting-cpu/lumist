/* LUMIST · preview store
   A working bag, cart, member sign-in and checkout for the static (GitHub Pages) site.
   Everything lives in this visitor's browser (localStorage). No payment is taken and no
   order or account details are sent anywhere: ordering opens with the first release. */
(() => {
  'use strict';
  if (window.__lumistStore) { window.__lumistStore.refresh(); return; }   // page swapped in place: just redraw
  const ME = document.currentScript && document.currentScript.src;
  const ROOT = ME ? new URL('../../../../', ME).href : '/';
  const link = p => ROOT + p;
  const PRICE = 180;
  const PRODUCTS = {
    58: { name: 'Spring 2024', note: 'Spring · Easy', grapes: '68% Chardonnay, 32% Pinot Noir', img: 'lumist-spring-placeholder.png' },
    60: { name: 'Summer 2024', note: 'Summer · Carefree', grapes: '100% Pinot Noir', img: 'lumist-summer-placeholder.png' },
    62: { name: 'Autumn 2024', note: 'Autumn · Poised', grapes: '100% Chardonnay', img: 'lumist-autumn-placeholder.png' },
    64: { name: 'Winter 2024', note: 'Winter · Depth', grapes: '100% Chardonnay', img: 'lumist-winter-placeholder.png' },
  };
  const imgSrc = p => link('wp-content/uploads/2026/11/' + p.img + '?v=pencil');
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const cart = {
    items() { return store.get('lumist-cart', []).filter(i => PRODUCTS[i.id] && i.qty > 0); },
    save(items) { store.set('lumist-cart', items); render(); },
    add(id, qty) { const it = cart.items(); const f = it.find(i => i.id === id); if (f) f.qty += qty; else it.push({ id, qty }); cart.save(it); },
    setQty(id, qty) { cart.save(cart.items().map(i => i.id === id ? { ...i, qty: Math.max(0, Math.min(99, qty)) } : i).filter(i => i.qty > 0)); },
    remove(id) { cart.save(cart.items().filter(i => i.id !== id)); },
    clear() { cart.save([]); },
    count() { return cart.items().reduce((a, i) => a + i.qty, 0); },
    total() { return cart.items().reduce((a, i) => a + i.qty * PRICE, 0); },
  };
  const session = {
    get() { return store.get('lumist-session', null); },
    set(m) { store.set('lumist-session', m); },
    clear() { try { localStorage.removeItem('lumist-session'); } catch (e) {} },
  };
  async function hash(text) {
    if (crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lumist:' + text));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h;
  }

  // ---------- styles ----------
  const css = `
  .lumist-count{position:absolute;top:2px;right:0;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#212121;color:#fff;
    font:600 11px/17px "EB Garamond",Georgia,serif;text-align:center}
  .icons .icon{position:relative}
  .ls-preview{font:italic 14px/1.45 "EB Garamond",Georgia,serif;color:#666;border:1px dashed #9a9a9a;padding:8px 10px;margin:0 0 14px}
  .ls-items{list-style:none;margin:0;padding:0}
  .ls-item{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #e1e1e1}
  .ls-item img{width:64px;height:82px;object-fit:cover;background:#f3f3f1}
  .ls-item h3{font:400 20px/1.1 "IM Fell English",Georgia,serif;margin:0 0 2px}
  .ls-item small{display:block;color:#666;font-size:14px}
  .ls-qty{display:inline-flex;align-items:center;border:1px solid #212121;margin-top:6px}
  .ls-qty button{border:0;background:transparent;width:28px;height:28px;font-size:16px;cursor:pointer;color:#212121}
  .ls-qty button:hover{background:#efefef}
  .ls-qty span{min-width:26px;text-align:center;font-variant-numeric:tabular-nums}
  .ls-line{text-align:right;font-variant-numeric:tabular-nums}
  .ls-remove{display:block;border:0;background:none;padding:0;margin-top:6px;font:italic 14px "EB Garamond",Georgia,serif;color:#666;text-decoration:underline;cursor:pointer}
  .ls-sum{display:flex;justify-content:space-between;align-items:baseline;padding:14px 0 4px;font:400 20px "IM Fell English",Georgia,serif}
  .ls-sum b{font-weight:400;font-variant-numeric:tabular-nums}
  .ls-small{font-size:14px;color:#666;margin:0 0 14px}
  .ls-btn{display:block;width:100%;text-align:center;padding:13px 18px;border:1px solid #212121;background:#212121;color:#fff !important;
    font:400 16px "IM Fell English SC","IM Fell English",Georgia,serif;letter-spacing:.08em;text-decoration:none;cursor:pointer;margin-top:10px}
  .ls-btn:hover{background:#fff;color:#212121 !important}
  .ls-btn.ghost{background:#fff;color:#212121 !important}
  .ls-btn.ghost:hover{background:#212121;color:#fff !important}
  .ls-btn[disabled]{opacity:.45;cursor:not-allowed}
  .ls-empty{font-style:italic;color:#555}
  .ls-fine{font:italic 13px/1.45 "EB Garamond",Georgia,serif;color:#777;margin:10px 0 0}
  .ls-page{max-width:1180px;margin:0 auto}
  main:has(#lumist-cart-page) .page-body,main:has(#lumist-checkout) .page-body,main:has(#lumist-member-page) .page-body{max-width:none;margin:0}
  main:has(#lumist-cart-page)>h1,main:has(#lumist-checkout)>h1{max-width:1180px;margin-left:auto;margin-right:auto}
  .ls-grid{grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr)}
  .ls-steps{display:flex;gap:10px;align-items:center;font:400 15px "IM Fell English SC","IM Fell English",Georgia,serif;letter-spacing:.06em;color:#888;margin:0 0 24px}
  .ls-steps b{color:#212121;font-weight:400;border-bottom:1px solid #212121}
  .ls-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:48px;align-items:start}
  .ls-box{border:1px solid #212121;padding:22px;background:#fff}
  .ls-box h2{font:400 26px "IM Fell English",Georgia,serif;margin:0 0 12px}
  .ls-form{display:grid;gap:14px}
  .ls-form .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .ls-form label{display:grid;gap:5px;font:400 15px "IM Fell English SC","IM Fell English",Georgia,serif;letter-spacing:.05em}
  .ls-form input,.ls-form select{font:400 17px "EB Garamond",Georgia,serif;padding:10px 11px;border:1px solid #9a9a9a;border-radius:0;background:#fff;color:#212121;width:100%}
  .ls-form input:focus,.ls-form select:focus{outline:2px solid #212121;outline-offset:0}
  .ls-check{display:grid !important;grid-template-columns:18px 1fr;gap:10px;font:400 16px/1.4 "EB Garamond",Georgia,serif !important;letter-spacing:0 !important;color:#444}
  .ls-check input{width:16px;height:16px;margin-top:3px;accent-color:#212121}
  .ls-msg{padding:10px 12px;border:1px solid #212121;background:#f4f4f4;font-size:16px;margin:0}
  .ls-msg.err{border-style:dashed}
  .ls-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:3px double #212121;margin:-22px -22px 18px}
  .ls-tabs button{border:0;background:#fff;padding:14px;font:400 17px "IM Fell English SC","IM Fell English",Georgia,serif;letter-spacing:.07em;color:#777;cursor:pointer}
  .ls-tabs button[aria-selected="true"]{background:#f1f1f1;color:#212121}
  .ls-done h2{font:400 34px "IM Fell English",Georgia,serif;margin:0 0 8px}
  @media(max-width:820px){.ls-grid{grid-template-columns:1fr}.ls-form .row{grid-template-columns:1fr}}`;
  const st = document.createElement('style'); st.textContent = css; st.dataset.lumistKeep = ''; document.head.appendChild(st);

  // ---------- shared fragments ----------
  const PREVIEW = '<p class="ls-preview">Preview store: your bag is kept in this browser only. No payment is taken and no order is sent until ordering opens.</p>';
  function itemsHTML(editable) {
    return '<ul class="ls-items">' + cart.items().map(i => {
      const p = PRODUCTS[i.id];
      return `<li class="ls-item"><img src="${imgSrc(p)}" alt="">
        <div><h3>${p.name}</h3><small>${p.note} · ${p.grapes}</small><small>${money(PRICE)} per bottle</small>
        ${editable ? `<span class="ls-qty" role="group" aria-label="Quantity of ${p.name}"><button type="button" data-ls-dec="${i.id}" aria-label="One fewer">−</button><span aria-live="polite">${i.qty}</span><button type="button" data-ls-inc="${i.id}" aria-label="One more">+</button></span>` : `<small>Qty ${i.qty}</small>`}</div>
        <div class="ls-line">${money(i.qty * PRICE)}${editable ? `<button type="button" class="ls-remove" data-ls-remove="${i.id}">Remove</button>` : ''}</div></li>`;
    }).join('') + '</ul>';
  }
  const subtotal = () => `<div class="ls-sum"><span>Subtotal</span><b>${money(cart.total())}</b></div><p class="ls-small">Shipping and tax are confirmed at checkout. Wine ships only where the law allows, and an adult signature (21+) is required on delivery.</p>`;

  // ---------- bag drawer ----------
  function renderDrawer() {
    document.querySelectorAll('#lumist-bag .lumist-bag-content').forEach(box => {
      const n = cart.count();
      box.innerHTML = (n ? itemsHTML(true) + subtotal()
        : '<p class="ls-empty">Your bag is empty. Discover a wine through the Journal.</p>')
        + `<a class="ls-btn" href="${link('cart/')}">See my shopping bag</a>`
        + '<p class="ls-fine">Preview store: your bag is kept in this browser only. No payment is taken and no order is sent until ordering opens.</p>';
    });
  }
  function badge() {
    const n = cart.count();
    document.querySelectorAll('[data-lumist-bag]').forEach(a => {
      let b = a.querySelector('.lumist-count');
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'lumist-count'; b.setAttribute('aria-hidden', 'true'); a.appendChild(b); }
      b.textContent = n;
      a.setAttribute('aria-label', `Shopping bag, ${n} bottle${n > 1 ? 's' : ''}`);
    });
    const m = session.get();
    document.querySelectorAll('.icons a[aria-label="Log in"], .icons a[data-ls-account]').forEach(a => {
      a.setAttribute('data-ls-account', ''); a.title = m ? `Signed in as ${m.name}` : 'Log in';
      a.setAttribute('aria-label', m ? `Account, signed in as ${m.name}` : 'Log in');
    });
  }
  function openBag() {
    const d = document.getElementById('lumist-bag'); if (!d) { location.href = link('cart/'); return; }
    renderDrawer();
    document.querySelectorAll('dialog[open]').forEach(x => x.close());
    d.showModal(); document.documentElement.classList.add('drawer-open');
  }

  // ---------- cart page ----------
  function renderCartPage() {
    const root = document.getElementById('lumist-cart-page'); if (!root) return;
    const n = cart.count();
    root.innerHTML = `<div class="ls-page"><p class="ls-steps"><b>1 · Bag</b> — <span>2 · Sign in</span> — <span>3 · Checkout</span></p>${PREVIEW}
      ${n ? `<div class="ls-grid"><div>${itemsHTML(true)}</div><aside class="ls-box"><h2>Summary</h2>
        <div class="ls-sum" style="padding-top:0"><span>${n} bottle${n > 1 ? 's' : ''}</span><b>${money(cart.total())}</b></div>
        <p class="ls-small">Shipping and tax are confirmed at checkout.</p>
        <a class="ls-btn" href="${link('checkout/')}">Proceed to checkout</a>
        <a class="ls-btn ghost" href="${link('journal/')}">Keep browsing</a>
        <p class="ls-small" style="margin-top:12px">You will be asked to sign in to your LUMIST member account before checkout.</p></aside></div>`
      : `<p class="ls-empty">Your bag is empty.</p><a class="ls-btn ghost" style="max-width:320px" href="${link('journal/')}">Discover a wine through the Journal</a>`}</div>`;
  }

  // ---------- member sign-in / create account ----------
  function memberForms(next) {
    return `<div class="ls-box" id="ls-member-box"><div class="ls-tabs" role="tablist" aria-label="Account">
      <button type="button" role="tab" id="ls-tab-in" aria-selected="true" aria-controls="ls-pane-in">Sign in</button>
      <button type="button" role="tab" id="ls-tab-up" aria-selected="false" aria-controls="ls-pane-up" tabindex="-1">Create account</button></div>
      <form class="ls-form" id="ls-pane-in" role="tabpanel" aria-labelledby="ls-tab-in" novalidate>
        <label for="ls-in-email">Email<input id="ls-in-email" type="email" autocomplete="username" required></label>
        <label for="ls-in-pw">Password<input id="ls-in-pw" type="password" autocomplete="current-password" required></label>
        <p class="ls-msg err" id="ls-in-msg" hidden></p>
        <button class="ls-btn" type="submit">Sign in${next ? ' and continue' : ''}</button>
      </form>
      <form class="ls-form" id="ls-pane-up" role="tabpanel" aria-labelledby="ls-tab-up" hidden novalidate>
        <label for="ls-up-name">Full name<input id="ls-up-name" type="text" autocomplete="name" required></label>
        <label for="ls-up-email">Email<input id="ls-up-email" type="email" autocomplete="email" required></label>
        <label for="ls-up-pw">Password<input id="ls-up-pw" type="password" autocomplete="new-password" minlength="8" required></label>
        <label class="ls-check" for="ls-up-age"><input id="ls-up-age" type="checkbox"><span>I am 21 or older.</span></label>
        <label class="ls-check" for="ls-up-terms"><input id="ls-up-terms" type="checkbox"><span>I agree to the member terms.</span></label>
        <p class="ls-msg err" id="ls-up-msg" hidden></p>
        <button class="ls-btn" type="submit">Create account${next ? ' and continue' : ''}</button>
      </form>
      <p class="ls-small" style="margin:14px 0 0">Preview accounts are stored in this browser only and are not sent to LUMIST. Please do not reuse a password you use elsewhere.</p></div>`;
  }
  function wireMember(onDone) {
    const box = document.getElementById('ls-member-box'); if (!box) return;
    const tin = box.querySelector('#ls-tab-in'), tup = box.querySelector('#ls-tab-up');
    const pin = box.querySelector('#ls-pane-in'), pup = box.querySelector('#ls-pane-up');
    const show = up => { tin.setAttribute('aria-selected', String(!up)); tup.setAttribute('aria-selected', String(up)); tin.tabIndex = up ? -1 : 0; tup.tabIndex = up ? 0 : -1; pin.hidden = up; pup.hidden = !up; };
    tin.onclick = () => show(false); tup.onclick = () => show(true);
    if (location.hash === '#join') show(true);
    const say = (el, t) => { el.textContent = t; el.hidden = !t; };
    const okEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    pin.onsubmit = async e => {
      e.preventDefault(); const msg = pin.querySelector('#ls-in-msg');
      const email = pin.querySelector('#ls-in-email').value.trim().toLowerCase(), pw = pin.querySelector('#ls-in-pw').value;
      if (!okEmail(email)) return say(msg, 'Please enter a valid email address.');
      const members = store.get('lumist-members', {}); const m = members[email];
      if (!m) return say(msg, 'No preview account with that email in this browser. Create one in the other tab.');
      if (m.pw !== await hash(pw)) return say(msg, 'That password does not match.');
      session.set({ name: m.name, email }); say(msg, ''); badge(); onDone();
    };
    pup.onsubmit = async e => {
      e.preventDefault(); const msg = pup.querySelector('#ls-up-msg');
      const name = pup.querySelector('#ls-up-name').value.trim(), email = pup.querySelector('#ls-up-email').value.trim().toLowerCase(), pw = pup.querySelector('#ls-up-pw').value;
      if (!name) return say(msg, 'Please enter your name.');
      if (!okEmail(email)) return say(msg, 'Please enter a valid email address.');
      if (pw.length < 8) return say(msg, 'Your password needs at least 8 characters.');
      if (!pup.querySelector('#ls-up-age').checked) return say(msg, 'Please confirm you are 21 or older.');
      if (!pup.querySelector('#ls-up-terms').checked) return say(msg, 'Please agree to the member terms.');
      const members = store.get('lumist-members', {});
      if (members[email]) return say(msg, 'An account with this email already exists in this browser. Sign in instead.');
      members[email] = { name, pw: await hash(pw), created: new Date().toISOString() }; store.set('lumist-members', members);
      session.set({ name, email }); say(msg, ''); badge(); onDone();
    };
  }
  function renderMemberPage() {
    const root = document.getElementById('lumist-member-page'); if (!root) return;
    const m = session.get(), next = new URLSearchParams(location.search).get('next');
    if (m) {
      const orders = store.get('lumist-orders', []).filter(o => o.email === m.email);
      root.innerHTML = `<div class="ls-page"><div class="ls-box ls-done"><h2>Welcome, ${esc(m.name)}.</h2><p>You are signed in as ${esc(m.email)}.</p>
        ${orders.length ? `<p class="ls-small">Preview orders in this browser: ${orders.map(o => esc(o.ref)).join(', ')}</p>` : ''}
        <a class="ls-btn" href="${link(next === 'checkout' ? 'checkout/' : 'cart/')}">${next === 'checkout' ? 'Continue to checkout' : 'See my shopping bag'}</a>
        <button class="ls-btn ghost" type="button" id="ls-signout">Sign out</button></div></div>`;
      root.querySelector('#ls-signout').onclick = () => { session.clear(); badge(); renderMemberPage(); };
      return;
    }
    root.innerHTML = `<div class="ls-page" style="max-width:520px">${memberForms(next === 'checkout')}</div>`;
    wireMember(() => { if (next === 'checkout') location.href = link('checkout/'); else renderMemberPage(); });
  }

  // ---------- checkout ----------
  const STATES = ['California', 'Alaska', 'Arizona', 'Colorado', 'Connecticut', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Iowa', 'Kansas', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oregon', 'Pennsylvania', 'South Carolina', 'Tennessee', 'Texas', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  function renderCheckout() {
    const root = document.getElementById('lumist-checkout'); if (!root) return;
    const m = session.get(), n = cart.count();
    const steps = s => `<p class="ls-steps"><span>1 · Bag</span> — ${s === 2 ? '<b>2 · Sign in</b>' : '<span>2 · Sign in</span>'} — ${s === 3 ? '<b>3 · Checkout</b>' : '<span>3 · Checkout</span>'}</p>`;
    if (!n) { root.innerHTML = `<div class="ls-page">${steps(3)}<p class="ls-empty">Your bag is empty.</p><a class="ls-btn ghost" style="max-width:320px" href="${link('journal/')}">Discover a wine</a></div>`; return; }
    if (!m) {
      root.innerHTML = `<div class="ls-page">${steps(2)}<div class="ls-grid"><div><h2 style="font:400 30px 'IM Fell English',Georgia,serif;margin:0 0 8px">Sign in to check out</h2><p class="ls-small">Checkout is for LUMIST members. Sign in, or create an account in a minute.</p>${memberForms(true)}</div>
        <aside class="ls-box"><h2>My bag</h2>${itemsHTML(false)}${subtotal()}<a class="ls-btn ghost" href="${link('cart/')}">Edit bag</a></aside></div></div>`;
      wireMember(() => renderCheckout());
      return;
    }
    root.innerHTML = `<div class="ls-page">${steps(3)}${PREVIEW}<div class="ls-grid">
      <form class="ls-form ls-box" id="ls-checkout-form" novalidate><h2>Delivery</h2>
        <p class="ls-small" style="margin:-6px 0 4px">Signed in as ${esc(m.name)} (${esc(m.email)}). <a href="${link('myaccount/')}">Not you?</a></p>
        <div class="row"><label for="ls-co-name">Full name<input id="ls-co-name" autocomplete="name" value="${esc(m.name)}" required></label>
        <label for="ls-co-phone">Phone<input id="ls-co-phone" type="tel" autocomplete="tel" required></label></div>
        <label for="ls-co-addr">Street address<input id="ls-co-addr" autocomplete="street-address" required></label>
        <div class="row"><label for="ls-co-city">City<input id="ls-co-city" autocomplete="address-level2" required></label>
        <label for="ls-co-zip">ZIP code<input id="ls-co-zip" autocomplete="postal-code" inputmode="numeric" required></label></div>
        <label for="ls-co-state">State<select id="ls-co-state" autocomplete="address-level1" required><option value="">Choose a state</option>${STATES.map(s => `<option>${s}</option>`).join('')}</select></label>
        <label class="ls-check" for="ls-co-age"><input id="ls-co-age" type="checkbox"><span>I am 21 or older, and someone 21+ will sign for the delivery.</span></label>
        <h2 style="margin-top:8px">Payment</h2>
        <p class="ls-small" style="margin:0">Payment opens with the first release. Placing this preview order does not charge you.</p>
        <p class="ls-msg err" id="ls-co-msg" hidden></p>
        <button class="ls-btn" type="submit">Place preview order · ${money(cart.total())}</button>
      </form>
      <aside class="ls-box"><h2>Order summary</h2>${itemsHTML(false)}${subtotal()}<a class="ls-btn ghost" href="${link('cart/')}">Edit bag</a></aside></div></div>`;
    const f = root.querySelector('#ls-checkout-form'), msg = f.querySelector('#ls-co-msg');
    f.onsubmit = e => {
      e.preventDefault();
      const v = id => f.querySelector('#' + id).value.trim();
      const miss = [['ls-co-name', 'your name'], ['ls-co-phone', 'a phone number'], ['ls-co-addr', 'a street address'], ['ls-co-city', 'a city'], ['ls-co-zip', 'a ZIP code'], ['ls-co-state', 'a state']].find(([id]) => !v(id));
      if (miss) { msg.textContent = 'Please add ' + miss[1] + '.'; msg.hidden = false; return; }
      if (!/^\d{5}(-\d{4})?$/.test(v('ls-co-zip'))) { msg.textContent = 'Please enter a 5-digit ZIP code.'; msg.hidden = false; return; }
      if (!f.querySelector('#ls-co-age').checked) { msg.textContent = 'Please confirm you are 21 or older.'; msg.hidden = false; return; }
      const ref = 'LM-' + Date.now().toString(36).toUpperCase().slice(-6);
      const orders = store.get('lumist-orders', []);
      orders.push({ ref, email: m.email, items: cart.items(), total: cart.total(), at: new Date().toISOString() });   // address is not kept
      store.set('lumist-orders', orders);
      const total = cart.total(), count = cart.count();
      cart.clear();
      root.innerHTML = `<div class="ls-page"><div class="ls-box ls-done"><h2>Thank you, ${esc(m.name)}.</h2>
        <p>Your preview order <b>${ref}</b> for ${count} bottle${count > 1 ? 's' : ''} (${money(total)}) is saved in this browser.</p>
        <p class="ls-small">This is a preview: nothing was charged and no order was sent. When ordering opens, you will be able to buy these wines for real.</p>
        <a class="ls-btn ghost" href="${link('journal/')}">Back to the Journal</a></div></div>`;
      window.scrollTo(0, 0);
    };
  }

  function render() { renderDrawer(); badge(); renderCartPage(); renderCheckout(); }

  // ---------- events (capture phase, before the live site's AJAX handlers) ----------
  document.addEventListener('submit', e => {
    const form = e.target.closest('.lumist-cart-action'); if (!form) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    const id = Number(form.querySelector('[name="product_id"]').value), qty = Math.max(1, Number(form.querySelector('[name="quantity"]')?.value) || 1);
    if (!PRODUCTS[id]) return;
    cart.add(id, qty);
    const fb = form.parentElement.querySelector('.cart-feedback'); if (fb) fb.textContent = `Added ${qty} × ${PRODUCTS[id].name} to your bag.`;
    openBag();
  }, true);
  document.addEventListener('click', e => {
    const bag = e.target.closest('[data-lumist-bag]');
    if (bag) { e.preventDefault(); e.stopPropagation(); openBag(); return; }
    const inc = e.target.closest('[data-ls-inc]'), dec = e.target.closest('[data-ls-dec]'), rem = e.target.closest('[data-ls-remove]');
    if (inc) { const id = +inc.dataset.lsInc; cart.setQty(id, (cart.items().find(i => i.id === id)?.qty || 0) + 1); }
    if (dec) { const id = +dec.dataset.lsDec; cart.setQty(id, (cart.items().find(i => i.id === id)?.qty || 1) - 1); }
    if (rem) cart.remove(+rem.dataset.lsRemove);
  }, true);
  addEventListener('storage', e => { if (e.key && e.key.startsWith('lumist-')) { render(); renderMemberPage(); } });
  // Keep every page in step with the bag: other tabs, the back/forward cache, returning to a tab.
  addEventListener('pageshow', () => { render(); renderMemberPage(); });
  addEventListener('focus', () => render());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  // If an older copy of the cart page is served without the bag container, add it.
  if (/\/cart\/?$/.test(location.pathname) && !document.getElementById('lumist-cart-page')) {
    const main = document.querySelector('main');
    if (main) main.innerHTML = '<h1>My bag</h1><div class="page-body"><div id="lumist-cart-page"></div></div>';
  }

  function cartFallback() {
    if (/\/cart\/?$/.test(location.pathname) && !document.getElementById('lumist-cart-page')) {
      const main = document.querySelector('main');
      if (main) main.innerHTML = '<h1>My bag</h1><div class="page-body"><div id="lumist-cart-page"></div></div>';
    }
  }
  window.__lumistStore = { refresh() { cartFallback(); render(); renderMemberPage(); } };
  render(); renderMemberPage();
})();
