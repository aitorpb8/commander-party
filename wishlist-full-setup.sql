
-- 1. Create deck_wishlist table with all columns including target_month
CREATE TABLE IF NOT EXISTS deck_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  price NUMERIC,
  image_url TEXT,
  priority TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
  target_month TEXT, -- 'YYYY-MM'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deck_id, card_name)
);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_deck_wishlist_deck ON deck_wishlist(deck_id);

-- 3. Enable RLS
ALTER TABLE deck_wishlist ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Check if they exist first or just create them - usually IDEMPOTENT creation is better but simple CREATE is standard for manual running)

-- Drop existing policies if any to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view wishlist for their decks" ON deck_wishlist;
DROP POLICY IF EXISTS "Users can insert wishlist for their decks" ON deck_wishlist;
DROP POLICY IF EXISTS "Users can update wishlist for their decks" ON deck_wishlist;
DROP POLICY IF EXISTS "Users can delete wishlist for their decks" ON deck_wishlist;

-- Re-create policies
CREATE POLICY "Users can view wishlist for their decks"
  ON deck_wishlist FOR SELECT
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert wishlist for their decks"
  ON deck_wishlist FOR INSERT
  WITH CHECK (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update wishlist for their decks"
  ON deck_wishlist FOR UPDATE
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete wishlist for their decks"
  ON deck_wishlist FOR DELETE
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );
