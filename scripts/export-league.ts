import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportLeague() {
  console.log('📦 Exportando datos completos de la liga...\n');

  // 1. Obtener todos los mazos activos con usuario
  const { data: decks, error: deckErr } = await supabase
    .from('decks')
    .select('*, profiles!user_id(username)')
    .order('name');

  if (deckErr) {
    console.error('Error al obtener mazos:', deckErr.message);
    return;
  }

  // 2. Obtener todas las mejoras
  const { data: upgrades, error: upErr } = await supabase
    .from('deck_upgrades')
    .select('*')
    .order('month', { ascending: true })
    .order('created_at', { ascending: true });

  if (upErr) {
    console.error('Error al obtener mejoras:', upErr.message);
    return;
  }

  // 3. Obtener todas las cartas de los mazos
  const { data: cards, error: cardsErr } = await supabase
    .from('deck_cards')
    .select('*')
    .order('card_name');

  if (cardsErr) {
    console.error('Error al obtener cartas:', cardsErr.message);
    return;
  }

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // A. Generar CSV de Mejoras de la Liga
  const csvUpgradesHeader = 'id,deck_id,deck_name,user,month,card_in,card_out,cost,description,created_at\n';
  const csvUpgradesRows = (upgrades || []).map(u => {
    const deck = decks.find(d => d.id === u.deck_id);
    const username = (deck?.profiles as any)?.username || 'Desconocido';
    const deckName = (deck?.name || 'Mazo sin nombre').replace(/"/g, '""');
    const cardIn = (u.card_in || '').replace(/"/g, '""');
    const cardOut = (u.card_out || '').replace(/"/g, '""');
    const desc = (u.description || '').replace(/"/g, '""');
    return `"${u.id}","${u.deck_id}","${deckName}","${username}","${u.month || ''}","${cardIn}","${cardOut}",${u.cost || 0},"${desc}","${u.created_at || ''}"`;
  }).join('\n');

  const csvUpgradesPath = path.join(backupDir, `mejoras-liga-${dateStr}.csv`);
  fs.writeFileSync(csvUpgradesPath, '\uFEFF' + csvUpgradesHeader + csvUpgradesRows, 'utf8');
  console.log(`✅ CSV de Mejoras generado: ${csvUpgradesPath} (${upgrades.length} registros)`);

  // B. Generar CSV de Resumen de Mazos
  const csvDecksHeader = 'id,name,commander,user,budget_spent,budget_limit,archidekt_id,cards_count,deleted_at\n';
  const csvDecksRows = decks.map(d => {
    const username = (d.profiles as any)?.username || 'Desconocido';
    const deckCardsCount = (cards || []).filter(c => c.deck_id === d.id).length;
    return `"${d.id}","${(d.name || '').replace(/"/g, '""')}","${(d.commander || '').replace(/"/g, '""')}","${username}",${d.budget_spent || 0},${d.budget_limit || 10},"${d.archidekt_id || ''}",${deckCardsCount},"${d.deleted_at || ''}"`;
  }).join('\n');

  const csvDecksPath = path.join(backupDir, `mazos-liga-${dateStr}.csv`);
  fs.writeFileSync(csvDecksPath, '\uFEFF' + csvDecksHeader + csvDecksRows, 'utf8');
  console.log(`✅ CSV de Mazos generado: ${csvDecksPath} (${decks.length} mazos)`);

  // C. Generar JSON Snapshot Completo
  const fullSnapshot = {
    exported_at: new Date().toISOString(),
    total_decks: decks.length,
    total_upgrades: upgrades.length,
    total_cards: cards.length,
    decks: decks.map(d => ({
      ...d,
      upgrades: (upgrades || []).filter(u => u.deck_id === d.id),
      cards: (cards || []).filter(c => c.deck_id === d.id)
    }))
  };

  const jsonPath = path.join(backupDir, `backup-completo-liga-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fullSnapshot, null, 2), 'utf8');
  console.log(`✅ Snapshot JSON Completo generado: ${jsonPath}`);
  console.log('\n🎉 ¡Respaldo completado con éxito!');
}

exportLeague();
