-- Create moradores table in Supabase
CREATE TABLE IF NOT EXISTS moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id VARCHAR NOT NULL,
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento TEXT,
  email TEXT,
  telefone TEXT,
  tipo_morador TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  unidade_id TEXT,
  bloco TEXT,
  torre TEXT,
  unidade TEXT,
  inicio_ocupacao TEXT,
  fim_ocupacao TEXT,
  responsavel_financeiro BOOLEAN DEFAULT false,
  perfil_acesso TEXT DEFAULT 'morador',
  canal_preferido TEXT DEFAULT 'whatsapp',
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  numero_habitantes INTEGER DEFAULT 1,
  tem_pet BOOLEAN DEFAULT false,
  tipo_pet TEXT,
  quantidade_pets INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_moradores_condominium ON moradores(condominium_id);
CREATE INDEX IF NOT EXISTS idx_moradores_cpf ON moradores(cpf);
CREATE INDEX IF NOT EXISTS idx_moradores_status ON moradores(status);

-- Add unique constraint for CPF per condominium
ALTER TABLE moradores DROP CONSTRAINT IF EXISTS unique_cpf_per_condominium;
ALTER TABLE moradores ADD CONSTRAINT unique_cpf_per_condominium UNIQUE (condominium_id, cpf);
