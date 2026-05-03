import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { searchCards, ScryfallCard, getAveragePrice, getCollection, getCardPrints, getCardByName } from '@/lib/scryfall';
import { calculateCardCost } from '@/lib/deckUtils';
import { DeckCard } from '@/types';

export interface WishlistCard {
  id: string;
  card_name: string;
  price: number;
  image_url: string;
  priority: 'High' | 'Medium' | 'Low';
  target_month?: string; // YYYY-MM
  scryfall_id?: string;
  card_out?: string;
}

interface UseWishlistProps {
  deckId: string;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, cost?: number, description?: string }) => Promise<void> | void;
  externalTrendingPrices?: Record<string, number>;
}

export function useWishlist({ deckId, onUpdateDeck, externalTrendingPrices }: UseWishlistProps) {
  const [wishlist, setWishlist] = useState<WishlistCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>(externalTrendingPrices || {});
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchWishlist = async () => {
    const { data, error } = await supabase
      .from('deck_wishlist')
      .select('*')
      .eq('deck_id', deckId)
      .order('target_month', { ascending: true })
      .order('created_at', { ascending: false });
      
    if (data) setWishlist(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWishlist();
  }, [deckId]);

  // Fetch trending prices for wishlist items
  useEffect(() => {
    const fetchTrending = async () => {
      if (wishlist.length === 0) {
        setTrendingPrices({});
        return;
      }
      setLoadingTrending(true);
      const identifiers = wishlist.map(w => 
        w.scryfall_id ? { id: w.scryfall_id } : { name: w.card_name }
      );
      const cards = await getCollection(identifiers);
      const prices: Record<string, number> = {};
      cards.forEach(c => {
        prices[c.name.toLowerCase()] = parseFloat(c.prices.eur || '0');
        if (c.id) prices[c.id] = parseFloat(c.prices.eur || '0');
      });
      setTrendingPrices(prices);
      setLoadingTrending(false);
    };
    fetchTrending();
  }, [wishlist.length === 0]); // Only re-run if wishlist becomes empty or on first load with items

  // Search logic
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        const res = await searchCards(query);
        if (!cancelled) {
          setSearchResults(res.slice(0, 50));
        }
      } else {
        if (!cancelled) setSearchResults([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const addToWishlist = async (card: ScryfallCard) => {
    let price = 0;
    if (card.prices?.eur) {
      price = parseFloat(card.prices.eur);
    } else {
      const avg = await getAveragePrice(card.name);
      price = avg?.price || 0;
    }

    const { error } = await supabase.from('deck_wishlist').insert({
      deck_id: deckId,
      card_name: card.name,
      price: price,
      image_url: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
      priority: 'Medium',
      target_month: null 
    });

    if (!error) {
      fetchWishlist();
      setQuery('');
      setSearchResults([]);
      return true;
    }
    return false;
  };

  const removeFromWishlist = async (id: string) => {
    const { error } = await supabase.from('deck_wishlist').delete().eq('id', id);
    if (!error) {
      setWishlist(prev => prev.filter(w => w.id !== id));
      return true;
    }
    return false;
  };

  const updateMonth = async (id: string, month: string | null) => {
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ target_month: month })
      .eq('id', id);
    
    if (!error) {
       setWishlist(prev => prev.map(w => w.id === id ? { ...w, target_month: month as string } : w));
       return true;
    }
    return false;
  };

  const updateSwap = async (id: string, cardOut: string | null) => {
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ card_out: cardOut })
      .eq('id', id);
    
    if (!error) {
       setWishlist(prev => prev.map(w => w.id === id ? { ...w, card_out: cardOut || undefined } : w));
       return true;
    }
    return false;
  };

  const selectVersion = async (wishlistId: string, card: ScryfallCard) => {
    const newPrice = parseFloat(card.prices.eur || '0');
    const newImageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
    
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ 
        scryfall_id: card.id,
        image_url: newImageUrl,
        price: newPrice 
      })
      .eq('id', wishlistId);

    if (!error) {
      setWishlist(prev => prev.map(w => w.id === wishlistId ? { 
        ...w, 
        scryfall_id: card.id, 
        image_url: newImageUrl, 
        price: newPrice 
      } : w));
      return true;
    }
    return false;
  };

  const addAllToMainboard = async (monthKey: string) => {
    const cardsToAdd = wishlist.filter(w => (w.target_month || 'backlog') === monthKey);
    if (cardsToAdd.length === 0) return 0;

    let successCount = 0;
    for (const card of cardsToAdd) {
      try {
        if (onUpdateDeck) {
          let cardIn: any = card.card_name;
          if (card.scryfall_id) {
            const scResults = await getCollection([{ id: card.scryfall_id }]);
            if (scResults.length > 0) cardIn = scResults[0];
          } else {
            const sc = await getCardByName(card.card_name);
            if (sc) cardIn = sc;
          }

          const { price } = typeof cardIn !== 'string' 
            ? await calculateCardCost(cardIn) 
            : { price: card.price || 0 };

          // Wait for the update to complete
          await onUpdateDeck({
            card_in: cardIn,
            card_out: card.card_out || undefined,
            cost: price,
            description: `Añadido desde Wishlist (${monthKey})${card.card_out ? ` (Sustituye a ${card.card_out})` : ''}`
          });
          
          // ONLY remove from wishlist if we successfully called onUpdateDeck
          const { error } = await supabase.from('deck_wishlist').delete().eq('id', card.id);
          if (!error) {
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Error applying card ${card.card_name} from wishlist:`, err);
      }
    }

    if (successCount > 0) {
      fetchWishlist();
    }
    return successCount;
  };

  // Grouping logic
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    date.setDate(1); 
    for (let i = 0; i < 6; i++) {
      const value = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
      const year = date.getFullYear();
      const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
      options.push({ value, label });
      date.setMonth(date.getMonth() + 1);
    }
    return options;
  };

  const grouped: Record<string, WishlistCard[]> = {};
  wishlist.forEach(item => {
    const key = item.target_month || 'backlog';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'backlog') return 1;
    if (b === 'backlog') return -1;
    return a.localeCompare(b);
  });

  return {
    wishlist,
    loading,
    trendingPrices,
    loadingTrending,
    query,
    setQuery,
    searchResults,
    addToWishlist,
    removeFromWishlist,
    updateMonth,
    updateSwap,
    selectVersion,
    addAllToMainboard,
    getMonthOptions,
    grouped,
    sortedKeys,
    fetchWishlist
  };
}
