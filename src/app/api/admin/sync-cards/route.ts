import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { createClient } from '@/lib/supabase/server';
import { fetchPreconCardsFromUrl, savePreconDecklist } from '@/lib/precon-sync';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email !== 'aitoor91@gmail.com') {
      return apiError('Unauthorized: Admin access required', 403);
    }

    const { name, url, commander } = await req.json();
    
    if (!name || !url) {
      return apiError('Name and URL are required', 400);
    }

    const cards = await fetchPreconCardsFromUrl(url, commander);

    if (!cards || cards.length === 0) {
      return apiError(`No se pudieron obtener cartas desde la URL: ${url}`, 422);
    }

    await savePreconDecklist(name, cards);

    const totalCards = cards.reduce((acc, c) => acc + (c.quantity || 1), 0);

    return NextResponse.json({
      success: true,
      name,
      cardEntries: cards.length,
      totalCards
    });
  } catch (error: any) {
    console.error('Error syncing precon cards:', error);
    return apiError(error.message, 500);
  }
}
