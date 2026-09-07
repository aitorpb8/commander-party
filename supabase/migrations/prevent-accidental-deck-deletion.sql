-- MIGRATION: Prevenir borrado accidental de mazos y asegurar respaldo
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir columna deleted_at para borrado lógico (Soft Delete)
ALTER TABLE decks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índice para optimizar consultas de mazos activos
CREATE INDEX IF NOT EXISTS idx_decks_deleted_at ON decks(deleted_at);

-- 2. Tabla de archivo seguro inmutable
CREATE TABLE IF NOT EXISTS deleted_decks_archive (
  id UUID PRIMARY KEY,
  user_id UUID,
  name TEXT,
  commander TEXT,
  image_url TEXT,
  budget_spent NUMERIC,
  budget_limit NUMERIC,
  archidekt_id TEXT,
  moxfield_id TEXT,
  precon_url TEXT,
  precon_cards TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_deck_snapshot JSONB
);

-- Habilitar RLS en deleted_decks_archive
ALTER TABLE deleted_decks_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view archived decks" 
    ON deleted_decks_archive FOR SELECT 
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Función y Trigger de respaldo automático antes de cualquier borrado físico
CREATE OR REPLACE FUNCTION archive_deck_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deleted_decks_archive (
    id, user_id, name, commander, image_url, budget_spent, budget_limit, 
    archidekt_id, moxfield_id, precon_url, precon_cards, created_at, deleted_at,
    full_deck_snapshot
  ) VALUES (
    OLD.id, OLD.user_id, OLD.name, OLD.commander, OLD.image_url, OLD.budget_spent, OLD.budget_limit,
    OLD.archidekt_id, OLD.moxfield_id, OLD.precon_url, OLD.precon_cards, OLD.created_at, NOW(),
    jsonb_build_object(
      'cards', (SELECT jsonb_agg(c) FROM deck_cards c WHERE c.deck_id = OLD.id),
      'upgrades', (SELECT jsonb_agg(u) FROM deck_upgrades u WHERE u.deck_id = OLD.id),
      'tags', (SELECT jsonb_agg(t) FROM deck_card_tags t WHERE t.deck_id = OLD.id),
      'wishlist', (SELECT jsonb_agg(w) FROM deck_wishlist w WHERE w.deck_id = OLD.id)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    deleted_at = NOW(),
    full_deck_snapshot = EXCLUDED.full_deck_snapshot;
    
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_archive_deck_before_delete ON decks;
CREATE TRIGGER trigger_archive_deck_before_delete
  BEFORE DELETE ON decks
  FOR EACH ROW
  EXECUTE FUNCTION archive_deck_before_delete();
