-- Mentor user
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 'authenticated', 'nischay@theboringpeople.in', 
    crypt('mentor123', gen_salt('bf')), NOW()
);

INSERT INTO public.users (id, email, role, display_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'nischay@theboringpeople.in', 'mentor', 'Nischay BK');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES (
    '22222222-2222-2222-2222-222222222222', 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 'authenticated', 'varun@theboringpeople.in', 
    crypt('mentor123', gen_salt('bf')), NOW()
);

INSERT INTO public.users (id, email, role, display_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'varun@theboringpeople.in', 'mentor', 'Varun');

-- Insert Students (Trigger will populate auth.users and public.users for each)
INSERT INTO public.students (name, usn, branch_code, email, admission_number) VALUES
('Aarav Patel', '4SH24CS001', 'CS', 'aarav@forge.local', '24CS001'),
('Diya Sharma', '4SH24CS002', 'AI', 'diya@forge.local', '24CS002'),
('Aditya Kumar', '4SH24CS003', 'IS', 'aditya@forge.local', '24CS003'),
('Ananya Gupta', '4SH24CS004', 'CS', 'ananya@forge.local', '24CS004'),
('Vihaan Singh', '4SH24CS005', 'AI', 'vihaan@forge.local', '24CS005'),
('Neha Reddy', '4SH24CS006', 'IS', 'neha@forge.local', '24CS006'),
('Krishna Iyer', '4SH24CS007', 'CS', 'krishna@forge.local', '24CS007'),
('Ishaan Das', '4SH24CS008', 'AI', 'ishaan@forge.local', '24CS008'),
('Priya Rao', '4SH24CS009', 'IS', 'priya@forge.local', '24CS009'),
('Aryan Menon', '4SH24CS010', 'CS', 'aryan@forge.local', '24CS010'),
('Kavya Nair', '4SH24CS011', 'AI', 'kavya@forge.local', '24CS011'),
('Rohan Verma', '4SH24CS012', 'IS', 'rohan@forge.local', '24CS012'),
('Sneha Pillai', '4SH24CS013', 'CS', 'sneha@forge.local', '24CS013'),
('Arjun Kapoor', '4SH24CS014', 'AI', 'arjun@forge.local', '24CS014'),
('Meera Joshi', '4SH24CS015', 'IS', 'meera@forge.local', '24CS015'),
('Rahul Deshmukh', '4SH24CS016', 'CS', 'rahul@forge.local', '24CS016'),
('Anjali Bose', '4SH24CS017', 'AI', 'anjali@forge.local', '24CS017'),
('Vivaan Bhat', '4SH24CS018', 'IS', 'vivaan@forge.local', '24CS018'),
('Shruti Gowda', '4SH24CS019', 'CS', 'shruti@forge.local', '24CS019'),
('Dev Anand', '4SH24CS020', 'AI', 'dev@forge.local', '24CS020'),
('Pooja Hedge', '4SH24CS021', 'IS', 'pooja@forge.local', '24CS021'),
('Shiv Kadam', '4SH24CS022', 'CS', 'shiv@forge.local', '24CS022'),
('Ritu Dutta', '4SH24CS023', 'AI', 'ritu@forge.local', '24CS023'),
('Siddharth Naik', '4SH24CS024', 'IS', 'siddharth@forge.local', '24CS024'),
('Nikita V', '4SH24CS025', 'CS', 'nikita@forge.local', '24CS025');

-- Insert Sessions (15 sessions total) - Months 4, 5, 6
INSERT INTO public.sessions (date, topic, month_number, session_type) VALUES
('2026-03-01', '8-Layer AI Stack', 4, 'offline'),
('2026-03-03', 'LLM Fundamentals', 4, 'offline'),
('2026-03-08', 'Prompt Engineering Deep Dive', 4, 'online'),
('2026-03-10', 'Function Calling & Tools', 4, 'offline'),
('2026-03-15', 'ReAct Agent Pattern', 4, 'offline'),
('2026-03-20', 'Embeddings and Vectors', 5, 'offline'),
('2026-03-22', 'pgvector RAG', 5, 'offline'),
('2026-03-27', 'Advanced RAG chunks', 5, 'online'),
('2026-03-29', 'Evaluation of LLMs', 5, 'offline'),
('2026-04-03', 'LangChain/LlamaIndex', 5, 'offline'),
('2026-04-10', 'Tiered Autonomy Multi-Agent', 6, 'offline'),
('2026-04-12', 'Agentic Workflow (Planning)', 6, 'offline'),
('2026-04-17', 'Agentic Workflow (Execution)', 6, 'online'),
('2026-04-19', 'Agentic UX', 6, 'offline');

-- We can only use past dates for sessions given our check constraint <= CURRENT_DATE 
-- The local time is 2026-04-25, so we can use these dates safely.
INSERT INTO public.sessions (date, topic, month_number, session_type) VALUES
('2026-04-24', 'Capstone Kickoff', 6, 'offline');

-- Insert Attendance (70-90% present)
DO $$
DECLARE
    s_record RECORD;
    sess_record RECORD;
    is_present BOOLEAN;
BEGIN
    FOR s_record IN SELECT id FROM public.students LOOP
        FOR sess_record IN SELECT id FROM public.sessions LOOP
            IF s_record.id % 5 = 0 THEN
                is_present := random() > 0.4;
            ELSE
                is_present := random() > 0.15;
            END IF;
            
            INSERT INTO public.attendance (student_id, session_id, present, marked_by)
            VALUES (s_record.id, sess_record.id, is_present, 'Nischay BK');
        END LOOP;
    END LOOP;
END $$;

-- Insert Materials
INSERT INTO public.materials (session_id, title, type, url, description) VALUES
(1, '8-Layer AI Stack Slides', 'slides', 'https://docs.google.com/presentation/d/123/edit', 'The 8 layers covered in detail'),
(1, 'Recording: 8 Layer AI Stack', 'recording', 'https://youtube.com/watch?v=123', 'Class recording'),
(2, 'LLM Basics PDF', 'document', 'https://drive.google.com/file/d/123/view', 'Reading material for LLM fundamentals'),
(5, 'ReAct Pattern Guide', 'link', 'https://arxiv.org/abs/react', 'Original ReAct Paper'),
(5, 'ReAct Session Rec', 'recording', 'https://youtube.com/watch?v=456', 'Class recording'),
(7, 'pgvector repo', 'link', 'https://github.com/pgvector/pgvector', 'Official pgvector documentation for RAG'),
(11, 'Tiered Autonomy Notes', 'document', 'https://docs.google.com/document/d/123', 'Tiered Autonomy overview');

-- Insert Import Logs
INSERT INTO public.import_log (filename, uploaded_by, uploaded_at, total_rows, imported_rows, skipped_rows, status) VALUES
('month4_attendance.csv', 'Nischay BK', '2026-04-01', 120, 118, 2, 'completed'),
('month5_attendance.xlsx', 'Varun', '2026-04-15', 125, 125, 0, 'completed');
