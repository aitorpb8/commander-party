import fs from 'fs/promises';
import path from 'path';

/**
 * Smart Commander Precon Generator
 * 
 * Flow:
 * 1. Reads src/data/precons.json (The Source of Truth).
 * 2. Extracts IDs from URLs (Archidekt/Moxfield).
 * 3. Fetches missing decklists for precon-decklists.json.
 */

interface Card {
  name: string;
  quantity: number;
  is_commander: boolean;
  type_line?: string;
  mana_cost?: string;
  image_url?: string;
  oracle_text?: string;
}

interface PreconMetadata {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}

const BROWSER_HEADERS = { 
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function fetchMoxfieldCards(moxfieldId: string): Promise<Card[]> {
  try {
    const response = await fetch(`https://api.moxfield.com/v2/decks/all/${moxfieldId}`, { headers: BROWSER_HEADERS });
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const cards: Card[] = [];

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

    if (data.mainboard) {
      Object.values(data.mainboard).forEach((item: any) => {
        cards.push({
          name: item.card.name,
          quantity: item.quantity,
          is_commander: false,
          type_line: item.card.type_line,
          mana_cost: item.card.mana_cost,
          image_url: item.card.images?.normal,
          oracle_text: item.card.oracle_text
        });
      });
    }
    return cards;
  } catch {
    return [];
  }
}

async function fetchArchidektCards(archidektId: string, retries = 3): Promise<Card[]> {
  try {
    const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchArchidektCards(archidektId, retries - 1);
      }
      return [];
    }
    const data = await response.json() as any;
    if (!data.cards) return [];
    
    return data.cards.map((item: any) => {
      if (item.categories?.includes('Sideboard') || item.categories?.includes('Maybeboard')) return null;
      const oc = item.card.oracleCard;
      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories?.includes('Commander') || false,
        type_line: oc.typeLine,
        mana_cost: oc.manaCost,
        image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
        oracle_text: oc.oracleText
      };
    }).filter((c: any) => c !== null);
  } catch {
    return [];
  }
}

function extractId(url: string): { id: string, type: 'archidekt' | 'moxfield' | 'unknown' } {
  if (url.includes('archidekt.com/decks/')) {
    const match = url.match(/decks\/(\d+)/);
    return { id: match ? match[1] : '', type: 'archidekt' };
  }
  if (url.includes('moxfield.com/decks/')) {
    const match = url.match(/decks\/([^/]+)/);
    return { id: match ? match[1] : '', type: 'moxfield' };
  }
  return { id: '', type: 'unknown' };
}

async function generatePrecons() {
  console.log('🚀 Smart Precon Decklist Generator\n');
  
  const preconsPath = path.join(process.cwd(), 'src', 'data', 'precons.json');
  const decklistsPath = path.join(process.cwd(), 'src', 'data', 'precon-decklists.json');

  const preconsRaw = await fs.readFile(preconsPath, 'utf8');
  const precons = JSON.parse(preconsRaw) as PreconMetadata[];
  
  let decklists: Record<string, Card[]> = {};
  try {
    const existingDecklistsRaw = await fs.readFile(decklistsPath, 'utf8');
    decklists = JSON.parse(existingDecklistsRaw);
    console.log(`📦 Loaded ${Object.keys(decklists).length} existing decklists.`);
  } catch {
    console.log('📦 No existing decklists found, starting fresh.');
  }

  for (const precon of precons) {
    if (decklists[precon.name]) {
      console.log(`  - ${precon.name} already cached. Skiping.`);
      continue;
    }

    const { id, type } = extractId(precon.url);
    if (!id || type === 'unknown') {
      console.warn(`  ⚠️ Could not extract ID for: ${precon.name} (${precon.url})`);
      continue;
    }

    console.log(`  - Fetching ${precon.name} (${type} ID: ${id})...`);
    const cards = type === 'archidekt' ? await fetchArchidektCards(id) : await fetchMoxfieldCards(id);

    if (cards.length > 0) {
      decklists[precon.name] = cards;
      console.log(`    ✅ Cached ${cards.length} cards.`);
    } else {
      console.warn(`    ❌ Failed to fetch decklist for ${precon.name}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit safety
  }

  await fs.writeFile(decklistsPath, JSON.stringify(decklists, null, 2));
  console.log('\n💾 Saved precon-decklists.json');
  console.log('✨ Done!\n');
}

generatePrecons().catch(console.error);
