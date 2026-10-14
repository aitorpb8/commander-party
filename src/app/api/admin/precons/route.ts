import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { apiError } from '@/lib/api-error';
import { Precon } from '@/types';

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email !== 'aitoor91@gmail.com') {
      return apiError('Unauthorized: Admin access required', 403);
    }

    const metaPath = path.join(process.cwd(), 'src/data/precons.json');
    const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');

    const content = await fs.readFile(metaPath, 'utf8');
    const precons: Precon[] = JSON.parse(content);

    let decklists: Record<string, any[]> = {};
    try {
      const cacheContent = await fs.readFile(cachePath, 'utf8');
      decklists = JSON.parse(cacheContent);
    } catch {
      decklists = {};
    }

    const preconsWithStats = precons.map(p => {
      const cards = decklists[p.name];
      const isCached = Array.isArray(cards) && cards.length > 0;
      const cardEntries = isCached ? cards.length : 0;
      const totalCards = isCached ? cards.reduce((acc, c) => acc + (c.quantity || 1), 0) : 0;
      return {
        ...p,
        isCached,
        cardEntries,
        totalCards
      };
    });

    const response = NextResponse.json(preconsWithStats);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error: any) {
    const response = apiError(error.message, 500);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

