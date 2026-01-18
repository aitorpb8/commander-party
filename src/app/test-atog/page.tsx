
import { createClient } from '@/lib/supabase/server';

export default async function TestAtogPage() {
  const supabase = await createClient();
  
  // Search for Atogatog in deck names or commander map (if stored as json/text)
  // or just look for cards in deck_cards
  
  // 1. Check Decks
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .ilike('name', '%atog%');

  // 2. Check Deck Cards for Atogatog commander
  const { data: cards } = await supabase
    .from('deck_cards')
    .select('*')
    .limit(10);
  // 4. Check the Specific Corrupted Deck
  const corruptedDeckId = '03466f1a-fd89-4ec3-b329-1b9ad97505b3';
  const { data: corruptedDeck } = await supabase
    .from('decks')
    .select('*')
    .eq('id', corruptedDeckId)
    .single();

  // 5. RESTORE ACTION (Smart: Preserves Upgrades)
  async function restoreNecrons() {
    'use server'
    const fs = require('fs');
    const path = require('path');
    const { getCardByName } = await import('@/lib/scryfall');
    const { createClient: createAdmin } = await import('@supabase/supabase-js');
    
    // 1. Setup Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("--- RESTORE DEBUG ---");
    console.log("Has Service Key?", !!serviceRoleKey);
    console.log("Key Length:", serviceRoleKey?.length);
    
    if (!serviceRoleKey) {
        throw new Error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing/undefined in process.env. The restoration cannot bypass RLS without it.");
    }

    const supabase = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    console.log("Admin Client created.");
    console.log("Starting Smart Restore...");

    // 2. Load Base Precon List
    const listsPath = path.join(process.cwd(), 'src/data/precon-decklists.json');
    const fileContent = fs.readFileSync(listsPath, 'utf8');
    const allLists = JSON.parse(fileContent);
    const necronList = allLists['Necron Dynasties']; // Array of {name, quantity, ...}

    if (!necronList) throw new Error("Base list not found.");

    // 2. Load Upgrade History from DB
    const { data: upgrades } = await supabase
      .from('deck_upgrades')
      .select('*')
      .eq('deck_id', corruptedDeckId)
      .order('created_at', { ascending: true }); // Important: Replay in order

    console.log(`Found ${upgrades?.length || 0} upgrades to replay.`);

    // 3. Reconstruct State in Memory
    // Map<CardName, CardObject>
    const deckState = new Map<string, any>();

    // Initialize with Base
    necronList.forEach((c: any) => {
      deckState.set(c.name, {
        card_name: c.name,
        quantity: c.quantity || 1,
        type_line: c.type_line,
        mana_cost: c.mana_cost,
        image_url: c.image_url,
        is_commander: c.name === 'Szarekh, the Silent King'
      });
    });

    // Replay Upgrades
    const cardsToFetch = new Set<string>();

    if (upgrades) {
      for (const upg of upgrades) {
        // Handle Removal (Card Out)
        if (upg.card_out) {
          const info = deckState.get(upg.card_out);
          if (info) {
            if (info.quantity > 1) {
              info.quantity -= 1;
              deckState.set(upg.card_out, info);
            } else {
              deckState.delete(upg.card_out);
            }
          }
        }

        // Handle Addition (Card In)
        if (upg.card_in) {
          const info = deckState.get(upg.card_in);
          if (info) {
             info.quantity += 1;
             deckState.set(upg.card_in, info);
          } else {
             // New card! We need metadata.
             // Mark for fetching
             cardsToFetch.add(upg.card_in);
             // Add placeholder to state
             deckState.set(upg.card_in, {
               card_name: upg.card_in,
               quantity: 1,
               is_commander: false,
               needs_fetch: true // Flag
             });
          }
        }
      }
    }

    // 4. Fetch Missing Metadata (for cards added via upgrades that weren't in base)
    if (cardsToFetch.size > 0) {
      console.log(`Fetching metadata for ${cardsToFetch.size} added cards...`);
      for (const name of Array.from(cardsToFetch)) {
        const scryData = await getCardByName(name);
        const info = deckState.get(name);
        if (info && scryData) {
           info.type_line = scryData.type_line;
           info.mana_cost = scryData.mana_cost;
           info.image_url = scryData.image_uris?.normal || scryData.card_faces?.[0]?.image_uris?.normal;
           info.oracle_text = scryData.oracle_text;
           info.scryfall_id = scryData.id;
           delete info.needs_fetch;
           deckState.set(name, info);
        }
      }
    }

    // 5. Commit to Database
    // Wipe
    await supabase.from('deck_cards').delete().eq('deck_id', corruptedDeckId);

    // Insert
    const finalCards = Array.from(deckState.values()).map(c => ({
      deck_id: corruptedDeckId,
      card_name: c.card_name,
      quantity: c.quantity,
      type_line: c.type_line,
      mana_cost: c.mana_cost,
      image_url: c.image_url,
      is_commander: c.is_commander,
      // Ensure we don't try to insert the temp flag
      oracle_text: c.oracle_text
    }));

    if (finalCards.length > 0) {
        const { error } = await supabase.from('deck_cards').insert(finalCards);
        if (error) {
             console.error("Insert error:", error);
             throw error;
        }
    }
  }

  return (
    <div style={{ padding: '50px', background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1>🕵️‍♂️ Atogatog Detective & Repair</h1>
      
      <div style={{ border: '2px solid #d4af37', padding: '20px', marginBottom: '20px', borderRadius: '10px', background: '#111' }}>
        <h2>💀 Paciente Cero: Necron Dynasties (REPARACIÓN INTELIGENTE)</h2>
        <p>Estado actual: {corruptedDeck?.name} ({corruptedDeck?.id})</p>
        
        {corruptedDeck && (
            <div style={{ marginTop: '20px' }}>
                <form action={restoreNecrons}>
                    <button style={{ 
                        background: 'linear-gradient(45deg, #d4af37, #f4c430)', 
                        color: 'black', 
                        padding: '15px 30px', 
                        fontSize: '18px', 
                        fontWeight: 'bold',
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
                    }}>
                        🧠 RESTAURAR MAZO + RE-APLICAR MEJORAS
                    </button>
                    <div style={{ marginTop: '15px', color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                        <strong>¿Qué hará esto?</strong>
                        <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                            <li>Eliminará el contenido corrupto actual.</li>
                            <li>Cargará la lista base de "Necron Dynasties".</li>
                            <li>Buscará tu historial de mejoras (cartas añadidas/quitadas).</li>
                            <li><strong>Re-aplicará cada mejora</strong> sobre la lista base.</li>
                            <li>Buscará datos en Scryfall para las cartas extra que añadiste.</li>
                        </ul>
                        Resultado: Tu mazo NECRON con TUS mejoras, sin Atogs.
                    </div>
                </form>
            </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #333' }}>
         <h3>Estado del Caso Atogatog:</h3>
         {cards && cards.length > 0 ? (
           <div style={{ color: 'red' }}>⚠️ ENCONTRADO: {cards.length} carta(s) corrupta(s) detectada(s).</div>
         ) : (
           <div style={{ color: 'green' }}>✅ LIMPIO: No hay rastro de Atogatog.</div>
         )}
      </div>

      {/* {cards && cards.length > 0 && (
        <form action={deleteGhost}>
          <button style={{ 
            background: 'red', color: 'white', padding: '15px 30px', 
            fontSize: '20px', cursor: 'pointer', border: 'none', borderRadius: '8px' 
          }}>
            🗑️ BORRAR FANTASMA AHORA
          </button>
        </form>
      )} */}
      
      <h2>Decks with "Atog" in name:</h2>
      <pre>{JSON.stringify(decks, null, 2)}</pre>

      <h2>Cards named "Atogatog":</h2>
      <pre>{JSON.stringify(cards, null, 2)}</pre>
    </div>
  );
}
