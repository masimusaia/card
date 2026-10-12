(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const nf = new Intl.NumberFormat("ru-RU");
  const money = n => nf.format(n) + "\u00a0" + SHOP.currency;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = id => PRODUCTS.find(p => p.id === id);
  const uniq = a => [...new Set(a)];
  const KEY = "merch-cart-v1";

  const FANDOMS = uniq(PRODUCTS.map(p => p.fandom));
  const tint = p => "tint-" + (FANDOMS.indexOf(p.fandom) % 5);
  const letter = p => esc((p.character || p.name).trim().charAt(0).toUpperCase());

  /* ---------- состояние ---------- */
  const filters = { fandom: "", character: "", type: "" };
  let cart = {};
  const buyer = { zone: SHOP.zones[0].id, name: "", address: "", contact: "" };

  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    cart = d.cart || {};
    Object.assign(buyer, d.buyer || {});
  } catch (e) { /* хранилище недоступно, работаем без него */ }

  for (const id in cart) {
    const p = byId(id);
    if (!p || p.soldOut || !(cart[id] > 0)) delete cart[id];
  }
  if (!SHOP.zones.some(z => z.id === buyer.zone)) buyer.zone = SHOP.zones[0].id;

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, buyer })); } catch (e) { /* ignore */ }
  };

  /* ---------- общие кусочки ---------- */
  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- фильтры ---------- */
  function chipRow(sel, values, key) {
    $(sel).innerHTML = ["", ...values].map(v =>
      `<button type="button" class="chip" data-key="${key}" data-val="${esc(v)}" aria-pressed="${filters[key] === v}">${v ? esc(v) : "все"}</button>`
    ).join("");
  }

  function renderFilters() {
    const chars = uniq(PRODUCTS.filter(p => !filters.fandom || p.fandom === filters.fandom).map(p => p.character));
    if (filters.character && !chars.includes(filters.character)) filters.character = "";
    chipRow("#f-type", uniq(PRODUCTS.map(p => p.type)), "type");
    chipRow("#f-fandom", FANDOMS, "fandom");
    chipRow("#f-character", chars, "character");
  }

  /* ---------- магазин ---------- */
  const addLabel = q => q ? `В корзине: ${q}` : "В корзину";

  function card(p) {
    const q = cart[p.id] || 0;
    const art = p.img
      ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
      : `<span class="mono" aria-hidden="true">${letter(p)}</span>`;
    return `<article class="item${p.soldOut ? " sold" : ""}">
      <div class="shot ${tint(p)}">
        ${art}
        <div class="pills"><span class="pill">${esc(p.type)}</span>${p.soldOut ? '<span class="pill dark">нет в наличии</span>' : ""}</div>
        <span class="sticker">${money(p.price)}</span>
      </div>
      <h3>${esc(p.name)}</h3>
      <p class="meta">${esc(p.fandom)}, ${esc(p.character)}</p>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
      <button type="button" class="btn${q ? "" : " ghost"}" data-add="${esc(p.id)}"${p.soldOut ? " disabled" : ""}>${p.soldOut ? "Нет в наличии" : addLabel(q)}</button>
    </article>`;
  }

  function renderShop() {
    const list = PRODUCTS.filter(p =>
      (!filters.fandom || p.fandom === filters.fandom) &&
      (!filters.character || p.character === filters.character) &&
      (!filters.type || p.type === filters.type));
    const active = Object.values(filters).filter(Boolean).length;
    $("#count").textContent = list.length ? `Найдено: ${list.length}` : "";
    $("#reset").hidden = !active;
    $("#f-badge").hidden = !active;
    $("#f-badge").textContent = active;
    $("#grid").innerHTML = list.length
      ? list.map(card).join("")
      : `<p class="empty">Ничего не нашлось. Попробуй другое сочетание фильтров.</p>`;
  }

  function refreshAddButtons() {
    document.querySelectorAll("[data-add]").forEach(b => {
      if (b.disabled) return;
      const q = cart[b.dataset.add] || 0;
      b.textContent = addLabel(q);
      b.classList.toggle("ghost", !q);
    });
  }

  /* ---------- корзина: подсчёты ---------- */
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
      "Привет! Хочу сделать заказ.",
      "",
      "Заказ:",
      ...lines,
      "",
      `Товары: ${money(t.sub)}`,
      `Доставка (${t.z.name}): ${t.free ? "бесплатно" : money(t.ship)}`,
      `Итого: ${money(t.total)}`,
      "",
      "Данные получателя:",
      `ФИО: ${buyer.name.trim() || "—"}`,
      `Адрес и индекс: ${buyer.address.trim() || "—"}`,
      `Связь: ${buyer.contact.trim() || "—"}`,
      "",
      "С условиями (ТоС) ознакомился(лась).",
    ].join("\n").replace(/\u00a0/g, " ");
  }

  function renderTemplate(t = totals()) {
    $("#tpl").value = t.rows.length ? template(t) : "";
  }

  /* ---------- корзина: отрисовка ---------- */
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
            <button type="button" data-dec="${esc(p.id)}" aria-label="Меньше">−</button>
            <output>${q}</output>
            <button type="button" data-inc="${esc(p.id)}" aria-label="Больше">+</button>
          </span>
        </div>
        <div class="end">
          <span class="lp">${money(p.price * q)}</span>
          <button type="button" class="x" data-del="${esc(p.id)}" aria-label="Убрать: ${esc(p.name)}">✕</button>
        </div>
      </li>`).join("");

    $("#sum-items").textContent = money(t.sub);
    $("#sum-ship-label").textContent = `Доставка (${t.z.days})`;
    $("#sum-ship").textContent = t.free ? "бесплатно" : money(t.ship);
    $("#sum-total").textContent = money(t.total);

    const left = t.z.freeFrom ? t.z.freeFrom - t.sub : 0;
    $("#ship-hint").textContent = t.rows.length && t.z.freeFrom && !t.free
      ? `До бесплатной доставки по этому направлению не хватает ${money(left)}.`
      : "Итоговую сумму доставки я подтвержу в ответном сообщении.";

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

  /* ---------- открыть и закрыть корзину ---------- */
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

  /* ---------- копирование ---------- */
  async function copyTemplate() {
    const ta = $("#tpl");
    let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) {
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    }
    toast(ok ? "Шаблон скопирован. Отправь его автору" : "Не вышло скопировать, выдели текст вручную");
    if (ok) {
      const b = $("#copy");
      b.textContent = "Скопировано";
      setTimeout(() => { b.textContent = "Скопировать шаблон"; }, 2000);
    }
  }

  /* ---------- события ---------- */
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
    toast("Добавлено в корзину");
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
  $("#copy").addEventListener("click", copyTemplate);

  $("#zone").addEventListener("change", e => { buyer.zone = e.target.value; save(); renderCart(); });
  [["#b-name", "name"], ["#b-address", "address"], ["#b-contact", "contact"]].forEach(([sel, key]) => {
    const el = $(sel);
    el.value = buyer[key] || "";
    el.addEventListener("input", () => { buyer[key] = el.value; save(); renderTemplate(); });
  });

  /* ---------- старт ---------- */
  $("#zone").innerHTML = SHOP.zones.map(z => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join("");
  $("#zone").value = buyer.zone;

  $("#tos-zones").innerHTML = SHOP.zones.map(z =>
    `<tr><th scope="row">${esc(z.name)}</th><td>${esc(z.days)}</td><td>${money(z.base)}</td><td>${money(z.per100g)}</td><td>${z.freeFrom ? "от " + money(z.freeFrom) : "нет"}</td></tr>`
  ).join("");

  document.querySelectorAll("[data-contact]").forEach(a => {
    a.href = SHOP.contact.url;
    a.textContent = SHOP.contact.name + " " + SHOP.contact.text;
    a.target = "_blank";
    a.rel = "noopener";
  });

  renderFilters();
  renderShop();
  renderCart();
})();
