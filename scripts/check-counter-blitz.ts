import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounterBlitz() {
   const { data: deck } = await supabase.from('decks').select('id').ilike('name', '%counter blitz%').single();
   if (!deck) {
       console.log('Deck not found');
       return;
   }
   
   const { data: cards } = await supabase.from('deck_cards').select('card_name, type_line, scryfall_id, oracle_text').eq('deck_id', deck.id);
   
   console.log('Suspicious cards:');
   for (const c of cards || []) {
      if (!c.type_line || c.type_line === 'Card' || c.card_name.includes('//') || !c.oracle_text || c.type_line.includes('Token')) {
          console.log(`- ${c.card_name} | Type: ${c.type_line} | Oracle: ${c.oracle_text?.substring(0, 10)}`);
      }
   }
}
checkCounterBlitz();
