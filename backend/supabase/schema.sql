CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3.1 Students Table
CREATE TABLE public.students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  usn TEXT UNIQUE NOT NULL,
  admission_number TEXT,
  email TEXT,
  branch_code TEXT NOT NULL,
  batch TEXT DEFAULT '2024-2028',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Sessions Table
CREATE TABLE public.sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  month_number INTEGER NOT NULL,
  duration_hours DECIMAL(3,1) DEFAULT 2.0,
  session_type TEXT DEFAULT 'offline',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 ImportLog Table
CREATE TABLE public.import_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  skipped_rows INTEGER NOT NULL,
  warnings TEXT,
  column_mapping TEXT,
  status TEXT NOT NULL
);

-- 3.3 Attendance Table
CREATE TABLE public.attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marked_by TEXT DEFAULT 'system',
  import_id INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
  UNIQUE(student_id, session_id)
);

-- 3.4 Materials Table
CREATE TABLE public.materials (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.6 Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
  student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints
-- 6.1 Check constraints for Attendance dates via Trigger
CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
    session_date DATE;
BEGIN
    SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
    
    IF session_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be marked for a future date';
    END IF;
    
    IF session_date < '2024-08-04' THEN
        RAISE EXCEPTION 'Attendance date cannot be before 2024-08-04';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_attendance_date
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION check_attendance_date();

-- Auth Trigger for new students
CREATE OR REPLACE FUNCTION create_student_auth_user()
RETURNS trigger AS $$
DECLARE
    new_user_id uuid;
    generated_email text;
BEGIN
    new_user_id := gen_random_uuid();
    generated_email := LOWER(NEW.usn) || '@forge.local';
    
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        generated_email,
        crypt(NEW.usn, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        ''
    );
    
    INSERT INTO public.users (
        id,
        email,
        role,
        student_id,
        display_name
    )
    VALUES (
        new_user_id,
        generated_email,
        'student',
        NEW.id,
        NEW.name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION create_student_auth_user();

-- Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Mentors get full access to all tables
CREATE POLICY "Mentors can do all on students" ON public.students FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Mentors can do all on sessions" ON public.sessions FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Mentors can do all on attendance" ON public.attendance FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Mentors can do all on materials" ON public.materials FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Mentors can do all on import_log" ON public.import_log FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');
CREATE POLICY "Mentors can do all on users" ON public.users FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor');

-- Students get restricted access
CREATE POLICY "Students can read own student record" ON public.students FOR SELECT USING (id = (SELECT student_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Students can read all sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Students can read own attendance" ON public.attendance FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Students can read all materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Users can read own user record" ON public.users FOR SELECT USING (id = auth.uid());
