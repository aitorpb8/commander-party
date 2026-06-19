import { ScryfallCard } from '@/types';
export type { ScryfallCard };

const PROXY_GET = "/api/scryfall/proxy";

function normalizeBasicLandName(query: string): string {
  const normalizedQuery = query.toLowerCase().trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents/diacritics

  if (/^(islas?|illes?)\s*(basicas?)?$/.test(normalizedQuery)) {
    return 'Island';
  } else if (/^(montanas?|muntanyes?)\s*(basicas?)?$/.test(normalizedQuery)) {
    return 'Mountain';
  } else if (/^(llanuras?|planes?)\s*(basicas?)?$/.test(normalizedQuery)) {
    return 'Plains';
  } else if (/^(pantanos?|pantans?)\s*(basicas?)?$/.test(normalizedQuery)) {
    return 'Swamp';
  } else if (/^(bosques?|boscos?)\s*(basicas?)?$/.test(normalizedQuery)) {
    return 'Forest';
  } else if (/^yermos?$/.test(normalizedQuery)) {
    return 'Wastes';
  }
  return query;
}

export async function getCardByName(
  name: string
): Promise<ScryfallCard | null> {
  const targetName = normalizeBasicLandName(name);
  try {
    // 1. Try exact match first
    const exactQuery = `!"${targetName}" -is:extra -is:artseries -layout:token`;
    const res = await fetch(`${PROXY_GET}?path=cards/search&q=${encodeURIComponent(exactQuery)}&order=eur&dir=asc`);

    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data[0]) return data.data[0];
    }

    // 2. If exact fails, try a fuzzy/relaxed search
    console.log(`Exact match failed for "${targetName}", trying relaxed search...`);
    const relaxedQuery = `${targetName} -is:extra -is:artseries -layout:token`;
    const resRelaxed = await fetch(`${PROXY_GET}?path=cards/search&q=${encodeURIComponent(relaxedQuery)}&order=eur&dir=asc`);
    
    if (resRelaxed.ok) {
      const dataRelaxed = await resRelaxed.json();
      // Return the most relevant/cheapest version
      return (dataRelaxed.data && dataRelaxed.data[0]) || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
}

export async function getCollection(identifiers: { name?: string, id?: string }[]): Promise<ScryfallCard[]> {
  if (identifiers.length === 0) return [];
  const normalizedIdentifiers = identifiers.map(id => 
    id.name ? { ...id, name: normalizeBasicLandName(id.name) } : id
  );
  try {
    // Use internal API route to avoid CORS issues with POST requests
    const res = await fetch('/api/scryfall/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: normalizedIdentifiers })
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

  query = normalizeBasicLandName(query);
  
  const performSearch = async (q: string) => {
    // Forcefully exclude tokens, art series, and extras from all searches
    const finalQuery = `${q} -is:extra -is:artseries -layout:token`;
    const encodedQuery = encodeURIComponent(finalQuery);
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
    const encodedName = encodeURIComponent(`!"${name}" -is:extra -is:artseries -layout:token`);
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
