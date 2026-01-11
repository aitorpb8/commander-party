import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { preconName, cards } = await request.json();
    
    if (!preconName || !cards) {
      return NextResponse.json({ error: 'Missing preconName or cards' }, { status: 400 });
    }

    const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');
    
    // Read current data
    let decklists: Record<string, any[]> = {};
    try {
      const content = await fs.readFile(cachePath, 'utf8');
      decklists = JSON.parse(content);
    } catch (e) {
      console.warn('Starting fresh decklists file');
    }

    // Update with new cards
    decklists[preconName] = cards;

    // Save back
    await fs.writeFile(cachePath, JSON.stringify(decklists, null, 2));

    const response = NextResponse.json({ success: true, count: cards.length });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  } catch (error: any) {
    console.error('Save error:', error);
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

