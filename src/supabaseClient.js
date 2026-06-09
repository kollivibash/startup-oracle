import { createClient } from '@supabase/supabase-js'

// anon/public key — safe to expose in client code (protected by row-level security)
// Hardcoded directly (not via env var) because the Vercel env var was saved empty.
const SUPABASE_URL = 'https://jdqizltpalpefzvckinq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, flowType: 'implicit' } }
)
