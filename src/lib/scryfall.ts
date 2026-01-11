const SCRYFALL_API = "https://api.scryfall.com";

export interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  image_uris?: {
    normal: string;
    small: string;
    large?: string;
    png?: string;
  };
  card_faces?: {
    name: string;
    image_uris?: {
      normal: string;
      small: string;
      large?: string;
      png?: string;
    };
    oracle_text?: string;
    mana_cost?: string;
    type_line?: string;
  }[];
  prices: {
    eur?: string;
    eur_foil?: string;
    usd?: string;
  };
  color_identity: string[];
  set_name?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  mana_cost?: string;
}

export async function getCardByName(
  name: string
): Promise<ScryfallCard | null> {
  try {
    const encodedName = encodeURIComponent(name);
    const res = await fetch(`${SCRYFALL_API}/cards/named?exact=${encodedName}`);

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Scryfall API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data as ScryfallCard;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
}

export async function getCollection(names: string[]): Promise<ScryfallCard[]> {
  if (names.length === 0) return [];
  try {
    // Scryfall allows up to 75 identifiers per request
    const identifiers = names.map(name => ({ name }));
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers })
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching collection:", error);
    return [];
  }
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  if (query.length < 2) return [];
  
  const performSearch = async (q: string) => {
    const encodedQuery = encodeURIComponent(q);
    const res = await fetch(`${SCRYFALL_API}/cards/search?q=${encodedQuery}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  };

  try {
    // 1. Try strict search (No special treatments, no digital)
    // We filter out promos, extended art, borderless, and Secret Lair
    const strictQuery = `${query} -is:promo -frame:extendedart -frame:borderless -is:digital -set:sld`;
    const strictResults = await performSearch(strictQuery);

    if (strictResults.length > 0) return strictResults;

    // 2. Fallback: Relaxed search (allow everything)
    // useful for cards that ONLY exist as promos or special versions
    console.log(`No standard results for "${query}", falling back to relaxed search.`);
    return await performSearch(query);

  } catch (error) {
    console.error("Error searching cards", error);
    return [];
  }
}

export async function getCardPrints(name: string): Promise<ScryfallCard[]> {
  try {
    const encodedName = encodeURIComponent(`!"${name}"`);
    const res = await fetch(`${SCRYFALL_API}/cards/search?q=${encodedName}&unique=prints`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching prints:", error);
    return [];
  }
}

export async function getAveragePrice(name: string): Promise<{ price: number, sets: string[] } | null> {
  const prints = await getCardPrints(name);
  if (prints.length === 0) return null;

  const validPrints = prints
    .filter(p => p.set !== 'sld' && !p.type_line.includes('Promo')) // Exclude Secret Lair and Promos
    .map(p => ({
      price: parseFloat(p.prices?.eur || p.prices?.eur_foil || 'Infinity'),
      set: p.set_name || p.set
    }))
    .filter(p => p.price !== Infinity)
    .sort((a, b) => a.price - b.price);

  if (validPrints.length === 0) return null;

  // Take up to 3 cheapest versions
  const cheapestThree = validPrints.slice(0, 3);
  const sum = cheapestThree.reduce((acc, p) => acc + p.price, 0);
  const avg = sum / cheapestThree.length;

  return { 
    price: parseFloat(avg.toFixed(2)), 
    sets: cheapestThree.map(p => p.set) 
  };
}
