-- Migration to add scryfall_id to deck_upgrades
-- Run this in your Supabase SQL Editor

ALTER TABLE deck_upgrades ADD COLUMN IF NOT EXISTS scryfall_id UUID;

-- Optional: Update existing records by card name (this might pick the cheapest version)
-- Note: This is a best-effort update for existing data.
-- Since we don't have the ID, we can't be 100% sure which version was used, 
-- but we can leave it NULL for old records and it will use the cheapest print by default in the UI.
