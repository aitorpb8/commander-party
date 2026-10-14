import fs from 'fs/promises';
import path from 'path';

export interface PreconCard {
  name: string;
  quantity: number;
  is_commander: boolean;
  type_line?: string;
  mana_cost?: string;
  image_url?: string;
  oracle_text?: string;
}

const BROWSER_HEADERS = { 
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
  'Origin': 'https://www.moxfield.com',
  'Referer': 'https://www.moxfield.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site'
};

const EXCLUDED_CATEGORIES = new Set([
  'Planar Deck',
  'Sideboard',
  'Maybeboard',
  'Tokens',
  'Token',
  'Planechase',
  'Archenemy',
  'Scheme'
]);

export async function fetchArchidektCards(archidektId: string, expectedCommander?: string): Promise<PreconCard[]> {
  const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`);
  if (!response.ok) {
    throw new Error(`Archidekt error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  if (!data.cards || !Array.isArray(data.cards)) return [];

  // Determine allowed categories (respecting includedInDeck and excluding side/planar/maybeboards)
  let validCategoryNames: Set<string> | null = null;
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    validCategoryNames = new Set(
      data.categories
        .filter((cat: any) => cat.includedInDeck !== false && !EXCLUDED_CATEGORIES.has(cat.name))
        .map((cat: any) => cat.name)
    );
  }
  
  const cards: PreconCard[] = [];

  for (const item of data.cards) {
    const oc = item.card?.oracleCard;
    if (!oc) continue;

    // Filter out categories not part of the main deck
    if (validCategoryNames && Array.isArray(item.categories)) {
      const isIncluded = item.categories.some((cat: string) => validCategoryNames!.has(cat));
      if (!isIncluded) continue;
    }
    
    const typeLine = oc.typeLine || [
      ...(oc.superTypes || []),
      ...(oc.types || []),
      ...(oc.subTypes ? ["—", ...oc.subTypes] : [])
    ].join(' ');

    const isCommanderCategory = item.categories?.includes('Commander') || false;
    const isExpectedCommander = expectedCommander && oc.name.toLowerCase() === expectedCommander.toLowerCase();

    cards.push({
      name: oc.name,
      quantity: item.quantity || 1,
      is_commander: Boolean(isCommanderCategory || isExpectedCommander),
      type_line: typeLine,
      mana_cost: oc.manaCost || '',
      image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card?.uid}?format=image`,
      oracle_text: oc.oracleText || ''
    });
  }

  // Ensure at least the expected commander has is_commander = true if none was marked
  if (expectedCommander && !cards.some(c => c.is_commander)) {
    const target = cards.find(c => c.name.toLowerCase().includes(expectedCommander.toLowerCase()));
    if (target) target.is_commander = true;
  }

  return cards;
}

export async function fetchMoxfieldCards(moxfieldId: string, expectedCommander?: string): Promise<PreconCard[]> {
  const response = await fetch(`https://api.moxfield.com/v2/decks/all/${moxfieldId}`, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Moxfield error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  const cards: PreconCard[] = [];

  // Commanders
  if (data.commanders) {
    Object.values(data.commanders).forEach((item: any) => {
      cards.push({
        name: item.card.name,
        quantity: item.quantity || 1,
        is_commander: true,
        type_line: item.card.type_line,
        mana_cost: item.card.mana_cost,
        image_url: item.card.images?.normal,
        oracle_text: item.card.oracle_text
      });
    });
  }

  // Mainboard
  if (data.mainboard) {
    Object.values(data.mainboard).forEach((item: any) => {
      cards.push({
        name: item.card.name,
        quantity: item.quantity || 1,
        is_commander: false,
        type_line: item.card.type_line,
        mana_cost: item.card.mana_cost,
        image_url: item.card.images?.normal,
        oracle_text: item.card.oracle_text
      });
    });
  }

  if (expectedCommander && !cards.some(c => c.is_commander)) {
    const target = cards.find(c => c.name.toLowerCase().includes(expectedCommander.toLowerCase()));
    if (target) target.is_commander = true;
  }

  return cards;
}

export async function fetchPreconCardsFromUrl(url: string, expectedCommander?: string): Promise<PreconCard[]> {
  if (url.includes('archidekt.com')) {
    const match = url.match(/decks\/(\d+)/);
    if (match) return fetchArchidektCards(match[1], expectedCommander);
  } else if (url.includes('moxfield.com')) {
    const match = url.match(/decks\/([^/\?]+)/);
    if (match) return fetchMoxfieldCards(match[1], expectedCommander);
  }
  throw new Error(`URL no soportada. Debe ser de Archidekt o Moxfield: ${url}`);
}

export async function calculatePreconPrice(cards: PreconCard[]): Promise<{ eur: number; usd: number }> {
  // Batch requests to Scryfall collection (max 75 per batch)
  // Exclude basic lands to avoid unnecessary queries
  const nonBasics = cards.filter(c => !['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'].includes(c.name));
  let totalEur = 0;
  let totalUsd = 0;

  for (let i = 0; i < nonBasics.length; i += 75) {
    const chunk = nonBasics.slice(i, i + 75);
    const identifiers = chunk.map(c => ({ name: c.name }));

    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CommanderParty/1.0 (contact: aitorpb8@example.com)',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ identifiers })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const priceMap = new Map<string, { eur: number; usd: number }>();
          data.data.forEach((card: any) => {
            const eur = parseFloat(card.prices?.eur || card.prices?.eur_foil || '0');
            const usd = parseFloat(card.prices?.usd || card.prices?.usd_foil || '0');
            priceMap.set(card.name.toLowerCase(), { eur, usd });
          });

          chunk.forEach(c => {
            const price = priceMap.get(c.name.toLowerCase());
            if (price) {
              totalEur += (price.eur || 0) * (c.quantity || 1);
              totalUsd += (price.usd || 0) * (c.quantity || 1);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Scryfall price calculation chunk failed:', e);
    }

    if (i + 75 < nonBasics.length) {
      await new Promise(r => setTimeout(r, 100)); // Respect Scryfall rate limit
    }
  }

  return {
    eur: Math.round(totalEur * 100) / 100,
    usd: Math.round(totalUsd * 100) / 100
  };
}

export async function savePreconDecklist(preconName: string, cards: PreconCard[]): Promise<void> {
  const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');
  let decklists: Record<string, PreconCard[]> = {};
  try {
    const content = await fs.readFile(cachePath, 'utf8');
    decklists = JSON.parse(content);
  } catch {
    decklists = {};
  }
  decklists[preconName] = cards;
  await fs.writeFile(cachePath, JSON.stringify(decklists, null, 2));
}
