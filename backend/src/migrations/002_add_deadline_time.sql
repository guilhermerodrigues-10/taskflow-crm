-- Add time component to task deadlines
-- Change due_date from DATE to TIMESTAMP to support time

ALTER TABLE tasks
ALTER COLUMN due_date TYPE TIMESTAMP USING due_date::TIMESTAMP;

-- Update index to reflect the change
DROP INDEX IF EXISTS idx_tasks_due_date;
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
