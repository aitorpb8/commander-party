import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { name, url, series, commander, year } = await req.json();
    
    if (!name || !url || !commander) {
      return NextResponse.json({ error: 'Name, URL and Commander are required' }, { status: 400 });
    }

    const preconsPath = path.join(process.cwd(), 'src/data/precons.json');
    const content = await fs.readFile(preconsPath, 'utf8');
    const precons = JSON.parse(content);

    // 1. Generate ID/Slug
    const id = `precon-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    // 2. Fetch Commander image from Scryfall
    let imageUrl = "https://cards.scryfall.io/large/front/placeholder.jpg";
    try {
      const scryRes = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commander)}`);
      if (scryRes.ok) {
        const scryData = await scryRes.json();
        imageUrl = scryData.image_uris?.large || scryData.image_uris?.normal || imageUrl;
      }
    } catch (e) {
      console.error('Error fetching scryfall image:', e);
    }
    
    const newPrecon = {
      id,
      name,
      commander,
      imageUrl,
      url,
      series: series || "Manual",
      year: year || new Date().getFullYear()
    };

    precons.unshift(newPrecon);
    await fs.writeFile(preconsPath, JSON.stringify(precons, null, 2));

    return NextResponse.json({ success: true, precon: newPrecon });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

