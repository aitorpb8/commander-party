import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPreconDiff(deckId: string) {
    // 1. Cargar lista maestra
    const masterDecklists = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/precon-decklists.json'), 'utf8'));
    const masterList = masterDecklists["Planeswalker Party"].map((c: any) => c.name.toLowerCase().trim());
    const masterSet = new Set(masterList);

    // 2. Obtener lista del mazo del usuario
    const { data: deck, error } = await supabase
        .from('decks')
        .select('name, precon_cards')
        .eq('id', deckId)
        .single();

    if (error || !deck) {
        console.error('Error:', error?.message);
        return;
    }

    const userPreconList = (deck.precon_cards || []).map((n: string) => n.toLowerCase().trim());
    const userPreconSet = new Set(userPreconList);

    console.log(`\n📊 COMPARANDO PRECON PARA: ${deck.name}`);
    console.log(`-------------------------------------------`);
    console.log(`Maestro: ${masterSet.size} cartas`);
    console.log(`Usuario: ${userPreconSet.size} cartas`);

    const missingInUser = [...masterSet].filter(name => !userPreconSet.has(name));
    const extraInUser = [...userPreconSet].filter(name => !masterSet.has(name));

    if (missingInUser.length > 0) {
        console.log(`\n❌ CARTAS QUE LE FALTAN AL USUARIO EN SU LISTA DE PRECON (${missingInUser.length}):`);
        missingInUser.forEach(name => console.log(` - ${name}`));
    }

    if (extraInUser.length > 0) {
        console.log(`\n❓ CARTAS EXTRA EN LA LISTA DEL USUARIO (No son del precon oficial) (${extraInUser.length}):`);
        extraInUser.forEach(name => console.log(` - ${name}`));
    }

    if (missingInUser.length === 0 && extraInUser.length === 0) {
        console.log(`\n✅ La lista es idéntica al maestro.`);
    }
}

const targetId = process.argv[2];
if (!targetId) {
    console.log('Uso: npx tsx scripts/check-precon-diff.ts [ID_DEL_MAZO]');
} else {
    checkPreconDiff(targetId);
}
