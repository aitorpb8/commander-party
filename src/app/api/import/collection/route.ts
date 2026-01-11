import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const { url } = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let cards: any[] = [];
    let source = '';

    if (url.includes('moxfield.com')) {
      source = 'moxfield';
      const match = url.match(/decks\/([^/\?]+)/);
      if (!match) throw new Error('URL de Moxfield inválida');
      
      const deckId = match[1];
      const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`);
      if (!response.ok) throw new Error('No se pudo obtener la colección de Moxfield');
      
      const data = await response.json();
      cards = Object.values(data.mainboard || {}).map((item: any) => ({
        name: item.card.name,
        quantity: item.quantity
      }));
    } else if (url.includes('archidekt.com')) {
      source = 'archidekt';
      const match = url.match(/decks\/(\d+)/);
      if (!match) throw new Error('URL de Archidekt inválida');
      
      const deckId = match[1];
      const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`, { redirect: 'follow' });
      const data = await response.json();
      cards = data.cards.map((item: any) => ({
        name: item.card.oracleCard.name,
        quantity: item.quantity
      }));
    } else {
      throw new Error('Fuente no soportada. Usa Moxfield o Archidekt.');
    }

    if (cards.length === 0) {
      throw new Error('No se encontraron cartas en la URL proporcionada.');
    }

    // 1. Clear existing collection (or we could UPSERT but clearing is cleaner for a "full sync")
    // Let's UPSERT so we don't break things if part of it fails, but the user wants "complete import".
    // Actually, the requirement said "importación completa". Let's delete and re-insert for a true sync.
    await supabase.from('user_collection').delete().eq('user_id', user.id);

    // 2. Insert new cards in batches to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize).map(c => ({
        user_id: user.id,
        card_name: c.name,
        quantity: c.quantity,
        source: source
      }));
      
      const { error: insertError } = await supabase.from('user_collection').insert(batch);
      if (insertError) throw insertError;
    }

    // 3. Update profile
    await supabase
      .from('profiles')
      .update({ 
        collection_url: url,
        collection_last_synced: new Date().toISOString()
      })
      .eq('id', user.id);

    return NextResponse.json({ 
      success: true, 
      count: cards.length,
      message: `Sincronizadas ${cards.length} cartas correctamente.`
    });

  } catch (error: any) {
    console.error('Collection Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
