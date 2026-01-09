-- Migration: Atualiza a tabela users de username para email
-- Execute este script no SQL Editor do Supabase
-- Este script é idempotente e pode ser executado múltiplas vezes

-- 1. Adicionar coluna email (se não existir)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Adicionar coluna is_active (se não existir)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Copiar dados de username para email (apenas se a coluna username existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        UPDATE public.users 
        SET email = username 
        WHERE email IS NULL AND username IS NOT NULL;
    END IF;
END $$;

-- 4. Verificar se há emails NULL antes de definir NOT NULL
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM public.users WHERE email IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Existem % registros com email NULL. Atualize-os antes de continuar.', null_count;
    ELSE
        EXECUTE 'ALTER TABLE public.users ALTER COLUMN email SET NOT NULL';
    END IF;
END $$;

-- 5. Verificar duplicatas de email antes de adicionar UNIQUE constraint
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count 
    FROM (
        SELECT email FROM public.users 
        WHERE email IS NOT NULL 
        GROUP BY email HAVING COUNT(*) > 1
    ) dupes;
    
    IF dup_count > 0 THEN
        RAISE NOTICE 'Existem % emails duplicados. Resolva antes de continuar.', dup_count;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'users_email_key'
        ) THEN
            EXECUTE 'ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email)';
        END IF;
    END IF;
END $$;

-- 6. Atualizar is_active para registros NULL
UPDATE public.users SET is_active = true WHERE is_active IS NULL;

-- 7. Tornar is_active NOT NULL
ALTER TABLE public.users ALTER COLUMN is_active SET NOT NULL;

-- 8. Inserir usuário síndico inicial (com UPSERT)
INSERT INTO public.users (email, name, role, is_active)
VALUES ('fmsilvestri39@gmail.com', 'Síndico Principal', 'síndico', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'síndico', 
    is_active = true,
    name = COALESCE(EXCLUDED.name, public.users.name);

-- 9. Verificar resultado
SELECT id, email, name, role, is_active, created_at FROM public.users;

-- NOTA: Para remover a coluna username após confirmar que tudo funciona:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS username;
