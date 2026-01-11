import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // Extract ID from URL like https://www.archidekt.com/decks/1234567/name
    const match = url.match(/decks\/(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'URL de Archidekt inválida' }, { status: 400 });
    }
    
    const deckId = match[1];
    
    // Try root domain first, follow redirects
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
      redirect: 'follow'
    });
    
    if (!response.ok) {
      // Fallback to www if root fails
      const wwwResponse = await fetch(`https://www.archidekt.com/api/decks/${deckId}/`, {
        redirect: 'follow'
      });
      if (!wwwResponse.ok) {
        throw new Error('No se pudo obtener el mazo de Archidekt');
      }
      var data = await wwwResponse.json();
    } else {
      var data = await response.json();
    }
    
    // Parse cards
    const cards = data.cards.map((item: any) => {
      const oc = item.card.oracleCard;
      // Reconstruct type_line if missing or simple
      const typeLine = oc.typeLine || [
        ...(oc.superTypes || []),
        ...(oc.types || []),
        ...(oc.subTypes ? ["—", ...oc.subTypes] : [])
      ].join(' ');

      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories.includes('Commander'),
        image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
        back_image_url: (oc.cardFaces && oc.cardFaces.length > 1) ? (oc.cardFaces[1].imageUri || null) : null,
        type_line: typeLine,
        mana_cost: oc.manaCost,
        oracle_text: oc.oracleText
      };
    });

    const commander = cards.find((c: any) => c.is_commander)?.name || 'Desconocido';
    const deckName = data.name;

    return NextResponse.json({
      name: deckName,
      commander,
      cards,
      archidekt_id: deckId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
