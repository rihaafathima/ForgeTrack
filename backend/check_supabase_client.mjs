import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ladqowqclutyhzlyfoqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZHFvd3FjbHV0eWh6bHlmb3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mjk5ODYsImV4cCI6MjA3NzMwNTk4Nn0.uFrXaoUhsfZF9jifEs2Qi7t5ni5ZsFvlkrNXaUIP6Ok';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    const { data, error } = await supabase.from('students').select('*').limit(1);
    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log('Successfully fetched students. Table exists.');
        console.log('Sample data:', data);
    }
}

checkTables();
