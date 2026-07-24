-- Seed initial users (passwords: all "123456")
-- Password hash for "123456": $2a$10$8K1p/a0dL3FKk/PKDApKMu8YM5TzXvXdXKM5USmYkD4NG.8KSVHSG

INSERT INTO users (id, name, email, password_hash, role, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Alex Silva', 'alex@example.com', '$2a$10$8K1p/a0dL3FKk/PKDApKMu8YM5TzXvXdXKM5USmYkD4NG.8KSVHSG', 'Admin', NULL),
('550e8400-e29b-41d4-a716-446655440002', 'Sara Costa', 'sara@example.com', '$2a$10$8K1p/a0dL3FKk/PKDApKMu8YM5TzXvXdXKM5USmYkD4NG.8KSVHSG', 'Gerente', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'João Pereira', 'joao@example.com', '$2a$10$8K1p/a0dL3FKk/PKDApKMu8YM5TzXvXdXKM5USmYkD4NG.8KSVHSG', 'Membro', NULL),
('550e8400-e29b-41d4-a716-446655440004', 'Maria Santos', 'maria@example.com', '$2a$10$8K1p/a0dL3FKk/PKDApKMu8YM5TzXvXdXKM5USmYkD4NG.8KSVHSG', 'Membro', NULL)
ON CONFLICT (email) DO NOTHING;

-- Seed initial projects
INSERT INTO projects (id, name, client_name, budget, color) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Campanha Verão 2024', 'BeachWear Co.', 15000.00, '#10B981'),
('650e8400-e29b-41d4-a716-446655440002', 'Rebranding TechStart', 'TechStart Inc.', 25000.00, '#8B5CF6'),
('650e8400-e29b-41d4-a716-446655440003', 'E-commerce FoodMarket', 'FoodMarket', 8000.00, '#F59E0B')
ON CONFLICT DO NOTHING;

-- Assign members to projects
INSERT INTO project_members (project_id, user_id) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004')
ON CONFLICT DO NOTHING;

-- Seed initial tasks
INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, time_tracked) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Criar estratégia de conteúdo', 'Definir pilares e calendário editorial', 'Em Progresso', 'Alta', '2024-02-15', '650e8400-e29b-41d4-a716-446655440001', 7200),
('750e8400-e29b-41d4-a716-446655440002', 'Design do logo', 'Criar 3 opções de logo para aprovação', 'Revisão', 'Urgente', '2024-02-10', '650e8400-e29b-41d4-a716-446655440002', 14400),
('750e8400-e29b-41d4-a716-446655440003', 'Análise de concorrentes', 'Pesquisar principais concorrentes no mercado', 'A Fazer', 'Normal', '2024-02-20', '650e8400-e29b-41d4-a716-446655440001', 0)
ON CONFLICT DO NOTHING;

-- Assign users to tasks
INSERT INTO task_assignees (task_id, user_id) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'),
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004')
ON CONFLICT DO NOTHING;

-- Seed subtasks
INSERT INTO subtasks (task_id, title, completed) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Pesquisar tendências', TRUE),
('750e8400-e29b-41d4-a716-446655440001', 'Definir tom de voz', TRUE),
('750e8400-e29b-41d4-a716-446655440001', 'Criar calendário', FALSE),
('750e8400-e29b-41d4-a716-446655440002', 'Esboços iniciais', TRUE),
('750e8400-e29b-41d4-a716-446655440002', 'Vetorização', TRUE),
('750e8400-e29b-41d4-a716-446655440002', 'Apresentação', FALSE)
ON CONFLICT DO NOTHING;

-- Seed tags
INSERT INTO tags (task_id, name) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'conteúdo'),
('750e8400-e29b-41d4-a716-446655440001', 'planejamento'),
('750e8400-e29b-41d4-a716-446655440002', 'design'),
('750e8400-e29b-41d4-a716-446655440002', 'branding'),
('750e8400-e29b-41d4-a716-446655440003', 'pesquisa')
ON CONFLICT DO NOTHING;
