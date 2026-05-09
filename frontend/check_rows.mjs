import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkRows() {
  const { data } = await supabase.from('attendance').select('student_id, present').limit(10000);
  console.log("Total attendance rows fetched:", data?.length);
  
  // Let's also check total count
  const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
  console.log("Total attendance rows in DB:", count);
}
checkRows();
