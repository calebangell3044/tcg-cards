// shared.js — helpers for both pages (ES module)

const STORAGE_KEY = "tta_collection_v1";

/** Load card data from card-data.json (cached for the session). */
let _cardsPromise = null;
export async function loadCards(){
  if (_cardsPromise) return _cardsPromise;
  _cardsPromise = (async () => {
    const res = await fetch("./card-data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load card-data.json: ${res.status}`);
    const json = await res.json();
    const cards = Array.isArray(json) ? json : (json.cards ?? []);
    return cards.map(normalizeCard);
  })();
  return _cardsPromise;
}

function normalizeCard(c){
  // Expected fields in your repo: {id,name,rarity,image_file,image}
  const rarity = (c.rarity ?? "").toLowerCase();
  const image_file = c.image_file ?? c.imageFile ?? "";
  const image = c.image ?? "";
  return {
    id: String(c.id ?? cryptoRandomId()),
    name: String(c.name ?? "Unknown"),
    rarity,
    image_file,
    image,
  };
}

function cryptoRandomId(){
  // just in case a card is missing an id
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

/** Get the best path for an image in THIS repo. */
export function resolveImageUrl(card){
  // Your JSON currently stores paths like "tcg-cards/common/Name.png".
  // When these files live in the same repo as this site, strip the "tcg-cards/" prefix.
  let p = card.image?.trim() || `${card.rarity}/${card.image_file}`;
  p = p.replace(/^tcg-cards\//, "");
  // Encode spaces / unicode / punctuation while preserving slashes.
  return encodeURI(p);
}

/** Collection storage */
export function readCollection(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  }catch{
    return {};
  }
}
export function writeCollection(map){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
export function addToCollection(cardIds){
  const map = readCollection();
  for (const id of cardIds){
    map[id] = (map[id] ?? 0) + 1;
  }
  writeCollection(map);
}
export function clearCollection(){
  localStorage.removeItem(STORAGE_KEY);
}

/** Pack generation */
export function buildPools(cards){
  const by = {
    common: [],
    uncommon: [],
    rare: [],
    legendary: [],
    "ultra x rare": [],
  };
  for (const c of cards){
    if (by[c.rarity]) by[c.rarity].push(c);
  }
  return by;
}

function randInt(maxExclusive){
  return Math.floor(Math.random() * maxExclusive);
}

function pickOne(arr){
  return arr[randInt(arr.length)];
}

export function rollRareSlot(){
  // 89% rare, 10% legendary, 1% ultra x rare
  const r = Math.random();
  if (r < 0.01) return "ultra x rare";
  if (r < 0.11) return "legendary";
  return "rare";
}

export function openPack(pools){
  const pulls = [];
  for (let i=0; i<8; i++) pulls.push(pickOne(pools.common));
  for (let i=0; i<5; i++) pulls.push(pickOne(pools.uncommon));
  for (let i=0; i<2; i++){
    const rarity = rollRareSlot();
    pulls.push(pickOne(pools[rarity]));
  }
  // Shuffle so rares aren't always last (feels more like a real pack reveal)
  return shuffle(pulls);
}

function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** UI helpers */
export const rarityLabel = (r) => (r ?? "").toString();
export const rarityClass = (r) => `rarity-${r}`;
