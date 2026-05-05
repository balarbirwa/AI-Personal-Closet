-- ============================================================
-- Smart Closet — Phase 1 Schema
-- Run this in: supabase.com → your project → SQL Editor
-- ============================================================

-- Items table (your wardrobe)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                         -- add auth in phase 2
  image_url TEXT NOT NULL,
  type TEXT NOT NULL,
  primary_color TEXT,
  secondary_colors TEXT[],
  fabric TEXT,
  fit TEXT,
  formality SMALLINT CHECK (formality BETWEEN 1 AND 5),
  occasions TEXT[],
  seasons TEXT[],
  pattern TEXT,
  style_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Outfits table (generated suggestions)
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  outfit_id TEXT,                       -- the id from LLM response
  item_ids UUID[],
  rationale TEXT,
  vibe TEXT,
  weather_context TEXT,
  occasion TEXT,
  weather_score SMALLINT,
  occasion_score SMALLINT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Swipe log (feedback for learning)
CREATE TABLE swipe_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  outfit_id TEXT NOT NULL,
  signal TEXT CHECK (signal IN ('liked', 'disliked', 'saved')),
  item_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Storage bucket for garment images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('garments', 'garments', true);

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'garments');

-- Allow anyone to upload for now (add auth in phase 2)
CREATE POLICY "Public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'garments');

-- ============================================================
-- Row Level Security (open for phase 1, lock down in phase 2)
-- ============================================================
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON items FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON outfits FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON swipe_log FOR ALL USING (true);
