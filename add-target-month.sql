
-- Migration: Add target_month to deck_wishlist
-- Run this in your Supabase SQL Editor

ALTER TABLE deck_wishlist 
ADD COLUMN IF NOT EXISTS target_month TEXT; -- Format: 'YYYY-MM'

-- Optional: Update existing records to have a default if needed, 
-- but leaving them NULL allows for a 'Backlog' section.
