import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yhkbexngegpbzolbhfqv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa2JleG5nZWdwYnpvbGJoZnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTI3MDMsImV4cCI6MjA4NzU2ODcwM30.6fVkDOy96Jifa_Q1VChv1pCoJ4pQMLRaLdAf8D3unUA'

export const supabase = createClient(supabaseUrl, supabaseKey)