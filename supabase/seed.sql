-- SEED DATA
-- Created: 2026-10-06

-- 0. Insert Auth Users (Password: password123)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@mybizz.com', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp, '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner1@royalshine.com', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp, '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'owner2@homedelights.com', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp, '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'owner3@urbanthreads.com', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp, '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'admin@mybizz.com')::jsonb, 'email', current_timestamp, current_timestamp, current_timestamp),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000002', 'owner1@royalshine.com')::jsonb, 'email', current_timestamp, current_timestamp, current_timestamp),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000003', 'owner2@homedelights.com')::jsonb, 'email', current_timestamp, current_timestamp, current_timestamp),
(uuid_generate_v4(), '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000004', 'owner3@urbanthreads.com')::jsonb, 'email', current_timestamp, current_timestamp, current_timestamp)
ON CONFLICT DO NOTHING;

-- 1. Business Types
INSERT INTO business_types (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Imitation Jewellery', 'Selling artificial jewellery'),
('22222222-2222-2222-2222-222222222222', 'Handmade Food', 'Homemade food and snacks'),
('33333333-3333-3333-3333-333333333333', 'Clothing', 'Apparel and boutique items')
ON CONFLICT DO NOTHING;

-- 2. Roles
INSERT INTO roles (id, name, description) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Platform Admin', 'Full access to all businesses and platform settings'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Business Owner', 'Full access to their specific business')
ON CONFLICT DO NOTHING;

-- 3. Platform Users (For Demo)
INSERT INTO platform_users (id, email, first_name, last_name) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@mybizz.com', 'Super', 'Admin'),
('00000000-0000-0000-0000-000000000002', 'owner1@royalshine.com', 'Rahul', 'Jeweller'),
('00000000-0000-0000-0000-000000000003', 'owner2@homedelights.com', 'Aarti', 'Chef'),
('00000000-0000-0000-0000-000000000004', 'owner3@urbanthreads.com', 'Simran', 'Boutique')
ON CONFLICT DO NOTHING;

-- Assign Admin Role
INSERT INTO platform_admins (user_id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- 4. Businesses
INSERT INTO businesses (id, business_type_id, name, slug, status) VALUES
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Royal Shine Jewellery', 'royal-shine', 'Active'),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Homemade Delights', 'homemade-delights', 'Active'),
('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Urban Threads', 'urban-threads', 'Active')
ON CONFLICT DO NOTHING;

-- Assign Business Owners
INSERT INTO business_users (business_id, user_id, role_id) VALUES
('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('b3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;

-- 5. Inventory Locations
INSERT INTO inventory_locations (id, business_id, name) VALUES
('d1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Main Stock'),
('d2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Main Stock'),
('d3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Main Stock')
ON CONFLICT DO NOTHING;

-- 6. Products
INSERT INTO products (id, business_id, sku, name, selling_price, minimum_stock) VALUES
('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'RS-NK-001', 'Gold Finish Necklace', 799, 5),
('f1111111-1111-1111-1111-222222222222', 'b1111111-1111-1111-1111-111111111111', 'RS-ER-001', 'Crystal Earrings', 299, 10),
('f1111111-1111-1111-1111-333333333333', 'b1111111-1111-1111-1111-111111111111', 'RS-BR-001', 'Designer Bracelet', 499, 5),
('f2222222-2222-2222-2222-111111111111', 'b2222222-2222-2222-2222-222222222222', 'FD-001', 'Homemade Pickle', 180, 10),
('f3333333-3333-3333-3333-111111111111', 'b3333333-3333-3333-3333-333333333333', 'CL-001', 'Cotton Kurti', 799, 5)
ON CONFLICT DO NOTHING;

-- 7. Inventory
INSERT INTO inventory (business_id, location_id, product_id, quantity) VALUES
('b1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 25),
('b1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-222222222222', 40),
('b1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-333333333333', 18),
('b2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-111111111111', 50),
('b3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-111111111111', 20)
ON CONFLICT DO NOTHING;

-- 8. Events
INSERT INTO events (id, business_id, name, event_type, venue, status, start_date, end_date) VALUES
('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Diwali Pop-up Exhibition', 'Exhibition', 'Grand Mall, City', 'Upcoming', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days')
ON CONFLICT DO NOTHING;
