export interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  set_name?: string;
  image_uris?: {
    normal: string;
    small: string;
    large?: string;
    png?: string;
  };
  card_faces?: {
    name: string;
    image_uris?: {
      normal: string;
      small: string;
      large?: string;
      png?: string;
    };
    oracle_text?: string;
    mana_cost?: string;
    type_line?: string;
  }[];
  prices: {
    eur?: string;
    eur_foil?: string;
    usd?: string;
  };
  color_identity: string[];
  cmc: number;
  type_line: string;
  oracle_text?: string;
  mana_cost?: string;
}

export interface DeckCard {
  id?: string; // Database ID (optional for new cards)
  deck_id?: string;
  card_name: string;
  quantity: number;
  type_line: string | null;
  mana_cost: string | null;
  image_url: string | null;
  back_image_url?: string | null;
  oracle_text: string | null;
  is_commander: boolean;
  scryfall_id?: string;
  created_at?: string;
}

export interface DeckUpgrade {
  id: string;
  deck_id: string;
  card_in: string | null;
  card_out: string | null;
  cost: number | null;
  month: string | null;
  created_at: string;
  description: string | null;
  scryfall_id?: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  commander: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  budget_limit: number;
  budget_spent: number;
  archidekt_id: string | null;
  moxfield_id: string | null;
  precon_url: string | null;
  precon_cards: string[] | null;
  profiles?: {
    username: string;
  };
}

export interface Precon {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}
