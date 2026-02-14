import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: "Missing 'path' parameter" }, { status: 400 });
  }

  try {
    const scryfallUrl = `https://api.scryfall.com/${path.startsWith('/') ? path.slice(1) : path}`;
    
    // Forward all other search params except 'path'
    const finalUrl = new URL(scryfallUrl);
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        finalUrl.searchParams.append(key, value);
      }
    });

    const res = await fetch(finalUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour by default
    });

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: `Scryfall API Error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scryfall Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
