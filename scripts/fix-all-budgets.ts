import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllBudgets() {
    console.log(`\n🔧 INICIANDO REPARACIÓN MASIVA DE PRESUPUESTOS\n`);

    const { data: decks, error: deckError } = await supabase
        .from('decks')
        .select('id, name, budget_spent, precon_cards');

    if (deckError) {
        console.error('Error:', deckError.message);
        return;
    }

    const { data: allUpgrades } = await supabase.from('deck_upgrades').select('*');

    for (const deck of decks) {
        const preconCards = new Set((deck.precon_cards || []).map((n: string) => n.toLowerCase().trim()));
        const deckUpgrades = (allUpgrades || []).filter(u => u.deck_id === deck.id);
        
        const calculatedTotal = deckUpgrades.reduce((sum, u) => {
            const nameIn = (u.card_in || '').toLowerCase().trim();
            const isPrecon = nameIn && preconCards.has(nameIn);
            if (isPrecon) return sum;
            return sum + Number(u.cost || 0);
        }, 0);

        if (Math.abs(calculatedTotal - deck.budget_spent) > 0.01) {
            console.log(`Updating ${deck.name}: ${deck.budget_spent}€ -> ${calculatedTotal}€`);
            await supabase.from('decks').update({ budget_spent: calculatedTotal }).eq('id', deck.id);
        }
    }

    console.log(`\n✅ Reparación completada.`);
}

fixAllBudgets();
