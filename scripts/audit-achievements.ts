import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import * as dotenv from 'dotenv';
import { calculateAchievements } from '../src/lib/achievements';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditAchievements() {
    console.log(`\n🏆 AUDITORÍA GLOBAL DE LOGROS Y MEDALLAS\n`);

    // 1. Cargar todos los datos necesarios
    const { data: profiles } = await supabase.from('profiles').select('id, username');
    const { data: decks } = await supabase.from('decks').select('*');
    const { data: upgrades } = await supabase.from('deck_upgrades').select('*');
    const { data: matches } = await supabase.from('matches').select('*');

    if (!profiles || !decks || !upgrades || !matches) {
        console.error('Error al cargar datos de la base de datos.');
        return;
    }

    console.log(`${'JUGADOR'.padEnd(20)} | ${'MAZOS'.padEnd(6)} | ${'PARTIDAS'.padEnd(9)} | ${'MEDALLAS'}`);
    console.log('-'.repeat(80));

    profiles.forEach(profile => {
        const userAchievements = calculateAchievements({
            decks,
            upgrades,
            matches,
            userId: profile.id
        });

        const badgesCount = userAchievements.length;
        const badgesNames = userAchievements.map(a => a.name).join(', ');
        const userDecksCount = decks.filter(d => d.user_id === profile.id).length;
        const userMatchesCount = matches.filter(m => m.players?.includes(profile.id)).length;

        console.log(`${(profile.username || '---').padEnd(20)} | ${String(userDecksCount).padEnd(6)} | ${String(userMatchesCount).padEnd(9)} | ${badgesNames || 'Ninguna'}`);
    });

    console.log(`\n✅ Auditoría de logros finalizada.`);
}

auditAchievements();
