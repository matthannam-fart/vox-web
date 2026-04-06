import { createClient } from "@supabase/supabase-js";

// Matches config.py: SUPABASE_URL and SUPABASE_ANON_KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://kfxiawqlboqnwzkxbyid.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? "sb_publishable_5zTaoo3rYTDpXv0gHN0c8g_PEkHyXIO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
