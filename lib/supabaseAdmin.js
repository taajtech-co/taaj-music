import { createClient } from '@supabase/supabase-js';

// IMPORTANT: this uses the SERVICE ROLE key, which bypasses row-level security.
// It must only ever be used in server-side code (API routes), never sent to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
