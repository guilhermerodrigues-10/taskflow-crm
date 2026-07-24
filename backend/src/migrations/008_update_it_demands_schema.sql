-- Update IT Demands table to add missing fields
ALTER TABLE it_demands
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal' CHECK (priority IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assignees JSONB DEFAULT '[]'::jsonb;

-- Add index for priority and due_date
CREATE INDEX IF NOT EXISTS idx_it_demands_priority ON it_demands(priority);
CREATE INDEX IF NOT EXISTS idx_it_demands_due_date ON it_demands(due_date);
