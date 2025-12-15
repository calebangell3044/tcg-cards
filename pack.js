import { loadCards, buildPools, openPack, addToCollection, resolveImageUrl, rarityClass } from "./shared.js";

const packEl = document.getElementById("pack");
const openBtn = document.getElementById("openPackBtn");
const clearBtn = document.getElementById("clearRevealBtn");
const revealArea = document.getElementById("revealArea");

let pools = null;
let isOpening = false;

(async function init(){
  const cards = await loadCards();
  pools = buildPools(cards);

  // Basic sanity check (keeps things from silently breaking)
  const required = ["common","uncommon","rare","legendary","ultra x rare"];
  for (const r of required){
    if (!pools[r] || pools[r].length === 0){
      console.warn(`No cards found for rarity: ${r}`);
    }
  }

  openBtn.addEventListener("click", () => triggerOpen());
  packEl.addEventListener("click", () => triggerOpen());
  packEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") triggerOpen();
  });

  clearBtn.addEventListener("click", () => {
    revealArea.innerHTML = "";
    clearBtn.disabled = true;
  });
})();

function triggerOpen(){
  if (isOpening || !pools) return;
  isOpening = true;

  openBtn.disabled = true;
  clearBtn.disabled = true;

  packEl.classList.remove("pack--torn");
  packEl.classList.add("pack--opening");

  // shake → tear → deal → flip sequence
  setTimeout(() => {
    packEl.classList.remove("pack--opening");
    packEl.classList.add("pack--torn");

    const pulls = openPack(pools);
    const ids = pulls.map(c => c.id);
    addToCollection(ids);

    revealArea.innerHTML = "";
    dealCards(pulls).then(() => {
      openBtn.disabled = false;
      clearBtn.disabled = false;
      isOpening = false;
    });
  }, 520);
}

async function dealCards(pulls){
  // Build the DOM up front
  const cardEls = pulls.map((card, idx) => createCard(card, idx));
  for (const el of cardEls) revealArea.appendChild(el);

  // Small stagger on entry
  cardEls.forEach((el, i) => {
    el.classList.add("card--deal");
    el.style.animationDelay = `${i * 22}ms`;
  });

  await wait(220);

  // Flip sequentially for drama
  for (let i=0; i<cardEls.length; i++){
    const el = cardEls[i];
    el.classList.add("card--flip");
    // reveal glow after the flip starts
    setTimeout(() => el.classList.add("card--revealed"), 200);
    await wait(90);
  }
}

function createCard(card, idx){
  const el = document.createElement("article");
  el.className = `card ${rarityClass(card.rarity)}`;
  el.style.setProperty("--idx", String(idx));

  const glow = document.createElement("div");
  glow.className = "card__glow";

  const sparkle = document.createElement("div");
  sparkle.className = "card__sparkle";

  const back = document.createElement("div");
  back.className = "card__face card__back";
  const backMark = document.createElement("div");
  backMark.className = "card__backMark";
  backMark.textContent = "TTA";
  back.appendChild(backMark);

  const front = document.createElement("div");
  front.className = "card__face card__front";
  front.innerHTML = `
    <div class="card__imgWrap">
      <img class="card__img" alt="" loading="lazy" />
    </div>
    <div class="card__meta">
      <div class="card__name" title="${escapeHtml(card.name)}">${escapeHtml(card.name)}</div>
      <span class="badge badge--${escapeBadgeClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
    </div>
  `.trim();

  const img = front.querySelector("img");
  img.src = resolveImageUrl(card);
  img.alt = `${card.name} (${card.rarity})`;

  el.appendChild(glow);
  el.appendChild(sparkle);
  el.appendChild(back);
  el.appendChild(front);

  return el;
}

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}
function escapeBadgeClass(r){
  // CSS class escaping for "ultra x rare" in badge--... (spaces must be escaped in CSS)
  return String(r).replace(/\s+/g, "\\ ");
}
