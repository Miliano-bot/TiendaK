import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fkdphrtztviqpgwnhdjw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHBocnR6dHZpcXBnd25oZGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTQ4MjksImV4cCI6MjA5MDMzMDgyOX0.JtqQCYYxNNs_yJxU5Ma0haZUWVIPV7fgE0tPz6uLBsQ'

export const supabase = createClient(supabaseUrl, supabaseKey)