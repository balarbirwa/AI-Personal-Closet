// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types matching your Postgres schema
export type Item = {
  id: string;
  user_id: string;
  image_url: string;
  type: string;
  primary_color: string;
  formality: number;
  occasions: string[];
  seasons: string[];
  style_tags: string[];
  created_at: string;
};

export type Outfit = {
  id: string;
  item_ids: string[];
  items: Item[];
  rationale: string;
  vibe: string;
  weather_temp_f: number;
  occasion: string;
};
