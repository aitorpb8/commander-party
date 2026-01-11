
import { createClient } from '../src/lib/supabaseClient';

async function updateSchema() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_string: 'ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS back_image_url TEXT;' 
  });

  if (error) {
    console.log('Error updating schema:', error.message);
    // If RPC is not available, we might not be able to do this.
  } else {
    console.log('Schema updated successfully:', data);
  }
}

updateSchema();
