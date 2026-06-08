import { NextResponse } from 'next/server';

const SCRYFALL_API = "https://api.scryfall.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Scryfall /cards/collection expects { identifiers: [...] }
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'CommanderParty/1.0 (contact: aitorpb8@example.com)',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      try {
        const errorData = await res.json();
        return NextResponse.json({ error: errorData.details || `Scryfall API Error: ${res.statusText}` }, { status: res.status });
      } catch {
        return NextResponse.json({ error: `Scryfall API Error: ${res.statusText}` }, { status: res.status });
      }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scryfall Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
