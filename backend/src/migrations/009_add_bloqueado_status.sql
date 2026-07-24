-- Migration 009: Add 'bloqueado' status to IT demands
-- This adds the 'bloqueado' (Blocked/Waiting) status option for IT demands

-- Update the check constraint to include the new status
ALTER TABLE it_demands
DROP CONSTRAINT IF EXISTS it_demands_status_check;

ALTER TABLE it_demands
ADD CONSTRAINT it_demands_status_check
CHECK (status IN ('backlog', 'em-analise', 'bloqueado', 'em-desenvolvimento', 'em-teste', 'concluido'));

-- Add comment explaining the new status
COMMENT ON COLUMN it_demands.status IS 'Status options: backlog, em-analise, bloqueado (blocked/waiting for access or information), em-desenvolvimento, em-teste, concluido';
