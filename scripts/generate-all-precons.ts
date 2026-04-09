import fs from 'fs/promises';
import path from 'path';

// Types for the database
interface Card {
  name: string;
  quantity: number;
  is_commander: boolean;
  type_line: string;
  mana_cost: string;
  image_url: string;
  oracle_text: string;
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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json'
};

/**
 * Reconstructs a Scryfall-style type_line from Archidekt's split fields
 */
function reconstructTypeLine(oc: any): string {
  const parts = [];
  if (oc.superTypes && oc.superTypes.length > 0) parts.push(...oc.superTypes);
  if (oc.types && oc.types.length > 0) parts.push(...oc.types);
  if (oc.subTypes && oc.subTypes.length > 0) {
    parts.push('\u2014'); // em-dash
    parts.push(...oc.subTypes);
  }
  return parts.join(' ');
}

/**
 * Fetches cards from a public Archidekt deck via its API
 */
async function fetchArchidektCards(archidektId: string, retries = 3): Promise<Card[]> {
  try {
    const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`, {
      headers: BROWSER_HEADERS
    });

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.log(`    ⏳ Rate limited. Waiting 5s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchArchidektCards(archidektId, retries - 1);
      }
      return [];
    }

    const data = await response.json() as any;
    if (!data.cards) return [];
    
    return data.cards.map((item: any) => {
      // Skip boards we don't need
      if (item.categories?.includes('Sideboard') || item.categories?.includes('Maybeboard')) return null;
      
      const oc = item.card.oracleCard;
      if (!oc) return null;

      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories?.includes('Commander') || false,
        type_line: reconstructTypeLine(oc),
        mana_cost: oc.manaCost || '',
        image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
        oracle_text: oc.text || ''
      };
    }).filter((c: any) => c !== null) as Card[];
  } catch (error) {
    console.error(`    ❌ Error fetching Archidekt ID ${archidektId}:`, error);
    return [];
  }
}

/**
 * Extracts the numerical ID from an Archidekt URL
 */
function extractArchidektId(url: string): string | null {
  const match = url.match(/archidekt\.com\/decks\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Main process: Reads precons.json, fetches decklists, and saves to precon-decklists.json
 */
async function generatePrecons() {
  console.log('🚀 Archidekt Precon Database Synchronizer\n');
  
  const preconsPath = path.join(process.cwd(), 'src', 'data', 'precons.json');
  const decklistsPath = path.join(process.cwd(), 'src', 'data', 'precon-decklists.json');

  // Load Source URLs
  const preconsRaw = await fs.readFile(preconsPath, 'utf8');
  const precons = JSON.parse(preconsRaw) as PreconMetadata[];
  
  // Load Existing Cache
  let decklists: Record<string, Card[]> = {};
  try {
    const existingDecklistsRaw = await fs.readFile(decklistsPath, 'utf8');
    decklists = JSON.parse(existingDecklistsRaw);
    console.log(`📦 Loaded ${Object.keys(decklists).length} existing decklists.`);
  } catch {
    console.log('📦 No existing decklists found, starting fresh.');
  }

  for (const precon of precons) {
    const existing = decklists[precon.name];
    
    // Check if cache is valid (has cards AND all cards have types)
    const isValid = existing && existing.length > 0 && !existing.some(c => !c.type_line);
    
    if (isValid) {
      console.log(`  - ${precon.name}: OK (Cached)`);
      continue;
    }

    const id = extractArchidektId(precon.url);
    if (!id) {
      console.warn(`  ⚠️ Skip: URL doesn't look like an Archidekt deck: ${precon.name}`);
      continue;
    }

    console.log(`  - Fetching ${precon.name} (ID: ${id})...`);
    const cards = await fetchArchidektCards(id);

    if (cards.length > 0) {
      decklists[precon.name] = cards;
      console.log(`    ✅ Success: ${cards.length} cards imported.`);
    } else {
      console.warn(`    ❌ Error: Could not retrieve decklist for ${precon.name}`);
    }

    // Gentle rate limiting for Archidekt API
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Final Save
  await fs.writeFile(decklistsPath, JSON.stringify(decklists, null, 2));
  console.log('\n💾 Database updated successfully: src/data/precon-decklists.json');
  console.log('✨ All systems ready!\n');
}

// Run the script
generatePrecons().catch(err => {
  console.error('💥 Critical script failure:', err);
  process.exit(1);
});
