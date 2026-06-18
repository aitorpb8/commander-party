
-- Migration: Add deck_wishlist table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS deck_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  price NUMERIC,
  image_url TEXT,
  priority TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deck_id, card_name)
);

-- Index for faster lookups
CREATE INDEX idx_deck_wishlist_deck ON deck_wishlist(deck_id);

-- RLS policies for deck_wishlist
ALTER TABLE deck_wishlist ENABLE ROW LEVEL SECURITY;

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
