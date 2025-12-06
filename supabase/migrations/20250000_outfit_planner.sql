-- AI Outfit Planner Migration
-- Adds tables and columns for outfit suggestions and tracking

-- ============================================================================
-- 1. Extend clothes table with outfit-relevant metadata
-- ============================================================================

ALTER TABLE clothes
ADD COLUMN IF NOT EXISTS occasion_tags TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'all-season')) DEFAULT 'all-season',
ADD COLUMN IF NOT EXISTS wear_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_worn TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_clothes_season ON clothes(season);
CREATE INDEX IF NOT EXISTS idx_clothes_occasion_tags ON clothes USING GIN(occasion_tags);

-- ============================================================================
-- 2. Create outfits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  item_ids UUID[] NOT NULL,
  occasion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ai_generated BOOLEAN DEFAULT false,
  times_worn INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT outfits_item_ids_not_empty CHECK (array_length(item_ids, 1) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_occasion ON outfits(occasion);
CREATE INDEX IF NOT EXISTS idx_outfits_created_at ON outfits(created_at DESC);

-- Row Level Security
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Create wear_log table for tracking outfit usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS wear_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  item_ids UUID[] NOT NULL,
  worn_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wear_log_item_ids_not_empty CHECK (array_length(item_ids, 1) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wear_log_user_id ON wear_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_outfit_id ON wear_log(outfit_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_worn_on ON wear_log(worn_on DESC);

-- Row Level Security
ALTER TABLE wear_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wear logs"
  ON wear_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wear logs"
  ON wear_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wear logs"
  ON wear_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wear logs"
  ON wear_log FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Helper function to update wear counts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wear_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update outfit times_worn
  IF NEW.outfit_id IS NOT NULL THEN
    UPDATE outfits
    SET times_worn = times_worn + 1
    WHERE id = NEW.outfit_id;
  END IF;

  -- Update individual item wear_count and last_worn
  UPDATE clothes
  SET
    wear_count = wear_count + 1,
    last_worn = NEW.worn_on
  WHERE id = ANY(NEW.item_ids);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on wear_log insert
DROP TRIGGER IF EXISTS trigger_update_wear_counts ON wear_log;
CREATE TRIGGER trigger_update_wear_counts
  AFTER INSERT ON wear_log
  FOR EACH ROW
  EXECUTE FUNCTION update_wear_counts();

-- ============================================================================
-- 5. Sample data helpers (optional, for testing)
-- ============================================================================

COMMENT ON TABLE outfits IS 'Stores saved outfit combinations (AI-generated or user-created)';
COMMENT ON TABLE wear_log IS 'Tracks when outfits/items were worn for analytics';
COMMENT ON COLUMN clothes.occasion_tags IS 'Array of occasions: casual, formal, date-night, work, gym, etc.';
COMMENT ON COLUMN clothes.season IS 'Best season for this item';
COMMENT ON COLUMN clothes.wear_count IS 'Total times this item has been worn';
COMMENT ON COLUMN clothes.last_worn IS 'Last date this item was logged as worn';
