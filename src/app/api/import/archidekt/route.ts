import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    const match = url.match(/decks\/(\d+)/);
    if (!match) {
      return apiError('URL de Archidekt inválida', 400);
    }
    
    const deckId = match[1];
    
    // Try root domain first, follow redirects
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
      redirect: 'follow'
    });
    
    let data;
    
    if (!response.ok) {
      // Fallback to www if root fails
      const wwwResponse = await fetch(`https://www.archidekt.com/api/decks/${deckId}/`, {
        redirect: 'follow'
      });
      if (!wwwResponse.ok) {
        throw new Error('No se pudo obtener el mazo de Archidekt');
      }
      data = await wwwResponse.json();
    } else {
      data = await response.json();
    }
    
    // Parse cards
    const cards = data.cards.map((item: any) => {
      const oc = item.card.oracleCard;
      if (!oc) return null;

      // Reconstruct type_line correctly
      const typeLine = [
        ...(oc.superTypes || []),
        ...(oc.types || []),
        ...(oc.subTypes && oc.subTypes.length > 0 ? ["\u2014", ...oc.subTypes] : [])
      ].join(' ');

      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories?.includes('Commander') || false,
        image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
        type_line: typeLine,
        mana_cost: oc.manaCost || '',
        oracle_text: oc.text || '',
        scryfall_id: item.card.uid || null
      };
    }).filter((c: any) => c !== null);

    const commander = cards.find((c: any) => c.is_commander)?.name || 'Desconocido';
    const deckName = data.name;

    return NextResponse.json({
      name: deckName,
      commander,
      cards,
      archidekt_id: deckId
    });
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
