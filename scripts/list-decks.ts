import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listDecks() {
    console.log(`\n🎴 LISTADO DE MAZOS EN LA LIGA\n`);
    
    const { data: decks, error } = await supabase
        .from('decks')
        .select('id, name, profiles(username)')
        .order('name');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`${'NOMBRE DEL MAZO'.padEnd(30)} | ${'JUGADOR'.padEnd(15)} | ${'ID DEL MAZO'}`);
    console.log('-'.repeat(85));
    
    decks.forEach((d: any) => {
        const username = Array.isArray(d.profiles) 
            ? (d.profiles[0]?.username || 'Sin usuario') 
            : (d.profiles?.username || 'Sin usuario');
        console.log(`${d.name.substring(0, 30).padEnd(30)} | ${username.padEnd(15)} | ${d.id}`);
    });
    console.log('\n');
}

listDecks();
