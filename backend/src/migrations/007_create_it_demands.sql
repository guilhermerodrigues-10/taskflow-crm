-- Create IT Demands table
CREATE TABLE IF NOT EXISTS it_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
  urgency VARCHAR(50) NOT NULL CHECK (urgency IN ('Baixa', 'Média', 'Alta', 'Crítica')),
  status VARCHAR(50) NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'em-analise', 'em-desenvolvimento', 'em-teste', 'concluido')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_it_demands_status ON it_demands(status);
CREATE INDEX idx_it_demands_requester ON it_demands(requester_id);
CREATE INDEX idx_it_demands_urgency ON it_demands(urgency);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_it_demands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_it_demands_updated_at
BEFORE UPDATE ON it_demands
FOR EACH ROW
EXECUTE FUNCTION update_it_demands_updated_at();
