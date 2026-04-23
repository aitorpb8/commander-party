import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDeck(deckId: string) {
    console.log(`\n🔍 AUDITANDO MAZO: ${deckId}\n`);

    // 1. Obtener datos del mazo
    const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId)
        .single();

    if (deckError) {
        console.error('❌ Error al obtener el mazo:', deckError.message);
        return;
    }

    console.log(`📋 Nombre: ${deck.name}`);
    console.log(`💰 Presupuesto en DB: ${deck.budget_spent}€`);
    console.log(`📅 Creado: ${deck.created_at}`);

    const preconCards = new Set((deck.precon_cards || []).map((n: string) => n.toLowerCase().trim()));
    console.log(`📦 Cartas en Precon: ${preconCards.size}`);

    // 2. Obtener mejoras
    const { data: upgrades, error: upError } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('deck_id', deckId)
        .order('month', { ascending: true });

    if (upError) {
        console.error('❌ Error al obtener mejoras:', upError.message);
        return;
    }

    console.log(`\n🚀 ANALIZANDO ${upgrades.length} MEJORAS:\n`);
    
    let calculatedTotal = 0;
    const monthlyTotals: Record<string, number> = {};

    upgrades.forEach((u, i) => {
        const nameIn = (u.card_in || '').toLowerCase().trim();
        const isPrecon = nameIn && preconCards.has(nameIn);
        const cost = parseFloat(u.cost || '0');
        
        let status = '';
        if (isPrecon) {
            status = '🎁 PRECON (0€)';
        } else {
            calculatedTotal += cost;
            monthlyTotals[u.month] = (monthlyTotals[u.month] || 0) + cost;
            status = `💸 +${cost}€`;
        }

        const cardInDisplay = (u.card_in || '---').padEnd(25);
        const cardOutDisplay = (u.card_out || '---').padEnd(25);
        console.log(`[${u.month}] ${cardInDisplay} -> ${cardOutDisplay} | ${status}`);
    });

    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`------------------------------`);
    console.log(`Suma calculada:   ${calculatedTotal.toFixed(2)}€`);
    console.log(`Valor en DB:      ${deck.budget_spent}€`);
    console.log(`Diferencia:       ${(calculatedTotal - deck.budget_spent).toFixed(2)}€`);
    
    console.log(`\n📅 Desglose por meses:`);
    Object.entries(monthlyTotals).forEach(([month, total]) => {
        console.log(` - ${month}: ${total.toFixed(2)}€`);
    });

    if (Math.abs(calculatedTotal - deck.budget_spent) > 0.01) {
        console.log(`\n⚠️  ¡ATENCIÓN! Hay una desincronización detectada.`);
    } else {
        console.log(`\n✅ Los datos son consistentes.`);
    }
}

const targetId = process.argv[2];
if (!targetId) {
    console.log('Uso: npx tsx scripts/audit-deck.ts [ID_DEL_MAZO]');
} else {
    auditDeck(targetId);
}
