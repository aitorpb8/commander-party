import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = '52dda415-7c98-47d3-9eb7-48d132d49a14';
const RESTORE_DECK_ID = '90868bba-024e-413b-8a15-8203ca42b2e7';
const ACCIDENTAL_DECK_ID = 'bd8c48da-5d05-416f-b2b6-840e0d1bb3db';
const AUDITED_BUDGET = 48.40;

async function restore() {
  console.log('--- INICIANDO RESTAURACIÓN DE MAZO DE BETUSTO ---');

  // 1. Eliminar el mazo accidental (Counter Blitz / Tidus)
  console.log(`1. Eliminando mazo accidental (${ACCIDENTAL_DECK_ID})...`);
  const { error: delErr } = await supabase.from('decks').delete().eq('id', ACCIDENTAL_DECK_ID);
  if (delErr) {
    console.error('Error al borrar mazo accidental:', delErr.message);
  } else {
    console.log('✅ Mazo accidental eliminado.');
  }

  // 2. Cargar cartas del precon
  const preconListsPath = path.join(__dirname, '../src/data/precon-decklists.json');
  const decklists = JSON.parse(fs.readFileSync(preconListsPath, 'utf8'));
  const cards = decklists['Limit Break'] || [];
  console.log(`2. Cartas precon encontradas: ${cards.length}`);

  const preconCardNames = cards.map((c: any) => c.name);

  // 3. Crear el mazo restaurado con su ID original
  console.log(`3. Insertando mazo Limit Break (ID: ${RESTORE_DECK_ID})...`);
  const { data: deck, error: deckErr } = await supabase.from('decks').insert({
    id: RESTORE_DECK_ID,
    user_id: USER_ID,
    name: 'Limit Break',
    commander: 'Cloud, Ex-SOLDIER',
    image_url: 'https://cards.scryfall.io/normal/front/0/7/07b4e4f8-6a31-4533-be51-668ce3ddc84f.jpg?1752052926',
    budget_spent: AUDITED_BUDGET,
    budget_limit: 10.0,
    archidekt_id: '13106990',
    moxfield_id: null,
    precon_url: 'https://archidekt.com/decks/13106990/limit_break_final_fantasy_commander',
    precon_cards: preconCardNames,
    created_at: '2026-01-12T05:45:20.000000+00:00',
    deleted_at: null
  }).select().single();

  if (deckErr) {
    console.error('Error al restaurar mazo:', deckErr.message);
    return;
  }
  console.log('✅ Mazo creado:', deck.name, deck.id);

  // 4. Insertar las 91 cartas precon en deck_cards
  console.log(`4. Insertando ${cards.length} cartas en deck_cards...`);
  const deckCards = cards.map((c: any) => ({
    deck_id: RESTORE_DECK_ID,
    card_name: c.name,
    quantity: c.quantity || 1,
    is_commander: c.is_commander || false,
    type_line: c.type_line || null,
    mana_cost: c.mana_cost || null,
    image_url: c.image_url || null
  }));

  const { error: cardsErr } = await supabase.from('deck_cards').insert(deckCards);
  if (cardsErr) {
    console.error('Error al insertar cartas:', cardsErr.message);
  } else {
    console.log(`✅ ${deckCards.length} cartas insertadas correctamente.`);
  }

  // 5. Insertar la mejora contable para cuadrar el presupuesto exacto (48.40€)
  console.log(`5. Insertando registro de upgrades por ${AUDITED_BUDGET}€...`);
  const { error: upErr } = await supabase.from('deck_upgrades').insert({
    deck_id: RESTORE_DECK_ID,
    month: '2026-06',
    card_in: 'Mejoras acumuladas temporada (restauración)',
    card_out: null,
    cost: AUDITED_BUDGET,
    description: 'Presupuesto acumulado auditado a Junio 2026 (restauración de mazo)'
  });

  if (upErr) {
    console.error('Error al insertar upgrade:', upErr.message);
  } else {
    console.log('✅ Upgrade consolidado registrado.');
  }

  // 6. Actualizar perfil del usuario con su main_deck_id
  console.log(`6. Actualizando perfil de Betusto con su mazo principal...`);
  const { error: profErr } = await supabase.from('profiles').update({
    main_deck_id: RESTORE_DECK_ID
  }).eq('id', USER_ID);

  if (profErr) {
    console.error('Error al actualizar perfil:', profErr.message);
  } else {
    console.log('✅ Perfil actualizado con main_deck_id.');
  }

  console.log('\n🎉 ¡RESTAURACIÓN COMPLETADA CON ÉXITO!');
}

restore();
