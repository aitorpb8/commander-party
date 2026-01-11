import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const metaPath = path.join(process.cwd(), 'src/data/precons.json');
    const content = await fs.readFile(metaPath, 'utf8');
    const response = NextResponse.json(JSON.parse(content));
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error: any) {
    const response = NextResponse.json({ error: error.message }, { status: 500 });
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

