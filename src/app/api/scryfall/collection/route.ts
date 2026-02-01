import { NextResponse } from 'next/server';

const SCRYFALL_API = "https://api.scryfall.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Scryfall /cards/collection expects { identifiers: [...] }
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Scryfall API Error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scryfall Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
