import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://atiojuyzcumlrixxobah.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdGlvanV5emN1bWxyaXh4b2JhaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwOTM1ODQwLCJleHAiOjIwOTY1MTE4NDB9.2GEcdXqa6Bg6tEmXYAxTFQ30Obn8PlL3i2fWezJWzPg";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// ÚNICO ADMINISTRADOR
export const ADMIN_EMAIL = "aomasjhys@gmail.com";