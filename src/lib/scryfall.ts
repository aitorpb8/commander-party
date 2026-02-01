import { ScryfallCard } from '@/types';

const SCRYFALL_API = "https://api.scryfall.com";

export type { ScryfallCard };

// Removed local interface definition


export async function getCardByName(
  name: string
): Promise<ScryfallCard | null> {
  try {
    // Instead of using /cards/named, we use /cards/search with exact name and order=eur
    // to ensure we get the cheapest printing available.
    const encodedName = encodeURIComponent(`!"${name}"`);
    const res = await fetch(`${SCRYFALL_API}/cards/search?q=${encodedName}&order=eur&dir=asc`);

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Scryfall API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.data && data.data[0]) || null;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
}

export async function getCollection(identifiers: { name?: string, id?: string }[]): Promise<ScryfallCard[]> {
  if (identifiers.length === 0) return [];
  try {
    // Use internal API route to avoid CORS issues with POST requests
    const res = await fetch('/api/scryfall/collection', {
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
    // Add order=eur&dir=asc to prioritize the cheapest printing
    const res = await fetch(`${SCRYFALL_API}/cards/search?q=${encodedQuery}&order=eur&dir=asc`);
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
    let allPrints: ScryfallCard[] = [];
    let nextUrl = `${SCRYFALL_API}/cards/search?q=${encodedName}&unique=prints&order=released&dir=desc`;
    
    // We fetch up to 10 pages (1750 cards) to cover all basic lands (Forest has >600 prints).
    let pagesFetched = 0;
    while (nextUrl && pagesFetched < 10) {
      const res = await fetch(nextUrl);
      if (!res.ok) break;
      const data = await res.json();
      if (data.data) allPrints = [...allPrints, ...data.data];
      nextUrl = data.has_more ? data.next_page : null;
      pagesFetched++;
    }
    
    return allPrints;
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
