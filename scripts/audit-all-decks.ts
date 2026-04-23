import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditAllDecks() {
    console.log(`\n🚀 INICIANDO AUDITORÍA GLOBAL DE MAZOS\n`);

    // 1. Obtener todos los mazos
    const { data: decks, error: deckError } = await supabase
        .from('decks')
        .select('id, name, budget_spent, precon_cards, profiles!user_id(username)');

    if (deckError) {
        console.error('Error al obtener mazos:', deckError.message);
        return;
    }

    // 2. Obtener todas las mejoras de una vez para optimizar
    const { data: allUpgrades, error: upError } = await supabase
        .from('deck_upgrades')
        .select('*');

    if (upError) {
        console.error('Error al obtener mejoras:', upError.message);
        return;
    }

    console.log(`${'MAZO'.padEnd(30)} | ${'JUGADOR'.padEnd(15)} | ${'DB'.padEnd(10)} | ${'REAL'.padEnd(10)} | ${'ESTADO'}`);
    console.log('-'.repeat(90));

    let issuesCount = 0;

    decks.forEach(deck => {
        const preconCards = new Set((deck.precon_cards || []).map((n: string) => n.toLowerCase().trim()));
        const deckUpgrades = allUpgrades.filter(u => u.deck_id === deck.id);
        
        const calculatedTotal = deckUpgrades.reduce((sum, u) => {
            const nameIn = (u.card_in || '').toLowerCase().trim();
            const isPrecon = nameIn && preconCards.has(nameIn);
            if (isPrecon) return sum;
            return sum + parseFloat(u.cost || '0');
        }, 0);

        const dbTotal = parseFloat(deck.budget_spent || '0');
        const diff = Math.abs(calculatedTotal - dbTotal);
        
        let status = '✅ OK';
        if (diff > 0.01) {
            status = `❌ ERROR (${(calculatedTotal - dbTotal).toFixed(2)}€)`;
            issuesCount++;
        }

        const username = Array.isArray(deck.profiles) 
            ? (deck.profiles[0]?.username || '---') 
            : ((deck.profiles as any)?.username || '---');

        console.log(`${deck.name.substring(0, 30).padEnd(30)} | ${username.padEnd(15)} | ${dbTotal.toFixed(2).padEnd(10)} | ${calculatedTotal.toFixed(2).padEnd(10)} | ${status}`);
    });

    console.log(`\n------------------------------------------------------------------------------------------`);
    console.log(`✅ Auditoría finalizada. Mazos revisados: ${decks.length}. Problemas detectados: ${issuesCount}.`);
    
    if (issuesCount > 0) {
        console.log(`\n💡 Nota: Los errores se corregirán automáticamente cuando los usuarios visiten sus mazos en la web.`);
    }
}

auditAllDecks();
