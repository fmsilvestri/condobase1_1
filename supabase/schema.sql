-- CONDOBASE1 - Supabase Database Schema
-- Sistema de Gestão de Condomínios
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. EXTENSÕES NECESSÁRIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. TABELAS
-- =====================================================

-- Tabela de Usuários (complementa auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'condômino' CHECK (role IN ('síndico', 'condômino', 'admin', 'porteiro')),
    name TEXT NOT NULL,
    unit TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'elétrico', 'hidráulico', 'piscina', 'elevadores', 'cisternas', 
        'bombas', 'academia', 'brinquedoteca', 'pet place', 'campo', 
        'portas', 'portões', 'acessos', 'pintura', 'reboco', 
        'limpeza', 'pisos', 'jardim'
    )),
    location TEXT NOT NULL,
    description TEXT,
    photos TEXT[],
    status TEXT NOT NULL DEFAULT 'operacional' CHECK (status IN ('operacional', 'atenção', 'alerta', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Solicitações de Manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    photos TEXT[],
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em andamento', 'concluído')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta')),
    requested_by UUID REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de Leituras da Piscina
CREATE TABLE IF NOT EXISTS public.pool_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ph REAL NOT NULL CHECK (ph >= 0 AND ph <= 14),
    chlorine REAL NOT NULL CHECK (chlorine >= 0),
    alkalinity REAL NOT NULL CHECK (alkalinity >= 0),
    calcium_hardness REAL NOT NULL CHECK (calcium_hardness >= 0),
    temperature REAL NOT NULL,
    photo TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Leituras de Água/Reservatórios
CREATE TABLE IF NOT EXISTS public.water_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tank_level REAL NOT NULL CHECK (tank_level >= 0 AND tank_level <= 100),
    quality TEXT NOT NULL DEFAULT 'boa' CHECK (quality IN ('boa', 'regular', 'ruim')),
    volume_available REAL NOT NULL CHECK (volume_available >= 0),
    estimated_autonomy REAL,
    casan_status TEXT DEFAULT 'normal' CHECK (casan_status IN ('normal', 'interrompido', 'baixa pressão')),
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Leituras de Gás
CREATE TABLE IF NOT EXISTS public.gas_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level REAL NOT NULL CHECK (level >= 0),
    percent_available REAL NOT NULL CHECK (percent_available >= 0 AND percent_available <= 100),
    photo TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Eventos de Energia
CREATE TABLE IF NOT EXISTS public.energy_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'falta de energia', 'meia fase')),
    description TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de Dados de Ocupação
CREATE TABLE IF NOT EXISTS public.occupancy_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    occupied_units INTEGER NOT NULL CHECK (occupied_units >= 0),
    vacant_units INTEGER NOT NULL CHECK (vacant_units >= 0),
    average_people_per_unit REAL NOT NULL CHECK (average_people_per_unit >= 0),
    estimated_population INTEGER NOT NULL CHECK (estimated_population >= 0),
    avg_water_consumption REAL,
    avg_gas_consumption REAL,
    avg_energy_consumption REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Documentos e Licenças
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('AVCB', 'Alvará', 'Dedetização', 'Limpeza Caixas d''Água', 'Certificado', 'Contrato', 'Outros')),
    file_url TEXT,
    expiration_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Comunicados
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON public.maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON public.maintenance_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_created ON public.maintenance_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pool_readings_created ON public.pool_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_readings_created ON public.water_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_readings_created ON public.gas_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_events_created ON public.energy_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_expiration ON public.documents(expiration_date);

CREATE INDEX IF NOT EXISTS idx_suppliers_category ON public.suppliers(category);

CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at);

-- =====================================================
-- 4. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_occupancy_updated_at
    BEFORE UPDATE ON public.occupancy_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancy_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se usuário é admin/síndico
CREATE OR REPLACE FUNCTION public.is_admin_or_sindico()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para obter o user_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.users WHERE auth_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA TABELA: users
-- =====================================================

-- Usuários podem ver todos os usuários (para exibir nomes)
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid());

-- Apenas admin/síndico podem inserir novos usuários
CREATE POLICY "users_insert_admin" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

-- Apenas admin pode deletar usuários
CREATE POLICY "users_delete_admin" ON public.users
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() AND role = 'admin'
    ));

-- =====================================================
-- POLÍTICAS PARA TABELA: equipment
-- =====================================================

-- Todos autenticados podem ver equipamentos
CREATE POLICY "equipment_select_all" ON public.equipment
    FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admin/síndico podem inserir equipamentos
CREATE POLICY "equipment_insert_admin" ON public.equipment
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

-- Apenas admin/síndico podem atualizar equipamentos
CREATE POLICY "equipment_update_admin" ON public.equipment
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_sindico());

-- Apenas admin/síndico podem deletar equipamentos
CREATE POLICY "equipment_delete_admin" ON public.equipment
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: maintenance_requests
-- =====================================================

-- Todos autenticados podem ver solicitações de manutenção
CREATE POLICY "maintenance_select_all" ON public.maintenance_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Todos autenticados podem abrir solicitações de manutenção
CREATE POLICY "maintenance_insert_all" ON public.maintenance_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admin/síndico podem atualizar qualquer solicitação, outros apenas as próprias
CREATE POLICY "maintenance_update" ON public.maintenance_requests
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin_or_sindico() 
        OR requested_by = public.get_current_user_id()
    );

-- Apenas admin/síndico podem deletar solicitações
CREATE POLICY "maintenance_delete_admin" ON public.maintenance_requests
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: pool_readings
-- =====================================================

-- Todos autenticados podem ver leituras da piscina
CREATE POLICY "pool_select_all" ON public.pool_readings
    FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admin/síndico/porteiro podem registrar leituras
CREATE POLICY "pool_insert_staff" ON public.pool_readings
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico', 'porteiro')
    ));

-- Apenas admin/síndico podem deletar leituras
CREATE POLICY "pool_delete_admin" ON public.pool_readings
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: water_readings
-- =====================================================

CREATE POLICY "water_select_all" ON public.water_readings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "water_insert_staff" ON public.water_readings
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico', 'porteiro')
    ));

CREATE POLICY "water_delete_admin" ON public.water_readings
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: gas_readings
-- =====================================================

CREATE POLICY "gas_select_all" ON public.gas_readings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "gas_insert_staff" ON public.gas_readings
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico', 'porteiro')
    ));

CREATE POLICY "gas_delete_admin" ON public.gas_readings
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: energy_events
-- =====================================================

CREATE POLICY "energy_select_all" ON public.energy_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "energy_insert_staff" ON public.energy_events
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico', 'porteiro')
    ));

CREATE POLICY "energy_update_staff" ON public.energy_events
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role IN ('admin', 'síndico', 'porteiro')
    ));

CREATE POLICY "energy_delete_admin" ON public.energy_events
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: occupancy_data
-- =====================================================

CREATE POLICY "occupancy_select_all" ON public.occupancy_data
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "occupancy_insert_admin" ON public.occupancy_data
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

CREATE POLICY "occupancy_update_admin" ON public.occupancy_data
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_sindico());

CREATE POLICY "occupancy_delete_admin" ON public.occupancy_data
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: documents
-- =====================================================

CREATE POLICY "documents_select_all" ON public.documents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "documents_insert_admin" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

CREATE POLICY "documents_update_admin" ON public.documents
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_sindico());

CREATE POLICY "documents_delete_admin" ON public.documents
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: suppliers
-- =====================================================

CREATE POLICY "suppliers_select_all" ON public.suppliers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_insert_admin" ON public.suppliers
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

CREATE POLICY "suppliers_update_admin" ON public.suppliers
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_sindico());

CREATE POLICY "suppliers_delete_admin" ON public.suppliers
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- POLÍTICAS PARA TABELA: announcements
-- =====================================================

CREATE POLICY "announcements_select_all" ON public.announcements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "announcements_insert_admin" ON public.announcements
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_sindico());

CREATE POLICY "announcements_update_admin" ON public.announcements
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_sindico());

CREATE POLICY "announcements_delete_admin" ON public.announcements
    FOR DELETE TO authenticated
    USING (public.is_admin_or_sindico());

-- =====================================================
-- 6. VIEWS ÚTEIS
-- =====================================================

-- View de documentos próximos do vencimento (30 dias)
CREATE OR REPLACE VIEW public.documents_expiring_soon AS
SELECT * FROM public.documents
WHERE expiration_date IS NOT NULL
AND expiration_date <= NOW() + INTERVAL '30 days'
AND expiration_date >= NOW()
ORDER BY expiration_date ASC;

-- View de chamados abertos
CREATE OR REPLACE VIEW public.open_maintenance_requests AS
SELECT 
    mr.*,
    e.name as equipment_name,
    e.location as equipment_location
FROM public.maintenance_requests mr
JOIN public.equipment e ON mr.equipment_id = e.id
WHERE mr.status != 'concluído'
ORDER BY 
    CASE mr.priority 
        WHEN 'alta' THEN 1 
        WHEN 'normal' THEN 2 
        WHEN 'baixa' THEN 3 
    END,
    mr.created_at DESC;

-- View de última leitura de cada tipo
CREATE OR REPLACE VIEW public.latest_readings AS
SELECT * FROM (
    SELECT 
        'pool' as type,
        id,
        created_at,
        jsonb_build_object('ph', ph, 'chlorine', chlorine, 'temperature', temperature) as data
    FROM public.pool_readings
    ORDER BY created_at DESC
    LIMIT 1
) pool_latest
UNION ALL
SELECT * FROM (
    SELECT 
        'water' as type,
        id,
        created_at,
        jsonb_build_object('tank_level', tank_level, 'quality', quality) as data
    FROM public.water_readings
    ORDER BY created_at DESC
    LIMIT 1
) water_latest
UNION ALL
SELECT * FROM (
    SELECT 
        'gas' as type,
        id,
        created_at,
        jsonb_build_object('level', level, 'percent_available', percent_available) as data
    FROM public.gas_readings
    ORDER BY created_at DESC
    LIMIT 1
) gas_latest;

-- =====================================================
-- 7. DADOS INICIAIS (Opcional - Remover em Produção)
-- =====================================================

-- Inserir dados de ocupação padrão
INSERT INTO public.occupancy_data (
    total_units, occupied_units, vacant_units, 
    average_people_per_unit, estimated_population
) VALUES (
    120, 108, 12, 2.8, 302
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

COMMENT ON SCHEMA public IS 'CONDOBASE1 - Sistema de Gestão de Condomínios';
