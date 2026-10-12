(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const nf = new Intl.NumberFormat("en-US");
  const money = n => nf.format(n) + "\u00a0" + SHOP.currency;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = id => PRODUCTS.find(p => p.id === id);
  const uniq = a => [...new Set(a)];
  const KEY = "merch-cart-v1";

  const FANDOMS = uniq(PRODUCTS.map(p => p.fandom));
  const tint = p => "tint-" + (FANDOMS.indexOf(p.fandom) % 5);
  const letter = p => esc((p.character || p.name).trim().charAt(0).toUpperCase());

  /* ---------- state ---------- */
  const filters = { fandom: "", character: "", type: "" };
  let cart = {};
  const buyer = { zone: SHOP.zones[0].id, name: "", address: "", contact: "" };

  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    cart = d.cart || {};
    Object.assign(buyer, d.buyer || {});
  } catch (e) { /* storage unavailable, work without it */ }

  for (const id in cart) {
    const p = byId(id);
    if (!p || p.soldOut || !(cart[id] > 0)) delete cart[id];
  }
  if (!SHOP.zones.some(z => z.id === buyer.zone)) buyer.zone = SHOP.zones[0].id;

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, buyer })); } catch (e) { /* ignore */ }
  };

  /* ---------- shared pieces ---------- */
  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- filters ---------- */
  function chipRow(sel, values, key) {
    $(sel).innerHTML = ["", ...values].map(v =>
      `<button type="button" class="chip" data-key="${key}" data-val="${esc(v)}" aria-pressed="${filters[key] === v}">${v ? esc(v) : "all"}</button>`
    ).join("");
  }

  function renderFilters() {
    const chars = uniq(PRODUCTS.filter(p => !filters.fandom || p.fandom === filters.fandom).map(p => p.character));
    if (filters.character && !chars.includes(filters.character)) filters.character = "";
    chipRow("#f-type", uniq(PRODUCTS.map(p => p.type)), "type");
    chipRow("#f-fandom", FANDOMS, "fandom");
    chipRow("#f-character", chars, "character");
  }

  /* ---------- shop ---------- */
  const addLabel = q => q ? `In cart: ${q}` : "Add to cart";

  function card(p) {
    const q = cart[p.id] || 0;
    const art = p.img
      ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
      : `<span class="mono" aria-hidden="true">${letter(p)}</span>`;
    return `<article class="item${p.soldOut ? " sold" : ""}">
      <div class="shot ${tint(p)}">
        ${art}
        <div class="pills"><span class="pill">${esc(p.type)}</span>${p.soldOut ? '<span class="pill dark">sold out</span>' : ""}</div>
        <span class="sticker">${money(p.price)}</span>
      </div>
      <h3>${esc(p.name)}</h3>
      <p class="meta">${esc(p.fandom)}, ${esc(p.character)}</p>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
      <button type="button" class="btn${q ? "" : " ghost"}" data-add="${esc(p.id)}"${p.soldOut ? " disabled" : ""}>${p.soldOut ? "Sold out" : addLabel(q)}</button>
    </article>`;
  }

  function renderShop() {
    const list = PRODUCTS.filter(p =>
      (!filters.fandom || p.fandom === filters.fandom) &&
      (!filters.character || p.character === filters.character) &&
      (!filters.type || p.type === filters.type));
    const active = Object.values(filters).filter(Boolean).length;
    $("#count").textContent = list.length ? `Found: ${list.length}` : "";
    $("#reset").hidden = !active;
    $("#f-badge").hidden = !active;
    $("#f-badge").textContent = active;
    $("#grid").innerHTML = list.length
      ? list.map(card).join("")
      : `<p class="empty">Nothing found. Try a different combination of filters.</p>`;
  }

  function refreshAddButtons() {
    document.querySelectorAll("[data-add]").forEach(b => {
      if (b.disabled) return;
      const q = cart[b.dataset.add] || 0;
      b.textContent = addLabel(q);
      b.classList.toggle("ghost", !q);
    });
  }

  /* ---------- cart: calculations ---------- */
  function totals() {
    const rows = Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter(r => r.p);
    const sub = rows.reduce((s, r) => s + r.p.price * r.q, 0);
    const grams = rows.reduce((s, r) => s + (r.p.weight || 0) * r.q, 0);
    const count = rows.reduce((s, r) => s + r.q, 0);
    const z = SHOP.zones.find(z => z.id === buyer.zone) || SHOP.zones[0];
    let ship = 0, free = false;
    if (rows.length) {
      ship = z.base + Math.ceil(grams / 100) * z.per100g;
      if (z.freeFrom && sub >= z.freeFrom) { ship = 0; free = true; }
    }
    return { rows, sub, grams, count, z, ship, free, total: sub + ship };
  }

  function template(t) {
    const lines = t.rows.map((r, i) =>
      `${i + 1}. ${r.p.name} (${r.p.fandom}, ${r.p.character}): ${r.q} × ${money(r.p.price)} = ${money(r.p.price * r.q)}`);
    return [
      "Hi! I'd like to place an order.",
      "",
      "Order:",
      ...lines,
      "",
      `Items: ${money(t.sub)}`,
      `Shipping (${t.z.name}): ${t.free ? "free" : money(t.ship)}`,
      `Total: ${money(t.total)}`,
      "",
      "Recipient details:",
      `Full name: ${buyer.name.trim() || "—"}`,
      `Address and postal code: ${buyer.address.trim() || "—"}`,
      `Contact: ${buyer.contact.trim() || "—"}`,
      "",
      "I have read the terms.",
    ].join("\n").replace(/\u00a0/g, " ");
  }

  function renderTemplate(t = totals()) {
    $("#tpl").value = t.rows.length ? template(t) : "";
  }

  /* ---------- cart: rendering ---------- */
  function renderCart() {
    const t = totals();
    $("#cart-count").textContent = t.count;
    $("#cart-empty").hidden = t.rows.length > 0;
    $("#cart-body").hidden = t.rows.length === 0;

    $("#cart-items").innerHTML = t.rows.map(({ p, q }) => `
      <li class="line">
        <div class="th ${tint(p)}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : letter(p)}</div>
        <div class="info">
          <strong>${esc(p.name)}</strong>
          <span class="sub">${esc(p.fandom)}, ${esc(p.character)}</span>
          <span class="step">
            <button type="button" data-dec="${esc(p.id)}" aria-label="Decrease">−</button>
            <output>${q}</output>
            <button type="button" data-inc="${esc(p.id)}" aria-label="Increase">+</button>
          </span>
        </div>
        <div class="end">
          <span class="lp">${money(p.price * q)}</span>
          <button type="button" class="x" data-del="${esc(p.id)}" aria-label="Remove: ${esc(p.name)}">✕</button>
        </div>
      </li>`).join("");

    $("#sum-items").textContent = money(t.sub);
    $("#sum-ship-label").textContent = `Shipping (${t.z.days})`;
    $("#sum-ship").textContent = t.free ? "free" : money(t.ship);
    $("#sum-total").textContent = money(t.total);

    const left = t.z.freeFrom ? t.z.freeFrom - t.sub : 0;
    $("#ship-hint").textContent = t.rows.length && t.z.freeFrom && !t.free
      ? `${money(left)} more for free shipping to this destination.`
      : "I'll confirm the final shipping cost in my reply.";

    renderTemplate(t);
    refreshAddButtons();
  }

  function setQty(id, q) {
    const p = byId(id);
    if (!p || p.soldOut) return;
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 99);
    save();
    renderCart();
  }

  /* ---------- open and close the cart ---------- */
  const cartEl = $("#cart");
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    cartEl.inert = false;
    cartEl.classList.add("open");
    $("#overlay").classList.add("show");
    document.body.classList.add("lock");
    $("#cart-close").focus();
  }
  function closeCart() {
    cartEl.classList.remove("open");
    $("#overlay").classList.remove("show");
    document.body.classList.remove("lock");
    cartEl.inert = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- copying ---------- */
  async function copyText(ta, btn, label) {
    let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) {
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    }
    toast(ok ? "Copied. Send it to the author" : "Couldn't copy, select the text manually");
    if (ok) {
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = label; }, 2000);
    }
  }

  /* ---------- events ---------- */
  $("#filters").addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    filters[c.dataset.key] = c.dataset.val;
    renderFilters();
    renderShop();
  });

  $("#reset").addEventListener("click", () => {
    filters.fandom = filters.character = filters.type = "";
    renderFilters();
    renderShop();
  });

  $("#f-toggle").addEventListener("click", e => {
    const open = $("#filters").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });

  $("#grid").addEventListener("click", e => {
    const b = e.target.closest("[data-add]");
    if (!b || b.disabled) return;
    const id = b.dataset.add;
    setQty(id, (cart[id] || 0) + 1);
    toast("Added to cart");
  });

  $("#cart-items").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.inc) setQty(b.dataset.inc, (cart[b.dataset.inc] || 0) + 1);
    else if (b.dataset.dec) setQty(b.dataset.dec, (cart[b.dataset.dec] || 0) - 1);
    else if (b.dataset.del) setQty(b.dataset.del, 0);
  });

  $("#cart-open").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  $("#cart-shop").addEventListener("click", () => { closeCart(); location.hash = "#shop"; });
  $("#overlay").addEventListener("click", closeCart);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && cartEl.classList.contains("open")) closeCart(); });
  $("#copy").addEventListener("click", () => copyText($("#tpl"), $("#copy"), "Copy template"));

  $("#zone").addEventListener("change", e => { buyer.zone = e.target.value; save(); renderCart(); });
  [["#b-name", "name"], ["#b-address", "address"], ["#b-contact", "contact"]].forEach(([sel, key]) => {
    const el = $(sel);
    el.value = buyer[key] || "";
    el.addEventListener("input", () => { buyer[key] = el.value; save(); renderTemplate(); });
  });

  /* ---------- start ---------- */
  $("#zone").innerHTML = SHOP.zones.map(z => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join("");
  $("#zone").value = buyer.zone;

  $("#tos-zones").innerHTML = SHOP.zones.map(z =>
    `<tr><th scope="row">${esc(z.name)}</th><td>${esc(z.days)}</td><td>${money(z.base)}</td><td>${money(z.per100g)}</td><td>${z.freeFrom ? "from " + money(z.freeFrom) : "none"}</td></tr>`
  ).join("");

  document.querySelectorAll("[data-contact]").forEach(a => {
    a.href = SHOP.contact.url;
    a.textContent = SHOP.contact.name + " " + SHOP.contact.text;
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ---------- home: links ---------- */
  $("#artist-name").textContent = ARTIST.name;
  $("#artist-tagline").textContent = ARTIST.tagline;
  $("#links-list").innerHTML = LINKS.map(l =>
    `<a class="link-card" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ""}>
      <span><strong>${esc(l.name)}</strong><span class="note">${esc(l.note || "")}</span></span>
      <span class="go">${esc(l.text)} ↗</span>
    </a>`).join("");

  /* ---------- custom merch and commissions ---------- */
  const val = id => $("#" + id).value.trim() || "—";

  function setStatus(sel, cfg) {
    const el = $(sel);
    el.textContent = (cfg.open ? "● " : "○ ") + (cfg.open ? cfg.status : cfg.closedStatus);
    el.classList.toggle("closed", !cfg.open);
  }

  function requestForm(prefix, cfg, build) {
    const ta = $("#" + prefix + "-tpl"), btn = $("#" + prefix + "-copy");
    const render = () => { ta.value = build(); };
    $("#" + prefix + "-form").addEventListener("input", render);
    $("#" + prefix + "-form").addEventListener("change", render);
    btn.disabled = !cfg.open;
    btn.addEventListener("click", () => copyText(ta, btn, "Copy request"));
    render();
  }

  // custom merch
  setStatus("#custom-status", CUSTOM);
  $("#custom-types").innerHTML = CUSTOM.types.map((t, i) => `
    <article class="offer tint-${i % 5}">
      <h3>${esc(t.name)}</h3>
      <p class="price">${t.from == null ? "ask me" : "from " + money(t.from)}</p>
      <p>${esc(t.desc)}</p>
      <p class="meta">Minimum: ${t.minQty} pcs<br>Time: ${esc(t.time)}</p>
    </article>`).join("");
  $("#c-type").innerHTML = CUSTOM.types.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");

  requestForm("c", CUSTOM, () => {
    const t = CUSTOM.types.find(x => x.id === $("#c-type").value) || CUSTOM.types[0];
    $("#c-qty").min = t.minQty;
    $("#c-hint").textContent = `Minimum for this item: ${t.minQty} pcs.`;
    return [
      "Hi! I'd like to request custom merch.",
      "",
      `Type: ${t.name}`,
      `Quantity: ${val("c-qty")}`,
      `Idea: ${val("c-desc")}`,
      `References: ${val("c-refs")}`,
      `Contact: ${val("c-contact")}`,
      "",
      "I have read the terms.",
    ].join("\n");
  });

  // digital commissions
  setStatus("#comm-status", COMMISSIONS);
  $("#comm-types").innerHTML = COMMISSIONS.types.map((t, i) => `
    <article class="offer tint-${(i + 2) % 5}">
      <h3>${esc(t.name)}</h3>
      <p class="price">${money(t.price)}</p>
      <p>${esc(t.desc)}</p>
      <p class="meta">Time: ${esc(t.time)}</p>
    </article>`).join("");
  $("#m-type").innerHTML = COMMISSIONS.types.map(t => `<option value="${esc(t.id)}">${esc(t.name)}, ${money(t.price)}</option>`).join("");
  $("#m-addons").innerHTML = COMMISSIONS.addons.map((a, i) =>
    `<label><input type="checkbox" id="m-add-${i}"> ${esc(a.name)} (+${money(a.price)})</label>`).join("");

  requestForm("m", COMMISSIONS, () => {
    const t = COMMISSIONS.types.find(x => x.id === $("#m-type").value) || COMMISSIONS.types[0];
    const add = COMMISSIONS.addons.filter((a, i) => $("#m-add-" + i).checked);
    const total = t.price + add.reduce((s, a) => s + a.price, 0);
    $("#m-total").textContent = `Estimated total: ${money(total)}. I'll confirm the final price in my reply.`;
    return [
      "Hi! I'd like to commission an artwork.",
      "",
      `Type: ${t.name} (${money(t.price)})`,
      `Extras: ${add.length ? add.map(a => a.name).join(", ") : "none"}`,
      `Use: ${$("#m-use").value}`,
      `Description: ${val("m-desc")}`,
      `References: ${val("m-refs")}`,
      `Contact: ${val("m-contact")}`,
      "",
      `Estimated total: ${money(total)}`,
      "I have read the terms.",
    ].join("\n").replace(/\u00a0/g, " ");
  });

  renderFilters();
  renderShop();
  renderCart();
})();
