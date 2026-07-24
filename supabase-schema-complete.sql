-- =====================================================
-- Kanban CRM Database Schema - VERSÃO COMPLETA
-- =====================================================
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- (dashboard.supabase.com/project/SEU_PROJETO/sql/new)
--
-- Este script é IDEMPOTENTE - pode ser executado múltiplas vezes sem problemas!
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: CRIAR TABELAS
-- =====================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Gerente', 'Membro', 'Convidado')),
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  budget NUMERIC(10, 2) DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL CHECK (priority IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
  due_date TIMESTAMPTZ,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  time_tracked INTEGER DEFAULT 0, -- in seconds
  is_tracking BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignees (many-to-many relationship)
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Subtasks Table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns/Board Configuration Table
CREATE TABLE IF NOT EXISTS board_columns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets Library Table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL, -- Dropbox path
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'document', 'other')),
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);

-- =====================================================
-- STEP 3: ATIVAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CRIAR POLÍTICAS RLS (PERMISSIVAS)
-- =====================================================
-- NOTA: Estas políticas permitem tudo. Você pode restringir depois.

-- Drop existing policies if they exist (para evitar conflitos)
DO $$
BEGIN
    -- Users
    DROP POLICY IF EXISTS "Enable read access for all users" ON users;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
    DROP POLICY IF EXISTS "Enable update for users" ON users;
    DROP POLICY IF EXISTS "Enable delete for users" ON users;

    -- Projects
    DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
    DROP POLICY IF EXISTS "Enable update for users" ON projects;
    DROP POLICY IF EXISTS "Enable delete for users" ON projects;

    -- Tasks
    DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tasks;
    DROP POLICY IF EXISTS "Enable update for users" ON tasks;
    DROP POLICY IF EXISTS "Enable delete for users" ON tasks;

    -- Notifications
    DROP POLICY IF EXISTS "Enable read access for all users" ON notifications;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;
    DROP POLICY IF EXISTS "Enable update for users" ON notifications;
    DROP POLICY IF EXISTS "Enable delete for users" ON notifications;

    -- Board Columns
    DROP POLICY IF EXISTS "Enable read access for all users" ON board_columns;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON board_columns;
    DROP POLICY IF EXISTS "Enable update for users" ON board_columns;
    DROP POLICY IF EXISTS "Enable delete for users" ON board_columns;

    -- Project Members
    DROP POLICY IF EXISTS "Enable read access for all users" ON project_members;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_members;
    DROP POLICY IF EXISTS "Enable delete for users" ON project_members;

    -- Task Assignees
    DROP POLICY IF EXISTS "Enable read access for all users" ON task_assignees;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON task_assignees;
    DROP POLICY IF EXISTS "Enable delete for users" ON task_assignees;

    -- Subtasks
    DROP POLICY IF EXISTS "Enable read access for all users" ON subtasks;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON subtasks;
    DROP POLICY IF EXISTS "Enable update for users" ON subtasks;
    DROP POLICY IF EXISTS "Enable delete for users" ON subtasks;

    -- Attachments
    DROP POLICY IF EXISTS "Enable read access for all users" ON attachments;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON attachments;
    DROP POLICY IF EXISTS "Enable delete for users" ON attachments;

    -- Assets
    DROP POLICY IF EXISTS "Enable read access for all users" ON assets;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON assets;
    DROP POLICY IF EXISTS "Enable update for users" ON assets;
    DROP POLICY IF EXISTS "Enable delete for users" ON assets;
END $$;

-- Criar novas políticas
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON users FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON projects FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tasks FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON tasks FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON notifications FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON board_columns FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON board_columns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON board_columns FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON board_columns FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON project_members FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON project_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for users" ON project_members FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON task_assignees FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON task_assignees FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for users" ON task_assignees FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON subtasks FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON subtasks FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON subtasks FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON attachments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for users" ON attachments FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON assets FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON assets FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON assets FOR DELETE USING (true);

-- =====================================================
-- STEP 5: INSERIR DADOS INICIAIS
-- =====================================================

-- Inserir colunas do board (SEMPRE)
INSERT INTO board_columns (id, title, position) VALUES
  ('backlog', 'Backlog', 0),
  ('todo', 'A Fazer', 1),
  ('in_progress', 'Em Progresso', 2),
  ('review', 'Revisão', 3),
  ('done', 'Concluído', 4)
ON CONFLICT (id) DO NOTHING;

-- Inserir usuários de exemplo (SE NÃO EXISTIREM)
-- IMPORTANTE: crie sua própria senha de admin após rodar esse schema, veja o README
INSERT INTO users (name, email, role, avatar_url) VALUES
  ('Admin', 'admin@example.com', 'Admin', 'https://ui-avatars.com/api/?name=Admin&background=7c3aed&color=fff'),
  ('João Silva', 'joao.silva@example.com', 'Admin', 'https://ui-avatars.com/api/?name=Joao+Silva&background=7c3aed&color=fff'),
  ('Maria Santos', 'maria.santos@example.com', 'Gerente', 'https://ui-avatars.com/api/?name=Maria+Santos&background=3b82f6&color=fff'),
  ('Pedro Costa', 'pedro.costa@example.com', 'Membro', 'https://ui-avatars.com/api/?name=Pedro+Costa&background=10b981&color=fff'),
  ('Ana Paula', 'ana.paula@example.com', 'Membro', 'https://ui-avatars.com/api/?name=Ana+Paula&background=10b981&color=fff')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  avatar_url = EXCLUDED.avatar_url;

-- Inserir projetos de exemplo
INSERT INTO projects (id, name, client_name, budget, color) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Website Redesign', 'TechCorp', 25000, 'bg-blue-500'),
  ('650e8400-e29b-41d4-a716-446655440002', 'Mobile App', 'StartupXYZ', 50000, 'bg-purple-500'),
  ('650e8400-e29b-41d4-a716-446655440003', 'Branding Package', 'Local Café', 8000, 'bg-green-500')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: CRIAR TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCESSO!
-- =====================================================
-- ✅ Tabelas criadas
-- ✅ Índices criados
-- ✅ RLS ativado
-- ✅ Políticas configuradas
-- ✅ Dados iniciais inseridos
-- ✅ Triggers configurados
--
-- Depois de rodar esse schema, crie seu usuário admin com uma senha própria
-- (veja instruções de setup no README do projeto).
-- =====================================================
