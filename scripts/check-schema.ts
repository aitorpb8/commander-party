
import { createClient } from '../src/lib/supabaseClient';

async function checkSchema() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deck_cards')
    .select('board_type')
    .limit(1);

  if (error) {
    console.log('Error checking schema:', error.message);
  } else {
    console.log('Schema check result:', data);
  }
}

checkSchema();
