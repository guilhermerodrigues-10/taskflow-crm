-- Migration 010: Add project_id column to it_demands table

-- Add project_id column to it_demands table (nullable, as not all demands are linked to projects)
ALTER TABLE it_demands
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_it_demands_project_id ON it_demands(project_id);
