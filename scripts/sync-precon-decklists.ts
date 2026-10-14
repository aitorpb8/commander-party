
import fs from 'fs/promises';
import path from 'path';

interface Precon {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}

import { fetchPreconCardsFromUrl, PreconCard } from '../src/lib/precon-sync';

// fetch logic handled by central precon-sync helper

async function sync() {
  const metaPath = path.join(process.cwd(), 'src/data/precons.json');
  const cachePath = path.join(process.cwd(), 'src/data/precon-decklists.json');

  console.log('📖 Reading precons.json...');
  const precons: Precon[] = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  
  console.log('📖 Reading current precon-decklists.json...');
  let decklists: Record<string, PreconCard[]> = {};
  try {
    decklists = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch (e) {
    console.warn('⚠️ No existing decklists file found, starting fresh.');
  }

  console.log('🔄 Checking for updates...\n');

  const force = process.argv.includes('--force');

  for (const precon of precons) {
    const isSupported = precon.url.includes('archidekt.com') || precon.url.includes('moxfield.com');
    if (!isSupported) {
      console.log(`⏩ Skipping ${precon.name} (URL not supported: ${precon.url})`);
      continue;
    }

    if (!force && decklists[precon.name] && decklists[precon.name].length > 0) {
      console.log(`⏩ Skipping "${precon.name}" (Already cached)`);
      continue;
    }

    console.log(`📦 Processing "${precon.name}"...`);
    
    const cards = await fetchPreconCardsFromUrl(precon.url, precon.commander);
    if (cards.length > 0) {
      decklists[precon.name] = cards;
      console.log(`   ✅ Success! Cached ${cards.length} cards.`);
    } else {
      console.log(`   ❌ Failed to fetch cards for ${precon.name}`);
    }
    
    // Rate limit safety
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n💾 Saving results...');
  await fs.writeFile(cachePath, JSON.stringify(decklists, null, 2));
  console.log('✨ Done! Cache synchronized.');
}

sync().catch(console.error);
