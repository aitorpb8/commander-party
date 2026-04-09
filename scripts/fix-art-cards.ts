import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Basic fetch wrapper for Scryfall
async function fetchRealCard(name: string) {
  try {
    const cleanName = name.split('//')[0].trim();
    const encodedName = encodeURIComponent(`!"${cleanName}" -is:extra -is:artseries -layout:token`);
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodedName}&order=eur&dir=asc`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch (err) {
    return null;
  }
}

async function fixArtCards() {
  console.log('Fetching all deck cards that might be Art Cards/Tokens...');
  
  const { data: cardsToFix, error } = await supabase
    .from('deck_cards')
    .select('*')
    .or('type_line.eq.Card,type_line.eq.Card // Card,card_name.like.%//%');

  if (error) {
    console.error('Error fetching deck_cards', error);
    return;
  }

  console.log(`Found ${cardsToFix.length} problematic cards across decks.`);

  for (const card of cardsToFix) {
    console.log(`Fixing: ${card.card_name} (ID: ${card.id})`);
    const realCard = await fetchRealCard(card.card_name);
    
    if (realCard) {
      console.log(` -> Found real version: ${realCard.id} (${realCard.set.toUpperCase()})`);
      
      const updateData = {
        scryfall_id: realCard.id,
        card_name: realCard.name,
        image_url: realCard.image_uris?.normal || realCard.card_faces?.[0]?.image_uris?.normal || null,
        back_image_url: realCard.card_faces?.[1]?.image_uris?.normal || null,
        oracle_text: realCard.oracle_text || realCard.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null,
        type_line: realCard.type_line,
        mana_cost: realCard.mana_cost,
        set_code: realCard.set,
        set_name: realCard.set_name
      };

      const { error: updateError } = await supabase.from('deck_cards').update(updateData).eq('id', card.id);
      if (updateError) {
          console.error(` -> FAILED UPDATE for ${card.card_name}:`, updateError);
      }
      
      // Also fix deck_upgrades where this card was added
      // We look for any upgrade in the same deck where card_in matches The card name
      const { data: upgrades } = await supabase
         .from('deck_upgrades')
         .select('id, card_in, scryfall_id')
         .eq('deck_id', card.deck_id)
         .ilike('card_in', card.card_name);
         
      if (upgrades && upgrades.length > 0) {
         for (const up of upgrades) {
             if (up.scryfall_id === card.scryfall_id || !up.scryfall_id) {
                 await supabase.from('deck_upgrades').update({ scryfall_id: realCard.id }).eq('id', up.id);
                 console.log(`   -> Also fixed upgrade log entry ${up.id}`);
             }
         }
      }
      
    } else {
      console.log(` -> WARNING: Could not find real version for ${card.card_name}`);
    }
    
    // Scryfall rate limit compliance (10 fetches per second max)
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('Finished fixing cards!');
}

fixArtCards();
