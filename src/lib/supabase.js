import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database table schemas for reference:
// 
// students table:
// - id: uuid (primary key)
// - school_id: text (unique)
// - first_name: text
// - last_name: text
// - email: text
// - course: text
// - year: text
// - created_at: timestamp
//
// attendance table:
// - id: uuid (primary key) 
// - student_id: uuid (foreign key to students.id)
// - scanned_at: timestamp
// - created_at: timestamp
// - event_id: uuid (foreign key to events.id) - optional
//
// events table:
// - id: uuid (primary key)
// - title: text
// - description: text
// - start_date: timestamp
// - end_date: timestamp
// - location: text
// - created_at: timestamp
//
// event_attendance table:
// - id: uuid (primary key)
// - event_id: uuid (foreign key to events.id)
// - student_id: uuid (foreign key to students.id)
// - scanned_at: timestamp
// - created_at: timestamp