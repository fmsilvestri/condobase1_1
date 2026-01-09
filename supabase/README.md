# CONDOBASE1 - Configuração Supabase

## Visão Geral

Este diretório contém o schema completo do banco de dados PostgreSQL para o Supabase, incluindo:

- **11 tabelas** para todos os módulos do sistema
- **Row Level Security (RLS)** para controle de acesso por papel
- **Índices** otimizados para performance
- **Views** úteis para consultas comuns
- **Triggers** para atualização automática de timestamps

## Como Configurar

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote as credenciais:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Chave pública para o frontend
   - **Service Role Key**: Chave privada para o backend

### 2. Executar o Schema

1. No dashboard do Supabase, vá para **SQL Editor**
2. Cole todo o conteúdo do arquivo `schema.sql`
3. Clique em **Run** para executar

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente no seu projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

## Estrutura das Tabelas

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema (síndico, condômino, porteiro) |
| `equipment` | Equipamentos e ativos do condomínio |
| `maintenance_requests` | Solicitações de manutenção |
| `pool_readings` | Leituras de qualidade da piscina |
| `water_readings` | Leituras de água/reservatórios |
| `gas_readings` | Leituras do nível de gás |
| `energy_events` | Eventos de energia (faltas, meia fase) |
| `occupancy_data` | Dados de ocupação do condomínio |
| `documents` | Documentos e licenças |
| `suppliers` | Fornecedores e prestadores |
| `announcements` | Comunicados e avisos |

## Papéis de Usuário

O sistema suporta os seguintes papéis:

| Papel | Permissões |
|-------|------------|
| `admin` | Acesso total a todas as operações |
| `síndico` | Gerenciar todos os módulos |
| `porteiro` | Registrar leituras e abrir chamados |
| `condômino` | Visualizar informações e abrir chamados |

## Políticas de Segurança (RLS)

As políticas de Row Level Security garantem:

- **Visualização**: Todos os usuários autenticados podem ver os dados
- **Inserção de leituras**: Apenas admin, síndico e porteiro
- **Gerenciamento**: Apenas admin e síndico podem inserir/atualizar/deletar
- **Perfil**: Usuários podem atualizar apenas seu próprio perfil

## Views Disponíveis

| View | Descrição |
|------|-----------|
| `documents_expiring_soon` | Documentos que vencem nos próximos 30 dias |
| `open_maintenance_requests` | Chamados em aberto ordenados por prioridade |
| `latest_readings` | Última leitura de cada tipo (piscina, água, gás) |

## Categorias de Equipamentos

- elétrico, hidráulico, piscina, elevadores
- cisternas, bombas, academia, brinquedoteca
- pet place, campo, portas, portões
- acessos, pintura, reboco, limpeza
- pisos, jardim

## Tipos de Documentos

- AVCB
- Alvará
- Dedetização
- Limpeza Caixas d'Água
- Certificado
- Contrato
- Outros

## Suporte

Para dúvidas sobre a configuração, consulte a [documentação do Supabase](https://supabase.com/docs).
