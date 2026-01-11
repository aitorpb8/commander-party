export {}; // Treat as module to avoid global scope conflict

// using global fetch

interface Card {
  name: string;
  quantity: number;
  is_commander: boolean;
  type_line?: string;
  mana_cost?: string;
  image_url?: string;
  oracle_text?: string;
}

const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

function validateDeckListDebug(cards: Card[], expectedCommander: string): boolean {
  if (cards.length === 0) return false;
  const normalizedExpected = normalizeString(expectedCommander);
  
  const found = cards.some(c => {
    const normalizedName = normalizeString(c.name);
    return normalizedName === normalizedExpected || 
           normalizedName.includes(normalizedExpected) || 
           normalizedExpected.includes(normalizedName);
  });
  return found;
}

async function fetchDeckCards(archidektId: string): Promise<Card[]> {
  console.log(`[DEBUG] Fetching Archidekt ID: ${archidektId}`);
  try {
    const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`);
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    if (!data.cards) return [];
    
    return data.cards.map((item: any) => {
      const oc = item.card.oracleCard;
      if (!oc) return null;
      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories?.includes('Commander') || false,
        image_url: oc.imageUri,
      };
    }).filter((c: any) => c !== null);
  } catch (e) {
    return [];
  }
}

async function searchDeckOnArchidekt(deckName: string): Promise<string | null> {
  const endpoints = [
      `https://archidekt.com/api/decks/cards/?name=${encodeURIComponent(deckName)}&pageSize=5`,
      `https://archidekt.com/api/decks/v3/?name=${encodeURIComponent(deckName)}`, 
  ];

  for (const url of endpoints) {
      try {
        console.log(`[DEBUG] Trying Archidekt Search: ${url}`);
        const res = await fetch(url);
        if (!res.ok) {
           console.log(`[DEBUG] HTTP Error: ${res.status}`);
           continue;
        }
        const data = await res.json() as any;
        console.log(`[DEBUG] Results found: ${data.results?.length || 0}`);
        
        if (data.results && data.results.length > 0) {
            data.results.forEach((r: any) => console.log(`   - ID: ${r.id}, Name: "${r.name}", Owner: ${r.owner?.username}, ViewCount: ${r.viewCount}`));
            const match = data.results[0];
            return match.id.toString();
        }
      } catch (e) {
        console.warn(`[DEBUG] Search failed for ${url}:`, e);
      }
  }
  return null;
}

async function searchMoxfield(deckName: string, commanderName: string) {
    console.log(`[DEBUG] Searching Moxfield for "${deckName}"...`);
    // NOTE: Moxfield API is often strictly rate limited or blocked if User-Agent is generic node
    const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };
    try {
        const url = `https://api.moxfield.com/v2/decks/all?pageNumber=1&pageSize=3&sortType=updated&sortDirection=Descending&fmt=edh&filter=${encodeURIComponent(deckName)}`;
        console.log(`[DEBUG] URL: ${url}`);
        const res = await fetch(url, { headers });
        if(!res.ok) {
            console.log(`[DEBUG] Moxfield HTTP Error: ${res.status}`);
            const text = await res.text();
            console.log(`[DEBUG] Body: ${text.slice(0, 200)}`);
            return;
        }
        const data = await res.json() as any;
        console.log(`[DEBUG] Moxfield Results: ${data.data?.length}`);
        if(data.data) {
            data.data.forEach((d:any) => console.log(`   - ID: ${d.publicId}, Name: "${d.name}", Commander: ${d.mainCommanders?.[0]?.name}`));
        }
    } catch(e) {
        console.log(`[DEBUG] Moxfield Error:`, e);
    }
}

async function run() {
  console.log('--- TEST: World Shaper Search ---');
  // commander: Hearthhull, the Worldseed
  const searchId = await searchDeckOnArchidekt("World Shaper");
  if (searchId) {
      const cards = await fetchDeckCards(searchId);
      const valid = validateDeckListDebug(cards, "Hearthhull, the Worldseed");
      console.log(`Validation (Search Result 1): ${valid ? 'PASS' : 'FAIL'}`);
  }
}

run();
