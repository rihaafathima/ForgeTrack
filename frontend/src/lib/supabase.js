import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if(!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL and Anon Key are missing. Make sure to define them in .env.local");
}

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'public-anon-key');

export const fetchAllAttendance = async (selectStr = 'student_id, present, session_id') => {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('attendance')
      .select(selectStr)
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("Error fetching all attendance:", error);
      break;
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < pageSize) break;
      page++;
    } else {
      break;
    }
  }
  
  return allData;
};
