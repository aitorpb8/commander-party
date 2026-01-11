export {};
/**
 * Complete Commander Precon Generator (2011-2025+)
 * 
 * Generates:
 * 1. precons.json: Metadata for 148 decks.
 * 2. precon-decklists.json: Cached card lists for 2019-2025 decks.
 */

interface PreconData {
  name: string;
  commander: string;
  series: string;
  year: number;
  archidektId?: string;
  moxfieldId?: string;
}

interface Card {
  name: string;
  quantity: number;
  is_commander: boolean;
  type_line?: string;
  mana_cost?: string;
  image_url?: string;
  oracle_text?: string;
}

const PRECONS_2025: PreconData[] = [
  // Edge of Eternities (Aug 2025)
  { name: 'Counter Intelligence', commander: 'Inspirit, Flagship Vessel', series: 'Edge of Eternities', year: 2025, archidektId: '9545201' },
  { name: 'World Shaper', commander: 'Hearthhull, the Worldseed', series: 'Edge of Eternities', year: 2025, archidektId: '9545202' },
  
  // Final Fantasy (June 2025)
  { name: 'Revival Trance', commander: 'Terra, Herald of Hope', series: 'Final Fantasy', year: 2025, archidektId: '9445101' },
  { name: 'Limit Break', commander: 'Cloud, Ex-SOLDIER', series: 'Final Fantasy', year: 2025, archidektId: '9445102' },
  { name: 'Counter Blitz', commander: 'Tidus, Yuna\'s Guardian', series: 'Final Fantasy', year: 2025, archidektId: '9445103' },
  { name: 'Scions & Spellcraft', commander: 'Y\'shtola, Night\'s Blessed', series: 'Final Fantasy', year: 2025, archidektId: '9445104' },
  
  // Tarkir: Dragonstorm (April 2025)
  { name: 'Abzan Armor', commander: 'Felothar the Steadfast', series: 'Tarkir: Dragonstorm', year: 2025, archidektId: '9345125' },
  { name: 'Jeskai Striker', commander: 'Shiko and Narset, Unified', series: 'Tarkir: Dragonstorm', year: 2025, archidektId: '4190825' },
  { name: 'Mardu Surge', commander: 'Zurgo Stormrender', series: 'Tarkir: Dragonstorm', year: 2025, archidektId: '5640813' },
  { name: 'Temur Roar', commander: 'Eshki, Temur\'s Roar', series: 'Tarkir: Dragonstorm', year: 2025, archidektId: '9345124' },
  { name: 'Sultai Arisen', commander: 'Teval, the Balanced Scale', series: 'Tarkir: Dragonstorm', year: 2025, archidektId: '9345123' },
  
  // Aetherdrift (Feb 2025)
  { name: 'Eternal Might', commander: 'Temmet, Naktamun\'s Will', series: 'Aetherdrift', year: 2025, archidektId: '9545464' },
  { name: 'Living Energy', commander: 'Saheeli, Radiant Creator', series: 'Aetherdrift', year: 2025, archidektId: '9545417' },
  
  // Secret Lair / Others
  { name: 'Everyone\'s Invited!', commander: 'Morophon, the Boundless', series: 'Secret Lair', year: 2025, archidektId: '9645301' },
];

const PRECONS_2024: PreconData[] = [
  { name: 'Death Toll', commander: 'Winter, Cynical Opportunist', series: 'Duskmourn', year: 2024, archidektId: '8877292' },
  { name: 'Endless Punishment', commander: 'Valgavoth, Harrower of Souls', series: 'Duskmourn', year: 2024, archidektId: '8877264' },
  { name: 'Miracle Worker', commander: 'Aminatou, Veil Piercer', series: 'Duskmourn', year: 2024, archidektId: '8877232' },
  { name: 'Jump Scare!', commander: 'Zimone, Mystery Unraveler', series: 'Duskmourn', year: 2024, archidektId: '8877328' },
  { name: 'Squirreled Away', commander: 'Hazel of the Rootbloom', series: 'Bloomburrow', year: 2024, archidektId: '8389736' },
  { name: 'Animated Army', commander: 'Bello, Bard of the Brambles', series: 'Bloomburrow', year: 2024, archidektId: '8389692' },
  { name: 'Family Matters', commander: "Zinnia, Valley's Voice", series: 'Bloomburrow', year: 2024, archidektId: '8389656' },
  { name: 'Peace Offering', commander: 'Ms. Bumbleflower', series: 'Bloomburrow', year: 2024, archidektId: '8389652' },
  { name: 'Graveyard Overdrive', commander: 'Satya, Aetherflux Genius', series: 'Modern Horizons 3', year: 2024, archidektId: '7876356' },
  { name: 'Tricky Terrain', commander: 'Omo, Queen of Vesuva', series: 'Modern Horizons 3', year: 2024, archidektId: '7876328' },
  { name: 'Eldrazi Incursion', commander: 'Ulalek, Fused Atrocity', series: 'Modern Horizons 3', year: 2024, archidektId: '7876342' },
  { name: 'Creative Energy', commander: 'Cayth, Famed Mechanist', series: 'Modern Horizons 3', year: 2024, archidektId: '7876311' },
  { name: 'Quick Draw', commander: 'Stella Lee, Wild Card', series: 'Outlaws of Thunder Junction', year: 2024, archidektId: '7412196' },
  { name: 'Desert Bloom', commander: 'Yuma, Proud Protector', series: 'Outlaws of Thunder Junction', year: 2024, archidektId: '7412164' },
  { name: 'Grand Larceny', commander: 'Gonti, Canny Acquisitor', series: 'Outlaws of Thunder Junction', year: 2024, archidektId: '7412142' },
  { name: 'Most Wanted', commander: 'Vihaan, Goldwaker', series: 'Outlaws of Thunder Junction', year: 2024, archidektId: '7412218' },
  { name: 'Scrappy Survivors', commander: 'Dogmeat, Ever Loyal', series: 'Fallout', year: 2024, archidektId: '7086816' },
  { name: 'Science!', commander: 'Dr. Madison Li', series: 'Fallout', year: 2024, archidektId: '7086835' },
  { name: 'Hail, Caesar', commander: "Caesar, Legion's Emperor", series: 'Fallout', year: 2024, archidektId: '7086782' },
  { name: 'Mutant Menace', commander: 'The Wise Mothman', series: 'Fallout', year: 2024, archidektId: '7086754' },
  { name: 'Blame Game', commander: 'Nelly Borca, Impulsive Accuser', series: 'Murders at Karlov Manor', year: 2024, archidektId: '6811444' },
  { name: 'Deadly Disguise', commander: 'Kaust, Eyes of the Glade', series: 'Murders at Karlov Manor', year: 2024, archidektId: '6811352' },
  { name: 'Revenant Recon', commander: "Mirko, Obsessive Theorist", series: 'Murders at Karlov Manor', year: 2024, archidektId: '6811402' },
  { name: 'Deep Clue Sea', commander: 'Morska, Undersea Sleuth', series: 'Murders at Karlov Manor', year: 2024, archidektId: '6811306' },
];

const PRECONS_2023: PreconData[] = [
  { name: 'Ahoy Mateys', commander: "Admiral Brass, Unsinkable", series: 'Lost Caverns of Ixalan', year: 2023, archidektId: '5791336' },
  { name: 'Explorers of the Deep', commander: 'Hakbal of the Surging Soul', series: 'Lost Caverns of Ixalan', year: 2023, archidektId: '5791314' },
  { name: 'Blood Rites', commander: 'Clavileño, First of the Blessed', series: 'Lost Caverns of Ixalan', year: 2023, archidektId: '5791322' },
  { name: 'Veloci-Ramp-Tor', commander: 'Pantlaza, Sun-Favored', series: 'Lost Caverns of Ixalan', year: 2023, archidektId: '5791328' },
  { name: 'Blast from the Past', commander: 'The Fourth Doctor', series: 'Doctor Who', year: 2023, archidektId: '5561556' },
  { name: 'Masters of Evil', commander: 'Davros, Dalek Creator', series: 'Doctor Who', year: 2023, archidektId: '5561602' },
  { name: 'Paradox Power', commander: 'The Thirteenth Doctor', series: 'Doctor Who', year: 2023, archidektId: '5561582' },
  { name: 'Timey-Wimey', commander: 'The Tenth Doctor', series: 'Doctor Who', year: 2023, archidektId: '5561496' },
  { name: 'Virtue and Valor', commander: 'Ellivere of the Wild Court', series: 'Wilds of Eldraine', year: 2023, archidektId: '5253304' },
  { name: 'Fae Dominion', commander: 'Tegwyll, Duke of Splendor', series: 'Wilds of Eldraine', year: 2023, archidektId: '5253302' },
  { name: 'Eldrazi Unbound', commander: 'Zhulodok, Void Gorger', series: 'Commander Masters', year: 2023, archidektId: '5034606' },
  { name: 'Enduring Enchantments', commander: 'Anikthea, Hand of Erebos', series: 'Commander Masters', year: 2023, archidektId: '5034612' },
  { name: 'Planeswalker Party', commander: 'Commodore Guff', series: 'Commander Masters', year: 2023, archidektId: '5034602' },
  { name: 'Sliver Swarm', commander: 'Sliver Gravemother', series: 'Commander Masters', year: 2023, archidektId: '5034604' },
  { name: 'Food and Fellowship', commander: 'Frodo, Adventurous Hobbit', series: 'Lord of the Rings', year: 2023, archidektId: '4764834' },
  { name: 'Hosts of Mordor', commander: 'Sauron, the Dark Lord', series: 'Lord of the Rings', year: 2023, archidektId: '4764812' },
  { name: 'Elven Council', commander: 'Galadriel, Elven-Queen', series: 'Lord of the Rings', year: 2023, archidektId: '4764842' },
  { name: 'Riders of Rohan', commander: 'Éowyn, Shieldmaiden', series: 'Lord of the Rings', year: 2023, archidektId: '4764826' },
  { name: 'Growing Threat', commander: 'Brimaz, Blight of Oreskos', series: 'March of the Machine', year: 2023, archidektId: '4337666' },
  { name: 'Cavalry Charge', commander: 'Sidar Jabari of Zhalfir', series: 'March of the Machine', year: 2023, archidektId: '4337656' },
  { name: 'Divine Convocation', commander: 'Kasla, the Broken Halo', series: 'March of the Machine', year: 2023, archidektId: '4337626' },
  { name: 'Call for Backup', commander: 'Bright-Palm, Soul Awakener', series: 'March of the Machine', year: 2023, archidektId: '4337644' },
  { name: 'Tinker Time', commander: 'Gimbal, Gremlin Prodigy', series: 'March of the Machine', year: 2023, archidektId: '4337616' },
  { name: 'Rebellion Rising', commander: "Neyali, Suns' Vanguard", series: 'Phyrexia: All Will Be One', year: 2023, archidektId: '3776512' },
  { name: 'Corrupting Influence', commander: 'Ixhel, Scion of Atraxa', series: 'Phyrexia: All Will Be One', year: 2023, archidektId: '3776492' },
];

const PRECONS_2022: PreconData[] = [
  { name: 'First Flight', commander: 'Isperia, Supreme Judge', series: 'Starter Commander', year: 2022, archidektId: '3448417' },
  { name: 'Grave Danger', commander: 'Gisa and Geralf', series: 'Starter Commander', year: 2022, archidektId: '3448418' },
  { name: "Mishra's Burnished Banner", commander: 'Mishra, Eminent One', series: "The Brothers' War", year: 2022, archidektId: '3448416' },
  { name: "Urza's Iron Alliance", commander: 'Urza, Chief Artificer', series: "The Brothers' War", year: 2022, archidektId: '3448384' },
  { name: 'Tyranid Swarm', commander: 'The Swarmlord', series: 'Warhammer 40,000', year: 2022, archidektId: '3200762' },
  { name: 'Forces of the Imperium', commander: 'Inquisitor Greyfax', series: 'Warhammer 40,000', year: 2022, archidektId: '3200782' },
  { name: 'Necron Dynasties', commander: 'Szarekh, the Silent King', series: 'Warhammer 40,000', year: 2022, archidektId: '3200844' },
  { name: 'The Ruinous Powers', commander: 'Abaddon the Despoiler', series: 'Warhammer 40,000', year: 2022, archidektId: '3200822' },
  { name: 'Painbow', commander: 'Jared Carthalion', series: 'Dominaria United', year: 2022, archidektId: '3049071' },
  { name: "Legends' Legacy", commander: 'Dihada, Binder of Wills', series: 'Dominaria United', year: 2022, archidektId: '3049102' },
  { name: 'Party Time', commander: 'Nalia de\'Arnise', series: "Baldur's Gate", year: 2022, archidektId: '2726332' },
  { name: 'Exit from Exile', commander: 'Faldorn, Dread Wolf Herald', series: "Baldur's Gate", year: 2022, archidektId: '2726322' },
  { name: 'Draconic Dissent', commander: 'Firkraag, Cunning Instigator', series: "Baldur's Gate", year: 2022, archidektId: '2726292' },
  { name: 'Mind Flayarrrs', commander: 'Captain N\'ghathrod', series: "Baldur's Gate", year: 2022, archidektId: '2726262' },
  { name: 'Bedecked Brokers', commander: 'Perrie, the Pulverizer', series: 'Streets of New Capenna', year: 2022, archidektId: '2468305' },
  { name: 'Obscura Operation', commander: 'Kamiz, Obscura Oculus', series: 'Streets of New Capenna', year: 2022, archidektId: '2468245' },
  { name: 'Maestros Massacre', commander: 'Anhelo, the Painter', series: 'Streets of New Capenna', year: 2022, archidektId: '2468255' },
  { name: 'Riveteers Rampage', commander: 'Henzie "Toolbox" Torre', series: 'Streets of New Capenna', year: 2022, archidektId: '2468265' },
  { name: 'Cabaretti Cacophony', commander: 'Kitt Kanto, Mayhem Diva', series: 'Streets of New Capenna', year: 2022, archidektId: '2468275' },
  { name: 'Buckle Up', commander: 'Kotori, Pilot Prodigy', series: 'Kamigawa: Neon Dynasty', year: 2022, archidektId: '2138832' },
  { name: 'Upgrades Unleashed', commander: 'Chishiro, the Shattered Blade', series: 'Kamigawa: Neon Dynasty', year: 2022, archidektId: '2138884' },
];

const PRECONS_2021: PreconData[] = [
  { name: 'Vampiric Bloodline', commander: 'Strefan, Maurer Progenitor', series: 'Innistrad: Crimson Vow', year: 2021, archidektId: '1970251' },
  { name: 'Spirit Squadron', commander: 'Millicent, Restless Revenant', series: 'Innistrad: Crimson Vow', year: 2021, archidektId: '1970221' },
  { name: 'Undead Unleashed', commander: 'Wilhelt, the Rotcleaver', series: 'Innistrad: Midnight Hunt', year: 2021, archidektId: '1790691' },
  { name: 'Coven Counters', commander: 'Leinore, Autumn Sovereign', series: 'Innistrad: Midnight Hunt', year: 2021, archidektId: '1790662' },
  { name: 'Planar Portal', commander: 'Prosper, Tome-Bound', series: 'Forgotten Realms', year: 2021, archidektId: '1540632' },
  { name: 'Lorehold Legacies', commander: 'Osgir, the Reconstructor', series: 'Strixhaven', year: 2021, archidektId: '1224855' },
  { name: 'Prismari Performance', commander: 'Zaffai, Thunder Conductor', series: 'Strixhaven', year: 2021, archidektId: '1224856' },
  { name: 'Quantum Quandrix', commander: 'Adrix and Nev, Twincasters', series: 'Strixhaven', year: 2021, archidektId: '1224857' },
  { name: 'Silverquill Statement', commander: 'Breena, the Demagogue', series: 'Strixhaven', year: 2021, archidektId: '1224858' },
  { name: 'Witherbloom Witchcraft', commander: 'Willowdusk, Essence Seer', series: 'Strixhaven', year: 2021, archidektId: '1224859' },
  { name: 'Phantom Premonition', commander: 'Ranar the Ever-Watchful', series: 'Kaldheim', year: 2021, archidektId: '990521' },
  { name: 'Elven Empire', commander: 'Lathril, Blade of the Elves', series: 'Kaldheim', year: 2021, archidektId: '990231' },
];

const PRECONS_2020: PreconData[] = [
  { name: 'Reap the Tide', commander: 'Aesi, Tyrant of Gyre Strait', series: 'Commander Legends', year: 2020, archidektId: '868121' },
  { name: 'Arm for Battle', commander: 'Wyleth, Soul of Steel', series: 'Commander Legends', year: 2020, archidektId: '868152' },
  { name: 'Arcane Maelstrom', commander: 'Kalamax, the Stormsire', series: 'Ikoria', year: 2020, archidektId: '554361' },
  { name: 'Enhanced Evolution', commander: 'Otrimi, the Ever-Playful', series: 'Ikoria', year: 2020, archidektId: '554362' },
  { name: 'Ruthless Regiment', commander: 'Jirina Kudro', series: 'Ikoria', year: 2020, archidektId: '554363' },
  { name: 'Symbiotic Swarm', commander: 'Kathril, Aspect Warper', series: 'Ikoria', year: 2020, archidektId: '554364' },
  { name: 'Timeless Wisdom', commander: 'Gavi, Nest Warden', series: 'Ikoria', year: 2020, archidektId: '554365' },
];

const PRECONS_2019: PreconData[] = [
  { name: 'Faceless Menace', commander: 'Kadena, Slinking Sorcerer', series: 'Commander 2019', year: 2019, archidektId: '421033' },
  { name: 'Mystic Intellect', commander: 'Sevinne, the Chronoclasm', series: 'Commander 2019', year: 2019, archidektId: '421036' },
  { name: 'Primal Genesis', commander: 'Ghired, Conclave Exile', series: 'Commander 2019', year: 2019, archidektId: '421034' },
  { name: 'Merciless Rage', commander: 'Anje Falkenrath', series: 'Commander 2019', year: 2019, archidektId: '421035' },
];

const PRECONS_HISTO: PreconData[] = [
  { name: 'Subjective Reality', commander: 'Aminatou, the Fateshifter', series: 'Commander 2018', year: 2018, archidektId: '421032' },
  { name: 'Vampiric Bloodlust', commander: 'Edgar Markov', series: 'Commander 2017', year: 2017, archidektId: '38945' },
  { name: 'Breed Lethality', commander: "Atraxa, Praetors' Voice", series: 'Commander 2016', year: 2016, archidektId: '38321' },
  
  // Commander 2015
  { name: 'Call the Spirits', commander: 'Daxos the Returned', series: 'Commander 2015', year: 2015, archidektId: '56370' },
  { name: 'Seize Control', commander: 'Mizzix of the Izmagnus', series: 'Commander 2015', year: 2015, archidektId: '56371' },
  { name: 'Plunder the Graves', commander: 'Meren of Clan Nel Toth', series: 'Commander 2015', year: 2015, archidektId: '56372' },
  { name: 'Wade into Battle', commander: 'Kalemne, Disciple of Iroas', series: 'Commander 2015', year: 2015, archidektId: '56373' },
  { name: 'Swell the Host', commander: 'Ezuri, Claw of Progress', series: 'Commander 2015', year: 2015, archidektId: '56374' },
  
  // Commander 2014
  { name: 'Peer Through Time', commander: 'Teferi, Temporal Archmage', series: 'Commander 2014', year: 2014, archidektId: '56365' },
  { name: 'Forged in Stone', commander: 'Nahiri, the Lithomancer', series: 'Commander 2014', year: 2014, archidektId: '56366' },
  { name: 'Built from Scratch', commander: 'Daretti, Scrap Savant', series: 'Commander 2014', year: 2014, archidektId: '56367' },
  { name: 'Sworn to Darkness', commander: 'Ob Nixilis of the Black Oath', series: 'Commander 2014', year: 2014, archidektId: '56368' },
  { name: 'Guided by Nature', commander: 'Freyalise, Llanowar\'s Fury', series: 'Commander 2014', year: 2014, archidektId: '56369' },
  
  // Commander 2013
  { name: 'Evasive Maneuvers', commander: 'Derevi, Empyrial Tactician', series: 'Commander 2013', year: 2013, archidektId: '56360' },
  { name: 'Eternal Bargain', commander: 'Oloro, Ageless Ascetic', series: 'Commander 2013', year: 2013, archidektId: '56361' },
  { name: 'Nature of the Beast', commander: 'Marath, Will of the Wild', series: 'Commander 2013', year: 2013, archidektId: '56362' },
  { name: 'Power Hungry', commander: 'Prossh, Skyraider of Kher', series: 'Commander 2013', year: 2013, archidektId: '56363' },
  { name: 'Mind Seize', commander: 'Jeleva, Nephalia\'s Scourge', series: 'Commander 2013', year: 2013, archidektId: '56364' },
  
  // Commander 2011
  { name: 'Heavenly Inferno', commander: 'Kaalia of the Vast', series: 'Commander 2011', year: 2011, archidektId: '56350' },
  { name: 'Mirror Mastery', commander: 'Riku of Two Reflections', series: 'Commander 2011', year: 2011, archidektId: '56352' },
  { name: 'Counterpunch', commander: 'Ghave, Guru of Spores', series: 'Commander 2011', year: 2011, archidektId: '56353' },
  { name: 'Devour for Power', commander: 'The Mimeoplasm', series: 'Commander 2011', year: 2011, archidektId: '56354' },
  { name: 'Political Puppets', commander: 'Zedruu the Greathearted', series: 'Commander 2011', year: 2011, archidektId: '56355' },
];

const BROWSER_HEADERS = { 
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function fetchMoxfieldCards(moxfieldId: string): Promise<Card[]> {
  try {
    const response = await fetch(`https://api.moxfield.com/v2/decks/all/${moxfieldId}`, { headers: BROWSER_HEADERS });
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const cards: Card[] = [];

    // Commanders
    if (data.commanders) {
      Object.values(data.commanders).forEach((item: any) => {
        cards.push({
          name: item.card.name,
          quantity: item.quantity || 1,
          is_commander: true,
          type_line: item.card.type_line,
          mana_cost: item.card.mana_cost,
          image_url: item.card.images?.normal,
          oracle_text: item.card.oracle_text
        });
      });
    }

    // Mainboard
    if (data.mainboard) {
      Object.values(data.mainboard).forEach((item: any) => {
        cards.push({
          name: item.card.name,
          quantity: item.quantity,
          is_commander: false,
          type_line: item.card.type_line,
          mana_cost: item.card.mana_cost,
          image_url: item.card.images?.normal,
          oracle_text: item.card.oracle_text
        });
      });
    }

    return cards;
  } catch {
    return [];
  }
}

async function getCommanderImage(commanderName: string): Promise<string> {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commanderName)}`);
    if (!response.ok) return 'https://cards.scryfall.io/normal/front/0/d/0da5a065-f485-4841-a1ca-61cbde8b14e6.jpg'; // Card Back
    
    const data = await response.json() as any;
    return data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || 'https://cards.scryfall.io/normal/front/0/d/0da5a065-f485-4841-a1ca-61cbde8b14e6.jpg';
  } catch {
    return 'https://cards.scryfall.io/normal/front/0/d/0da5a065-f485-4841-a1ca-61cbde8b14e6.jpg';
  }
}

async function fetchDeckCards(archidektId: string, retries = 3): Promise<Card[]> {
  try {
    const response = await fetch(`https://archidekt.com/api/decks/${archidektId}/`);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`    !! Rate limited (429). Waiting 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchDeckCards(archidektId, retries - 1);
      }
      return [];
    }
    const data = await response.json() as any;
    if (!data.cards) return [];
    
    return data.cards.map((item: any) => {
      // Skip Sideboard and Maybeboard
      if (item.categories?.includes('Sideboard') || item.categories?.includes('Maybeboard')) {
        return null;
      }

      const oc = item.card.oracleCard;
      const typeLine = oc.typeLine || [
        ...(oc.superTypes || []),
        ...(oc.types || []),
        ...(oc.subTypes ? ["—", ...oc.subTypes] : [])
      ].join(' ');

      return {
        name: oc.name,
        quantity: item.quantity,
        is_commander: item.categories?.includes('Commander') || false,
        type_line: typeLine,
        mana_cost: oc.manaCost,
        image_url: oc.imageUri || `https://api.scryfall.com/cards/${item.card.uid}?format=image`,
        oracle_text: oc.oracleText
      };
    }).filter((c: any) => c !== null);
  } catch (e) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchDeckCards(archidektId, retries - 1);
    }
    return [];
  }
}

async function searchDeckOnArchidekt(deckName: string): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const url = `https://archidekt.com/api/decks/v3/?name=${encodeURIComponent(deckName)}&pageSize=10`; // V3 endpoint
    console.log(`    [DEBUG] Archidekt Search URL: ${url}`);
    
    const res = await fetch(url);
    if (!res.ok) {
       console.log(`    [DEBUG] Archidekt Search HTTP Error: ${res.status}`);
       return [];
    }
    const data = await res.json() as any;
    console.log(`    [DEBUG] Archidekt Search Results: ${data.results?.length || 0}`);
    
    if (data.results && data.results.length > 0) {
      // Prioritize results with high view counts or matching specific owners if possible, 
      // but for now just return the top few.
      return data.results.map((r: any) => r.id.toString());
    }
  } catch (e) {
    console.warn(`    !! Search failed for ${deckName}`);
  }
  return [];
}

// Helper to normalize strings for comparison
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

function validateDeckList(cards: Card[], expectedCommander: string): boolean {
  if (cards.length === 0) return false;
  
  // 1. Card Count Check (Strict 98-102 to filter out "Upgrade Lists" or "Kitchen Sink" decks)
  const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0);
  if (totalCards < 98 || totalCards > 102) {
     const normalizedExpected = normalize(expectedCommander);
     console.warn(`    !! Validation Failed: Card count ${totalCards} is not valid (expected ~100). Checking next candidate...`);
     return false;
  }

  const normalizedExpected = normalize(expectedCommander);
  
  // 2. Check if any card matches the commander name
  const found = cards.some(c => {
    const normalizedName = normalize(c.name);
    const match = normalizedName === normalizedExpected || 
           normalizedName.includes(normalizedExpected) || 
           normalizedExpected.includes(normalizedName);
    return match;
  });

  if (!found) {
    if (expectedCommander.includes("Inspirit")) {
       console.log(`    [DEBUG] Failed to find commander in list of ${cards.length} cards.`);
    }
    console.warn(`    !! Validation Failed: Commander "${expectedCommander}" not found in deck list.`);
  }
  return found;
}

// Moxfield search removed due to API restrictions (403 Cloudflare block)


async function generatePrecons() {
  console.log('🚀 Generating COMPLETE Precon Database (2011-2025)\n');
  
  const allPreconsList = [
    ...PRECONS_2025, ...PRECONS_2024, ...PRECONS_2023, ...PRECONS_2022, 
    ...PRECONS_2021, ...PRECONS_2020, ...PRECONS_2019, ...PRECONS_HISTO
    // PRECONS_HISTO.find(p => p.name === 'Heavenly Inferno')!
  ];
  
  const results = [];
  const decklists: Record<string, Card[]> = {};
  let count = 0;

  for (const precon of allPreconsList) {
    count++;
    console.log(`  [${count}/${allPreconsList.length}] Processing ${precon.name}...`);
    
    const imageUrl = await getCommanderImage(precon.commander);
    
    // Strategy: Candidates (ID + Search Results) -> Validate
    let cards: Card[] = [];
    const candidates: string[] = [];
    let matchedId: string | null = null;

    // 1. Hardcoded ID (Candidate #0)
    if (precon.archidektId || precon.moxfieldId) {
      candidates.push(precon.archidektId || precon.moxfieldId!);
    }
    
    // 2. Archidekt Search (Candidates #1...N)
    console.log(`    -> Searching Archidekt candidates...`);
    const searchIds = await searchDeckOnArchidekt(precon.name);
    // Safety check for searchIds array
    if (searchIds && Array.isArray(searchIds)) {
        searchIds.forEach(id => {
           if (!candidates.includes(id)) candidates.push(id);
        });
    }

    console.log(`    -> Check ${candidates.length} candidates for validation...`);

    // Iterate candidates until valid
    for (const id of candidates) {
       console.log(`    -> Fetching list from ${id.includes('-') || id.length > 10 ? 'Moxfield' : 'Archidekt'} (${id})...`);
       const fetchedCards = id.includes('-') || id.length > 10 
          ? await fetchMoxfieldCards(id)
          : await fetchDeckCards(id);
       
       if (fetchedCards.length > 0 && validateDeckList(fetchedCards, precon.commander)) {
          cards = fetchedCards;
          matchedId = id;
          console.log(`    ✨ VALID MATCH FOUND! (ID: ${id})`);
          break; // Found it!
       } else {
          // Add small delay between candidate checks to avoid slam
          await new Promise(resolve => setTimeout(resolve, 500));
       }
    }

    if (cards.length > 0 && matchedId) {
      decklists[precon.name] = cards;
      console.log(`    ✅ Cached ${cards.length} cards.`);
    } else {
      console.warn(`    ❌ FAILED to find valid deck for ${precon.name} (w/ commander ${precon.commander})`);
    }

    // URL Construction
    let finalUrl = `https://archidekt.com/search/decks?name=${encodeURIComponent(precon.name)}`;
    if (cards.length > 0 && matchedId) {
        finalUrl = (matchedId.includes('-') || matchedId.length > 10)
          ? `https://www.moxfield.com/decks/${matchedId}`
          : `https://archidekt.com/decks/${matchedId}`;
    }

    results.push({
      id: `precon-${precon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: precon.name,
      commander: precon.commander,
      imageUrl,
      url: finalUrl,
      series: precon.series,
      year: precon.year
    });

    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay between precons (safer rate limit)
  }

  console.log(`\n✅ Generated ${results.length} precons!`);
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const resultsPath = path.join(process.cwd(), 'src', 'data', 'precons.json');
  const decklistsPath = path.join(process.cwd(), 'src', 'data', 'precon-decklists.json');
  
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  await fs.writeFile(decklistsPath, JSON.stringify(decklists, null, 2));

  console.log('💾 Saved precons.json and precon-decklists.json');
  console.log('✨ Done!\n');
}

generatePrecons().catch(console.error);
