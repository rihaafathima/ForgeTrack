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
