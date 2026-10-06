import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. Check your .env file and restart "npm run dev".'
  )
}

// Only the publishable (anon) key is used here. NEVER put the service_role key in React.
export const supabase = createClient(supabaseUrl, supabaseKey)
