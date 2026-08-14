# 💰 Sistema Financeiro (Planilha Financeira)

Sistema de gestão financeira pessoal com dashboard de análise, lançamentos, contas bancárias, cartões de crédito e lançamentos futuros. Acessível de desktop e **totalmente responsivo para mobile** (em telas pequenas, as tabelas viram cards empilhados sem alterar o layout desktop).

## ✨ Funcionalidades

- **📊 Dashboard** — análise financeira com gráficos de pizza, fluxo de caixa, saúde financeira, comprometimento da receita e projeção dos próximos 6 meses
- **📝 Lançamentos** — entradas e saídas por banco/categoria, com saldo por conta, filtros por período e exportação CSV
- **📅 Lançamentos Futuros** — lançamentos únicos, parcelados e recorrentes, com confirmação automática no vencimento
- **💳 Cartões de Crédito** — limite, dívida, faturas e **importação de CSV** de faturas (Itaú, Nubank, Bradesco, Sicredi e outros) com sugestão automática de categorias
- **🏦 Bancos e 🏷️ Categorias** — cadastro com emoji e saldo inicial
- **👑 Painel Admin** — criação de usuários com validade, convites pendentes, sincronização e estatísticas do banco de dados
- **💾 Backup e Restore** — exportação/importação de todos os dados em JSON (mesclar ou substituir)
- **📱 Responsivo** — layout adaptado para celulares e tablets (tabelas empilhadas, grids em coluna única)

## 🛠️ Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Neon Postgres** + **Neon Auth** (Better Auth) — autenticação com expiração de acesso
- **Tailwind CSS** + **shadcn/ui**
- **Recharts** — gráficos
- **@neondatabase/serverless** + **pg** — acesso ao banco via API routes

## 🚀 Como executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Produção
npm start

# Lint
npm run lint
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para a página de login.

## ⚙️ Configuração

1. **Variáveis de ambiente** — copie/edite o arquivo `.env` (não versionado):
   ```env
   DATABASE_URL=postgresql://user:pass@host/neondb?sslmode=require
   NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
   NEON_AUTH_COOKIE_SECRET=secret_com_32+_caracteres
   ```
2. **Tabelas** — execute `migration/setup-neon-complete.sql` no SQL Editor do Neon. Documentação extra em `docs/` (tabela de lançamentos futuros, políticas RLS, sincronização de usuários).

Para a migração completa do Supabase para Neon, siga o guia em [`migration/README.md`](migration/README.md).

## 📁 Estrutura

```
src/
├── app/                 # Páginas e API routes (App Router)
│   ├── api/             # Endpoints (user-data, admin, backup, neon-auth...)
│   └── auth/            # Login e cadastro
├── components/
│   ├── finance/         # Dashboard, Transactions, CreditCards, Banks...
│   └── ui/              # shadcn/ui
├── contexts/            # FinanceContext (estado global + Neon)
└── lib/                 # Tipos, helpers de banco e parsers de CSV
migration/               # Scripts de migração Supabase → Neon
docs/                    # SQLs e documentação complementar
```

## 🔐 Segurança

- Credenciais ficam apenas em `.env` (ignorado pelo Git)
- Painel Admin restrito a e-mails de administradores (`ADMIN_EMAILS` em `src/lib/types.ts`)
- Acesso dos usuários controlado por data de validade (`expires_at`)
