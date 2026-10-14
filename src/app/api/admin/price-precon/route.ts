import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { apiError } from '@/lib/api-error';
import { createClient } from '@/lib/supabase/server';
import { calculatePreconPrice } from '@/lib/precon-sync';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email !== 'aitoor91@gmail.com') {
      return apiError('Unauthorized: Admin access required', 403);
    }

    const { preconName } = await req.json();

    const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');
    const content = await fs.readFile(cachePath, 'utf8');
    const decklists = JSON.parse(content);

    const cards = decklists[preconName];
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return apiError(`No hay cartas cacheadas para ${preconName}`, 404);
    }

    const prices = await calculatePreconPrice(cards);

    return NextResponse.json({
      success: true,
      preconName,
      prices
    });
  } catch (error: any) {
    return apiError(error.message, 500);
  }
}
