import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { apiError } from '@/lib/api-error';
import { Precon } from '@/types';

export async function GET() {
  try {
    const metaPath = path.join(process.cwd(), 'src/data/precons.json');
    const content = await fs.readFile(metaPath, 'utf8');
    const precons: Precon[] = JSON.parse(content);
    const response = NextResponse.json(precons);
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

