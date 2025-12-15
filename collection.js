import { loadCards, readCollection, writeCollection, clearCollection, resolveImageUrl, rarityClass } from "./shared.js";

const summaryEl = document.getElementById("summary");
const gridEl = document.getElementById("grid");
const tabs = Array.from(document.querySelectorAll(".tab"));
const ownedOnlyToggle = document.getElementById("ownedOnlyToggle");
const resetBtn = document.getElementById("resetBtn");
const resetDialog = document.getElementById("resetDialog");
const confirmResetBtn = document.getElementById("confirmResetBtn");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

let allCards = [];
let activeRarity = "common";

(async function init(){
  allCards = await loadCards();

  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("tab--active"));
    t.classList.add("tab--active");
    activeRarity = t.dataset.rarity;
    render();
  }));

  ownedOnlyToggle.addEventListener("change", render);
  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  resetBtn.addEventListener("click", () => resetDialog.showModal());
  confirmResetBtn.addEventListener("click", () => {
    clearCollection();
    render();
  });

  render();
})();

function render(){
  const col = readCollection();

  renderSummary(col);

  const ownedOnly = ownedOnlyToggle.checked;
  const q = (searchInput.value || "").trim().toLowerCase();

  let cards = allCards.filter(c => c.rarity === activeRarity);

  if (q){
    cards = cards.filter(c => c.name.toLowerCase().includes(q));
  }

  const getCount = (c) => col[c.id] ?? 0;

  if (ownedOnly){
    cards = cards.filter(c => getCount(c) > 0);
  }

  cards = sortCards(cards, getCount);

  gridEl.innerHTML = "";
  for (const c of cards){
    const count = getCount(c);
    gridEl.appendChild(createCardTile(c, count));
  }
}

function renderSummary(col){
  const rarities = ["common","uncommon","rare","legendary","ultra x rare"];

  const counts = {};
  const uniques = {};
  for (const r of rarities){ counts[r] = 0; uniques[r] = 0; }

  for (const c of allCards){
    const n = col[c.id] ?? 0;
    if (!counts.hasOwnProperty(c.rarity)) continue;
    counts[c.rarity] += n;
    if (n > 0) uniques[c.rarity] += 1;
  }

  summaryEl.innerHTML = rarities.map(r => {
    const glowVar = rarityVar(r);
    return `
      <div class="summaryCard" style="box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 12px 34px rgba(0,0,0,.42), 0 0 26px ${glowVar};">
        <div class="summaryCard__top">
          <div class="summaryCard__label">${escapeHtml(r)}</div>
          <div class="summaryCard__count">${counts[r]}</div>
        </div>
        <div class="summaryCard__sub">${uniques[r]} unique</div>
      </div>
    `.trim();
  }).join("");
}

function sortCards(cards, getCount){
  const mode = sortSelect.value;
  const a = cards.slice();

  if (mode === "count-desc"){
    a.sort((x,y) => (getCount(y) - getCount(x)) || x.name.localeCompare(y.name));
    return a;
  }
  if (mode === "count-asc"){
    a.sort((x,y) => (getCount(x) - getCount(y)) || x.name.localeCompare(y.name));
    return a;
  }
  if (mode === "name-desc"){
    a.sort((x,y) => y.name.localeCompare(x.name));
    return a;
  }
  a.sort((x,y) => x.name.localeCompare(y.name));
  return a;
}

function createCardTile(card, count){
  const el = document.createElement("article");
  el.className = `card ${rarityClass(card.rarity)} ${count ? "" : "card--unowned"}`;

  const glow = document.createElement("div");
  glow.className = "card__glow";

  const sparkle = document.createElement("div");
  sparkle.className = "card__sparkle";

  const countPill = document.createElement("div");
  countPill.className = "countPill";
  countPill.textContent = `×${count}`;

  const imgWrap = document.createElement("div");
  imgWrap.className = "card__imgWrap";
  const img = document.createElement("img");
  img.className = "card__img";
  img.loading = "lazy";
  img.src = resolveImageUrl(card);
  img.alt = `${card.name} (${card.rarity})`;
  imgWrap.appendChild(img);

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.innerHTML = `
    <div class="card__name" title="${escapeHtml(card.name)}">${escapeHtml(card.name)}</div>
    <span class="badge badge--${escapeBadgeClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
  `.trim();

  el.appendChild(glow);
  el.appendChild(sparkle);
  el.appendChild(countPill);
  el.appendChild(imgWrap);
  el.appendChild(meta);

  // turn glow on for owned cards
  if (count) el.classList.add("card--revealed");

  return el;
}

function rarityVar(r){
  if (r === "uncommon") return "var(--uncommon)";
  if (r === "rare") return "var(--rare)";
  if (r === "legendary") return "var(--legendary)";
  if (r === "ultra x rare") return "var(--ultrax)";
  return "var(--common)";
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}
function escapeBadgeClass(r){
  return String(r).replace(/\s+/g, "\\ ");
}
