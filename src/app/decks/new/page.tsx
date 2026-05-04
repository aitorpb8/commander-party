'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

import PreconSelector from '@/components/PreconSelector';
import preconsData from '@/data/precons.json';
import preconDecklists from '@/data/precon-decklists.json';

interface Precon {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}

const precons = preconsData as Precon[];
const decklists = preconDecklists as Record<string, any[]>;

export default function NewDeckPage() {
  const [url, setUrl] = useState('');
  const [preconUrl, setPreconUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const { user, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/decks/new');
    }
  }, [user, authLoading, router]);

  const handleImport = async (e?: React.FormEvent, overrideUrl?: string, cachedCards?: any[], overrideMetadata?: { name: string, commander: string }) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) throw new Error('Debes iniciar sesión para registrar un mazo.');

      let data: any = { name: '', commander: '', cards: [] };
      const targetUrl = overrideUrl || url;

      // Priority 1: Use cached cards if available
      if (cachedCards && cachedCards.length > 0) {
        const cachedCommander = cachedCards.find(c => c.is_commander)?.name || overrideMetadata?.commander || 'Comandante';
        data = {
          name: overrideMetadata?.name || precons.find(p => p.url === targetUrl)?.name || 'Mazo Precon',
          commander: cachedCommander,
          cards: cachedCards,
          archidekt_id: targetUrl.match(/decks\/(\d+)/)?.[1] || null,
        };
      } 
      // Priority 2: Import from Archidekt URL
      else if (overrideUrl && targetUrl.includes('archidekt.com')) {
        try {
          const res = await fetch('/api/import/archidekt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
          });
          data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al importar');
        } catch (fetchErr: any) {
          console.warn("Import cards failed, falling back to basic metadata:", fetchErr);
          data = {
            name: overrideMetadata?.name || 'Mazo Precon',
            commander: overrideMetadata?.commander || 'Comandante Desconocido',
            archidekt_id: targetUrl.match(/decks\/(\d+)/)?.[1] || null,
            cards: []
          };
          setError('No pudimos cargar las cartas, pero crearemos el mazo. Podrás sincronizarlo desde la página del mazo.');
        }
      }
      // Priority 3: Fallback — create empty deck with precon metadata only
      else {
        data = {
          name: overrideMetadata?.name || 'Mazo Precon',
          commander: overrideMetadata?.commander || 'Comandante',
          archidekt_id: null,
          cards: []
        };
      }

      // 1. Create the deck entry FIRST
      const metaForPrecon = precons.find(p => p.url === targetUrl);
      const { data: deck, error: dbError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: data.name || overrideMetadata?.name || metaForPrecon?.name || 'Nuevo Mazo',
          commander: data.commander || overrideMetadata?.commander || metaForPrecon?.commander || 'Desconocido',
          image_url: metaForPrecon?.imageUrl || data.cards?.find((c: any) => c.is_commander)?.image_url || null,
          archidekt_id: data.archidekt_id || null,
          precon_url: overrideUrl || preconUrl || null,
          precon_cards: data.cards && data.cards.length > 0 ? data.cards.map((c: any) => c.name) : null,
          budget_spent: 0,
          budget_limit: 10.0
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Try to insert cards if we have them
      if (data.cards && data.cards.length > 0) {
        const deckCards = data.cards.map((c: any) => ({
          deck_id: deck.id,
          card_name: c.name,
          quantity: c.quantity || 1,
          is_commander: c.is_commander || false,
          type_line: c.type_line || null,
          mana_cost: c.mana_cost || null,
          image_url: c.image_url || null,
          oracle_text: c.oracle_text || null,
          scryfall_id: c.scryfall_id || null
        }));

        const { error: cardsError } = await supabase
          .from('deck_cards')
          .insert(deckCards);

        if (cardsError) console.error("Error inserting deck cards:", cardsError);
      }

      // Small delay for DB consistency
      setTimeout(() => {
        if (!data.cards || data.cards.length === 0) {
          setError('El mazo se ha creado, pero no hemos podido cargar la lista de cartas automáticamente. Puedes intentar sincronizarlo desde la página del mazo.');
          setLoading(false);
          // Don't redirect immediately so user can see error
          setTimeout(() => router.push(`/decks/${deck.id}`), 3000);
        } else {
          router.push(`/decks/${deck.id}`);
          router.refresh();
        }
      }, 800);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreconSelect = (precon: any) => {
    setUrl(precon.url);
    setPreconUrl(precon.url);
    
    const cachedCards = decklists[precon.name];
    const metadata = { name: precon.name, commander: precon.commander };
    
    // If it has cached cards, use them directly
    if (cachedCards && cachedCards.length > 0) {
      handleImport(undefined, precon.url, cachedCards, metadata);
    } 
    // Otherwise try to import if it's a direct deck URL
    else if (precon.url.includes('/decks/')) {
      handleImport(undefined, precon.url, undefined, metadata);
    } else {
      // Force empty deck creation for old precons without cached lists
      handleImport(undefined, precon.url, undefined, metadata);
    }
  };

  return (
    <div style={{ margin: '0 auto', padding: '0 1rem', position: 'relative' }}>
      {loading && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
        }}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <h2 style={{ color: 'var(--color-gold)' }}>Preparando tu mazo...</h2>
          <p style={{ color: '#888' }}>Sincronizando con la base de datos de la liga</p>
        </div>
      )}

      <h1 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem', textAlign: 'center' }}>Registrar Nuevo Mazo</h1>
      <div className="card">
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
            Selecciona un mazo original para empezar tu liga. Se importará automáticamente.
          </p>
          <PreconSelector onSelect={handlePreconSelect} />
        </div>

        {error && <p style={{ color: 'var(--color-red)', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
