import { NextResponse } from 'next/server';
import preconsData from '@/data/precons.json';
import preconDecklists from '@/data/precon-decklists.json';
import { apiError } from '@/lib/api-error';

const precons = preconsData as any[];
const decklists = preconDecklists as Record<string, any[]>;

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // Extract Moxfield ID from URL
    const match = url.match(/decks\/([^/\?]+)/);
    const deckId = match ? match[1] : null;

    if (!deckId) {
      return apiError('URL de Moxfield inválida', 400);
    }

    // 1. CHECK LOCAL DATA FIRST (Robust ID Matching)
    // We check if we have this deck in our local precons metadata
    const localPrecon = precons.find(p => {
        // Check exact URL match
        if (p.url === url) return true;
        // Check if ID matches
        if (p.url.includes(deckId)) return true;
        return false;
    });
    
    // If found metadata AND we have the decklist locally
    if (localPrecon && decklists[localPrecon.name]) {
      console.log(`Using local decklist for ${localPrecon.name} (ID: ${deckId})`);
      const localCards = decklists[localPrecon.name].map(c => ({
        name: c.name,
        quantity: c.quantity || 1,
        is_commander: c.is_commander || false,
        image_url: c.image_url || null,
        type_line: c.type_line || null,
        mana_cost: c.mana_cost || null,
        oracle_text: c.oracle_text || null
      }));

      return NextResponse.json({
        name: localPrecon.name,
        commander: localPrecon.commander,
        cards: localCards,
        moxfield_id: deckId
      });
    }

    // 2. FALLBACK TO SCRAPING
    console.log(`Deck ${deckId} not found locally. Scraping Moxfield...`);
    const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.moxfield.com/'
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`Moxfield blocked comparison request (403).`);
        // If we really can't find it locally and scraping fails, we return a specific error
        // asking the user to double check if it's a standard precon or waiting a bit.
        return apiError('Moxfield ha bloqueado la petición (403) y no se ha encontrado el mazo en la base de datos local.', 403);
      }

      console.error(`Moxfield API error: ${response.status} ${response.statusText}`);
      return apiError(`Error de Moxfield: ${response.status}`, response.status);
    }
    
    const data = await response.json();
    
    // In Moxfield, commander is usually in 'commanders' object
    const commanderObj = Object.values(data.commanders || {})[0] as any;
    const commander = commanderObj?.name || 'Desconocido';
    const deckName = data.name;

    // Parse cards (mainboard)
    const cards = Object.values(data.mainboard || {}).map((item: any) => ({
      name: item.card.name,
      quantity: item.quantity,
      is_commander: false,
      image_url: item.card.images?.normal,
      type_line: item.card.type_line,
      mana_cost: item.card.mana_cost,
      oracle_text: item.card.oracle_text
    }));

    return NextResponse.json({
      name: deckName,
      commander,
      cards,
      moxfield_id: deckId
    });
  } catch (error: any) {
    console.error("Internal Error in Moxfield route:", error);
    return apiError(error.message, 500);
  }
}
