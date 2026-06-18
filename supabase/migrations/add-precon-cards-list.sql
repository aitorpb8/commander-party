-- Add a column to store the list of original card names for a deck
-- This allows us to track which cards should be free (0 cost) even if removed and re-added,
-- without relying on external API availability on every page load.

ALTER TABLE decks 
ADD COLUMN IF NOT EXISTS precon_cards text[] DEFAULT NULL;
