import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://atiojuyzcumlrixxobah.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aW9qdXl6Y3VtbHJpeHhvYmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzU4NDAsImV4cCI6MjA5NjUxMTg0MH0.2GEcdXqa6Bg6tEmXYAxTFQ30Obn8PlL3i2fWezJWzPg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ADMIN_EMAIL = "aomasjhys@gmail.com";
