
import fs from 'fs/promises';
import path from 'path';

interface Precon {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}

interface Card {
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

async function fetchArchidektCards(archidektId: string): Promise<Card[]> {
  const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`);
  if (!response.ok) {
    console.error(`      Archidekt error: ${response.status} ${response.statusText}`);
    return [];
  }
  
  const data = await response.json() as any;
  if (!data.cards) return [];
  
  return data.cards.map((item: any) => {
    const oc = item.card.oracleCard;
    if (!oc) return null;
    
    const typeLine = oc.typeLine || [
      ...(oc.superTypes || []),
      ...(oc.types || []),
      ...(oc.subTypes ? ["—", ...oc.subTypes] : [])
    ].join(' ');

    return {
      name: oc.name,
      quantity: item.quantity,
      is_commander: item.categories?.includes('Commander') || false,
      type_line: typeLine,
      mana_cost: oc.manaCost,
      image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
      oracle_text: oc.oracleText
    };
  }).filter((c: any) => c !== null);
}

async function fetchMoxfieldCards(moxfieldId: string): Promise<Card[]> {
  const response = await fetch(`https://api.moxfield.com/v2/decks/all/${moxfieldId}`, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    console.error(`      Moxfield error: ${response.status} ${response.statusText}`);
    return [];
  }
  
  const data = await response.json() as any;
  const cards: Card[] = [];

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
}

async function fetchDeckCards(url: string): Promise<Card[]> {
  try {
    if (url.includes('archidekt.com')) {
      const match = url.match(/decks\/(\d+)/);
      if (match) return fetchArchidektCards(match[1]);
    } else if (url.includes('moxfield.com')) {
      const match = url.match(/decks\/([^/\?]+)/);
      if (match) return fetchMoxfieldCards(match[1]);
    }
    return [];
  } catch (e) {
    console.error(`      Fetch failed for ${url}:`, e);
    return [];
  }
}

async function sync() {
  const metaPath = path.join(process.cwd(), 'src/data/precons.json');
  const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');

  console.log('📖 Reading precons.json...');
  const precons: Precon[] = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  
  console.log('📖 Reading current precon-decklists.json...');
  let decklists: Record<string, Card[]> = {};
  try {
    decklists = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch (e) {
    console.warn('⚠️ No existing decklists file found, starting fresh.');
  }

  console.log('🔄 Checking for updates...\n');

  for (const precon of precons) {
    const isSupported = precon.url.includes('archidekt.com') || precon.url.includes('moxfield.com');
    if (!isSupported) {
      console.log(`⏩ Skipping ${precon.name} (URL not supported: ${precon.url})`);
      continue;
    }

    // For this specific task, we'll force update if the user wants, 
    // but usually we check if it's missing or if we want a full refresh.
    // Let's print which one we're doing.
    console.log(`📦 Proccessing "${precon.name}"...`);
    
    const cards = await fetchDeckCards(precon.url);
    if (cards.length > 0) {
      decklists[precon.name] = cards;
      console.log(`   ✅ Success! Cached ${cards.length} cards.`);
    } else {
      console.log(`   ❌ Failed to fetch cards for ${precon.name}`);
    }
    
    // Rate limit safety
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n💾 Saving results...');
  await fs.writeFile(cachePath, JSON.stringify(decklists, null, 2));
  console.log('✨ Done! Cache synchronized.');
}

sync().catch(console.error);
