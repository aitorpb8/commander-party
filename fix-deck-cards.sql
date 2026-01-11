-- Migration: Add back_image_url column to deck_cards
-- Run this in your Supabase SQL Editor BEFORE the main migrations

-- Add back_image_url column to support double-faced cards
ALTER TABLE deck_cards 
ADD COLUMN IF NOT EXISTS back_image_url TEXT;

-- No need for RLS changes, it inherits from the table
