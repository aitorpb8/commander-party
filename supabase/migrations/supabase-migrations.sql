-- Migration: Add card tags and user collection tables
-- Run this in your Supabase SQL Editor

-- 1. Table for card tags per deck
CREATE TABLE IF NOT EXISTS deck_card_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deck_id, card_name)
);

-- Index for faster lookups
CREATE INDEX idx_deck_card_tags_deck ON deck_card_tags(deck_id);

-- RLS policies for deck_card_tags
ALTER TABLE deck_card_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for their decks"
  ON deck_card_tags FOR SELECT
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags for their decks"
  ON deck_card_tags FOR INSERT
  WITH CHECK (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tags for their decks"
  ON deck_card_tags FOR UPDATE
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags for their decks"
  ON deck_card_tags FOR DELETE
  USING (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
  );

-- 2. Table for user's card collection
CREATE TABLE IF NOT EXISTS user_collection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  source TEXT, -- 'moxfield', 'archidekt', 'manual'
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_name)
);

-- Index for faster lookups
CREATE INDEX idx_user_collection_user ON user_collection(user_id);
CREATE INDEX idx_user_collection_card ON user_collection(card_name);

-- RLS policies for user_collection
ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collection"
  ON user_collection FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert to their own collection"
  ON user_collection FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collection"
  ON user_collection FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete from their own collection"
  ON user_collection FOR DELETE
  USING (user_id = auth.uid());

-- 3. Add collection_url to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS collection_url TEXT,
ADD COLUMN IF NOT EXISTS collection_last_synced TIMESTAMP WITH TIME ZONE;

-- 4. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deck_card_tags
CREATE TRIGGER update_deck_card_tags_updated_at
  BEFORE UPDATE ON deck_card_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
