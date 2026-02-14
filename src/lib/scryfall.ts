import { ScryfallCard } from '@/types';
export type { ScryfallCard };

const PROXY_GET = "/api/scryfall/proxy";

export async function getCardByName(
  name: string
): Promise<ScryfallCard | null> {
  try {
    const encodedName = encodeURIComponent(`!"${name}"`);
    const res = await fetch(`${PROXY_GET}?path=cards/search&q=${encodedName}&order=eur&dir=asc`);

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
    const res = await fetch(`${PROXY_GET}?path=cards/search&q=${encodedQuery}&order=eur&dir=asc`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  };

  try {
    const strictQuery = `${query} -is:promo -frame:extendedart -frame:borderless -is:digital -set:sld`;
    const strictResults = await performSearch(strictQuery);

    if (strictResults.length > 0) return strictResults;

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
    let nextUrl: string | null = `${PROXY_GET}?path=cards/search&q=${encodedName}&unique=prints&order=released&dir=desc`;
    
    let pagesFetched = 0;
    while (nextUrl && pagesFetched < 10) {
      const res: Response = await fetch(nextUrl);
      if (!res.ok) break;
      const data: any = await res.json();
      if (data.data) allPrints = [...allPrints, ...data.data];
      
      if (data.has_more && data.next_page) {
        const urlObj: URL = new URL(data.next_page);
        const path: string = urlObj.pathname.slice(1);
        const params: string = urlObj.search;
        nextUrl = `${PROXY_GET}?path=${path}${params.replace('?', '&')}`;
      } else {
        nextUrl = null;
      }
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
