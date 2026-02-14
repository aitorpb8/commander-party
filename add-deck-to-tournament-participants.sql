-- Migration: Update tournament_participants schema
-- Run this in your Supabase SQL Editor to support detailed deck info

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commander_name TEXT,
ADD COLUMN IF NOT EXISTS commander_image_url TEXT;

-- This ensures that even if a deck is deleted or unlinked, 
-- we keep the historical record of what commander was used.
