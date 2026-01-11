import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // Extract ID from URL like https://www.moxfield.com/decks/DECK_ID
    const match = url.match(/decks\/([^/\?]+)/);
    if (!match) {
      return NextResponse.json({ error: 'URL de Moxfield inválida' }, { status: 400 });
    }
    
    const deckId = match[1];
    const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.moxfield.com/'
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`Moxfield blocked comparison request (403). Skipping precon data.`);
        return NextResponse.json({ warning: 'Moxfield Access Denied' }, { status: 200 });
      }
      console.error(`Moxfield API error: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: `Error de Moxfield: ${response.status}` }, { status: response.status });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
