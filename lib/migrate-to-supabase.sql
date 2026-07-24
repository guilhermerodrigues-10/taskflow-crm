-- Script para popular o banco com dados iniciais
-- Execute este SQL após criar as tabelas (supabase-schema.sql)

-- Inserir usuários de exemplo
INSERT INTO users (id, name, email, role, avatar_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'João Silva', 'joao@example.com', 'Admin', 'https://i.pravatar.cc/150?img=1'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Maria Santos', 'maria@example.com', 'Gerente', 'https://i.pravatar.cc/150?img=5'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Pedro Costa', 'pedro@example.com', 'Membro', 'https://i.pravatar.cc/150?img=3'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Ana Paula', 'ana@example.com', 'Membro', 'https://i.pravatar.cc/150?img=9')
ON CONFLICT (id) DO NOTHING;

-- Inserir projetos de exemplo
INSERT INTO projects (id, name, client_name, budget, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'Website Redesign', 'Tech Corp', 25000.00, '#3b82f6'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Mobile App', 'Startup XYZ', 45000.00, '#10b981'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Brand Identity', 'Fashion Co', 15000.00, '#f59e0b'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Social Media Campaign', 'Food Brand', 8000.00, '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- Adicionar membros aos projetos
INSERT INTO project_members (project_id, user_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;

-- Inserir tarefas de exemplo
INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, tags) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440021',
    'Design Homepage',
    'Criar mockups da página inicial',
    'in_progress',
    'Alta',
    NOW() + INTERVAL '7 days',
    '550e8400-e29b-41d4-a716-446655440011',
    ARRAY['design', 'ui']
  ),
  (
    '550e8400-e29b-41d4-a716-446655440022',
    'Develop API',
    'Implementar endpoints REST',
    'todo',
    'Urgente',
    NOW() + INTERVAL '5 days',
    '550e8400-e29b-41d4-a716-446655440012',
    ARRAY['backend', 'api']
  ),
  (
    '550e8400-e29b-41d4-a716-446655440023',
    'Create Logo',
    'Desenvolver identidade visual',
    'review',
    'Normal',
    NOW() + INTERVAL '10 days',
    '550e8400-e29b-41d4-a716-446655440013',
    ARRAY['branding']
  ),
  (
    '550e8400-e29b-41d4-a716-446655440024',
    'Setup Database',
    'Configurar PostgreSQL e migrations',
    'done',
    'Alta',
    NOW() - INTERVAL '2 days',
    '550e8400-e29b-41d4-a716-446655440012',
    ARRAY['backend', 'database']
  ),
  (
    '550e8400-e29b-41d4-a716-446655440025',
    'Content Planning',
    'Planejar conteúdo para redes sociais',
    'backlog',
    'Baixa',
    NOW() + INTERVAL '15 days',
    '550e8400-e29b-41d4-a716-446655440014',
    ARRAY['marketing', 'content']
  )
ON CONFLICT (id) DO NOTHING;

-- Atribuir tarefas aos usuários
INSERT INTO task_assignees (task_id, user_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT DO NOTHING;

-- Inserir subtarefas
INSERT INTO subtasks (task_id, title, completed) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', 'Wireframe inicial', true),
  ('550e8400-e29b-41d4-a716-446655440021', 'Paleta de cores', true),
  ('550e8400-e29b-41d4-a716-446655440021', 'Mockup hi-fi', false),
  ('550e8400-e29b-41d4-a716-446655440022', 'Endpoint de autenticação', false),
  ('550e8400-e29b-41d4-a716-446655440022', 'Endpoint de usuários', false),
  ('550e8400-e29b-41d4-a716-446655440024', 'Instalar PostgreSQL', true),
  ('550e8400-e29b-41d4-a716-446655440024', 'Criar migrations', true),
  ('550e8400-e29b-41d4-a716-446655440024', 'Seed inicial', true)
ON CONFLICT DO NOTHING;

-- Inserir notificações de exemplo
INSERT INTO notifications (user_id, title, message, type) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Bem-vindo!', 'Seu cadastro foi realizado com sucesso.', 'success'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Nova Tarefa', 'Você foi atribuído à tarefa "Design Homepage".', 'info'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Prazo Próximo', 'A tarefa "Design Homepage" vence em 7 dias.', 'warning'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Tarefa Urgente', 'A tarefa "Develop API" é urgente!', 'error')
ON CONFLICT DO NOTHING;

-- Verificar dados inseridos
SELECT 'Usuários:', COUNT(*) FROM users;
SELECT 'Projetos:', COUNT(*) FROM projects;
SELECT 'Tarefas:', COUNT(*) FROM tasks;
SELECT 'Notificações:', COUNT(*) FROM notifications;
SELECT 'Colunas:', COUNT(*) FROM board_columns;
