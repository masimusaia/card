/* ============================================================
   ✨ SHOP SETTINGS ✨
   This is the only file you need to edit to change
   products, prices and shipping. Everything else follows automatically.
   ============================================================ */

const SHOP = {
  currency: "₽",

  // Where the buyer sends the order template
  contact: {
    name: "Telegram",
    text: "@your_nick",
    url: "https://t.me/your_nick",
  },


  /* Shipping. The cost is calculated as:
       base + (order weight in grams / 100, rounded up) × per100g
     freeFrom — items total from which shipping is free (null = never free) */
  zones: [
    { id: "ru",    name: "Russia",               days: "5–14 days",  base: 150, per100g: 30,  freeFrom: 3000 },
    { id: "cis",   name: "Belarus, Kazakhstan",  days: "10–25 days", base: 300, per100g: 60,  freeFrom: null },
    { id: "world", name: "Other countries",      days: "14–45 days", base: 500, per100g: 100, freeFrom: null },
  ],
};

/* ============================================================
   PRODUCTS
   id        — unique, no spaces (k1, k2, s1…)
   type      — "Keychains" or "Stickers" (becomes a filter)
   fandom    — fandom (for your own art use "Original")
   character — character
   price     — price in rubles
   weight    — weight in grams (used for shipping)
   img       — image path, e.g. "img/mimi-keychain.jpg" (if empty, a colored placeholder with a letter is shown)
   desc      — short description (can be "")
   soldOut   — true if out of stock
   ============================================================ */
const PRODUCTS = [
  { id: "k1", name: "Mimi with a Bow Keychain",   type: "Keychains", fandom: "Original", character: "Mimi",        price: 350, weight: 20, img: "", desc: "Acrylic, double-sided print, 6 cm." },
  { id: "k2", name: "Lulu and Hearts Keychain",   type: "Keychains", fandom: "Original", character: "Lulu",        price: 350, weight: 20, img: "", desc: "Acrylic with glitter inside, 6 cm." },
  { id: "s1", name: "Mimi Sticker Pack",          type: "Stickers",  fandom: "Original", character: "Mimi",        price: 220, weight: 15, img: "", desc: "6 vinyl stickers." },
  { id: "s2", name: "Lulu Sticker",               type: "Stickers",  fandom: "Original", character: "Lulu",        price: 120, weight: 5,  img: "", desc: "Vinyl, waterproof, 7 cm." },
  { id: "k3", name: "Character 1 Keychain",       type: "Keychains", fandom: "Fandom A", character: "Character 1", price: 400, weight: 25, img: "", desc: "Acrylic, 7 cm." },
  { id: "s3", name: "Character 1 Sticker",        type: "Stickers",  fandom: "Fandom A", character: "Character 1", price: 130, weight: 5,  img: "", desc: "" },
  { id: "s4", name: "Character 2 Sticker",        type: "Stickers",  fandom: "Fandom A", character: "Character 2", price: 130, weight: 5,  img: "", desc: "" },
  { id: "k4", name: "Character 3 Keychain",       type: "Keychains", fandom: "Fandom B", character: "Character 3", price: 400, weight: 25, img: "", desc: "Acrylic, 7 cm.", soldOut: true },
  { id: "s5", name: "Fandom B Sticker Pack",      type: "Stickers",  fandom: "Fandom B", character: "Character 3", price: 250, weight: 15, img: "", desc: "5 vinyl stickers." },
];

/* ============================================================
   HOME BLOCK: your name, short intro and links
   ============================================================ */
const ARTIST = {
  name: "Your Name",
  tagline: "Illustrator and merch maker. Original characters, fan art, acrylic keychains and stickers. Open for custom merch and digital commissions.",
};

/* name — label, text — what is shown on the right, url — where it leads, note — small caption */
const LINKS = [
  { name: "Telegram",    text: "@your_nick",        url: "https://t.me/your_nick",           note: "Fastest way to reach me" },
  { name: "Instagram",   text: "@your_nick",        url: "https://instagram.com/your_nick",  note: "Art and shop updates" },
  { name: "X / Twitter", text: "@your_nick",        url: "https://x.com/your_nick",          note: "Sketches and news" },
  { name: "Boosty",      text: "your_nick",         url: "https://boosty.to/your_nick",      note: "Behind the scenes and early access" },
  { name: "Email",       text: "hello@example.com", url: "mailto:hello@example.com",         note: "Business inquiries" },
];

/* ============================================================
   CUSTOM MERCH (made to order)
   open     — false closes the request form
   status   — text in the status pill
   from     — starting price per piece (null = "ask")
   minQty   — minimum quantity
   ============================================================ */
const CUSTOM = {
  open: true,
  status: "Taking custom orders",
  closedStatus: "Custom orders are closed for now",
  types: [
    { id: "c-key",   name: "Acrylic keychains", from: 450, minQty: 5,  time: "2–4 weeks", desc: "Double-sided print, up to 7 cm." },
    { id: "c-stk",   name: "Vinyl stickers",    from: 150, minQty: 10, time: "1–3 weeks", desc: "Waterproof, die-cut or sheets." },
    { id: "c-pin",   name: "Enamel pins",       from: 700, minQty: 20, time: "4–6 weeks", desc: "Hard enamel, metal backing." },
    { id: "c-other", name: "Something else",    from: null, minQty: 1, time: "ask me",    desc: "Standees, charms, prints. Tell me your idea." },
  ],
};

/* ============================================================
   DIGITAL COMMISSIONS (price list, no request form)
   types  — name, price, time, desc; img is optional (path to an example picture)
   addons — optional extras with a fixed price
   note   — small line under the extras ("" to hide)
   ============================================================ */
const COMMISSIONS = {
  types: [
    { id: "icon", name: "Icon",      price: 1500, time: "3–5 days",  desc: "Head and shoulders, flat color.",           img: "" },
    { id: "half", name: "Half-body", price: 2500, time: "5–7 days",  desc: "Waist up, full color and shading.",         img: "" },
    { id: "full", name: "Full body", price: 3500, time: "7–10 days", desc: "Full figure, full color and shading.",      img: "" },
    { id: "chib", name: "Chibi",     price: 1200, time: "3–5 days",  desc: "Cute small version, simple background.",    img: "" },
  ],
  addons: [
    { name: "Simple background",    price: 500 },
    { name: "Extra character",      price: 1000 },
    { name: "Rush (within 5 days)", price: 1000 },
  ],
  note: "Prices are for personal use. Commercial use is discussed separately.",
};
