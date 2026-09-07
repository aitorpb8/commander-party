import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email !== 'aitoor91@gmail.com') {
      return apiError('Unauthorized: Admin access required', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';

    // 1. Obtener mazos
    const { data: decks, error: deckErr } = await supabase
      .from('decks')
      .select('*, profiles!user_id(username)')
      .order('name');

    if (deckErr) throw deckErr;

    // 2. Obtener mejoras
    const { data: upgrades, error: upErr } = await supabase
      .from('deck_upgrades')
      .select('*')
      .order('month', { ascending: true })
      .order('created_at', { ascending: true });

    if (upErr) throw upErr;

    // 3. Obtener cartas
    const { data: cards, error: cardsErr } = await supabase
      .from('deck_cards')
      .select('*')
      .order('card_name');

    if (cardsErr) throw cardsErr;

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const fullSnapshot = {
        exported_at: new Date().toISOString(),
        total_decks: decks?.length || 0,
        total_upgrades: upgrades?.length || 0,
        total_cards: cards?.length || 0,
        decks: (decks || []).map(d => ({
          ...d,
          upgrades: (upgrades || []).filter(u => u.deck_id === d.id),
          cards: (cards || []).filter(c => c.deck_id === d.id)
        }))
      };

      return new NextResponse(JSON.stringify(fullSnapshot, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-liga-${dateStr}.json"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // CSV Format: Mejoras de la Liga
    const csvHeader = 'id,deck_id,deck_name,user,month,card_in,card_out,cost,description,created_at\n';
    const csvRows = (upgrades || []).map(u => {
      const deck = (decks || []).find(d => d.id === u.deck_id);
      const username = (deck?.profiles as any)?.username || 'Desconocido';
      const deckName = (deck?.name || 'Mazo').replace(/"/g, '""');
      const cardIn = (u.card_in || '').replace(/"/g, '""');
      const cardOut = (u.card_out || '').replace(/"/g, '""');
      const desc = (u.description || '').replace(/"/g, '""');
      return `"${u.id}","${u.deck_id}","${deckName}","${username}","${u.month || ''}","${cardIn}","${cardOut}",${u.cost || 0},"${desc}","${u.created_at || ''}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mejoras-liga-${dateStr}.csv"`,
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
