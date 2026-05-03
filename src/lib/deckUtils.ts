import { ScryfallCard, DeckCard } from '@/types';
import { getAveragePrice } from './scryfall';

/**
 * Calculates the final price and description for a card based on its status
 */
export async function calculateCardCost(
  card: ScryfallCard,
  preconCardNames: Set<string> = new Set(),
  userCollection: Set<string> = new Set()
): Promise<{ price: number; description: string }> {
  const scryName = card.name.toLowerCase();
  const isPrecon = preconCardNames.has(scryName);
  const isOwned = userCollection.has(scryName);
  const isBasic = card.type_line?.includes('Basic Land');

  if (isPrecon) {
    return { price: 0, description: 'Añadida desde base original (0€)' };
  }
  
  if (isOwned) {
    return { price: 0, description: 'Carta de tu colección personal (0€)' };
  }
  
  if (isBasic) {
    return { price: 0, description: 'Tierra básica (0€)' };
  }

  if (card.prices?.eur) {
    const price = parseFloat(card.prices.eur) || 0;
    return { 
      price, 
      description: `Precio Cardmarket (${card.set_name || card.set?.toUpperCase()})` 
    };
  }

  const avgData = await getAveragePrice(card.name);
  const finalPrice = avgData?.price || 0;
  return {
    price: finalPrice,
    description: avgData 
      ? `Precio Estimado (Media versiones baratas: ${avgData.sets.join(', ')})`
      : 'Precio no disponible (0€)'
  };
}

/**
 * Transforms a ScryfallCard into a DeckCard format for database insertion
 */
export function transformScryfallToDeckCard(
  sc: ScryfallCard, 
  deckId: string, 
  isCommander: boolean = false
): Partial<DeckCard> {
  const imageUrl = sc.image_uris?.normal || sc.card_faces?.[0]?.image_uris?.normal || '';
  const backImageUrl = sc.card_faces?.[1]?.image_uris?.normal || null;
  const oracleText = sc.oracle_text || sc.card_faces?.map(f => `${f.name}: ${f.oracle_text}`).join('\n\n') || null;

  return {
    deck_id: deckId,
    card_name: sc.name,
    quantity: 1,
    is_commander: isCommander,
    type_line: sc.type_line,
    mana_cost: sc.mana_cost || sc.card_faces?.[0]?.mana_cost || null,
    image_url: imageUrl,
    back_image_url: backImageUrl,
    oracle_text: oracleText,
    scryfall_id: sc.id,
    set_code: sc.set,
    set_name: sc.set_name,
    collector_number: sc.collector_number
  };
}
