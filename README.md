# TaskFlow CRM

Sistema completo de gerenciamento de projetos e tarefas: quadro Kanban, equipe, biblioteca de assets, calendário e relatórios. Full-stack (React + TypeScript no frontend, Node.js + Express + PostgreSQL/Supabase no backend).

Este é um produto próprio, usado em produção por um cliente durante um período. Esta versão pública foi limpa de credenciais, domínios e dados reais, mantendo dados de exemplo fictícios (`example.com`) para demonstração.

## Funcionalidades

- **Projetos**: CRUD completo, membros, orçamento, cliente, cores customizadas
- **Kanban**: drag & drop de tarefas, status personalizados, filtros por projeto/usuário
- **Tarefas**: subtarefas, tags, anexos, prioridades, prazos com alertas, cronômetro
- **Equipe**: 4 níveis de acesso (Admin, Gerente, Membro, Convidado), permissões por role
- **Biblioteca de Assets**: upload de imagens/vídeos/documentos, integração com Dropbox, busca e preview
- **Calendário**: visualização de tarefas por data, filtros
- **Relatórios**: gráficos por status/prioridade, timeline, estatísticas
- **Autenticação**: JWT, hash de senhas (bcrypt), recuperação de senha
- **UI**: dark mode, responsivo, notificações em tempo real (Socket.io)

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind, Recharts, dnd-kit, Socket.io client
- **Backend**: Node.js, Express, PostgreSQL (ou Supabase), JWT, bcrypt, Socket.io
- **Storage**: Dropbox API (upload de assets)

## Como rodar localmente

### 1. Banco de dados

Rode `supabase-schema-complete.sql` num projeto Supabase (ou Postgres direto), no SQL Editor. O script é idempotente.

Depois, crie seu próprio usuário admin (não vem senha padrão de propósito — veja o comentário no final do schema).

### 2. Backend

```bash
cd backend
cp .env.example .env   # preencha com suas credenciais (DB, JWT_SECRET, Dropbox opcional)
npm install
npm run dev
```

### 3. Frontend

```bash
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Estrutura

```
taskflow-crm/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuração do banco
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # Rotas da API
│   │   └── migrations/     # Migrations SQL
│   ├── server.js
│   └── package.json
├── components/              # Componentes React
├── pages/                    # Páginas
├── contexts/                 # Context API
├── lib/                      # Clientes/helpers (Supabase, Dropbox, API)
├── supabase-schema-complete.sql
└── package.json
```

## Nota de segurança

Nenhuma credencial real (senha de banco, JWT secret, chave do Supabase, domínio de produção) está presente neste repositório. Todo dado de exemplo (usuários, projetos, e-mails) é fictício.

## Logo

Este template não inclui `public/logo.png` de propósito. Adicione sua própria logo nesse caminho (referenciada em `index.html`, `components/layout/Sidebar.tsx`, `pages/LoginPage.tsx` e `pages/ForgotPasswordPage.tsx`).
