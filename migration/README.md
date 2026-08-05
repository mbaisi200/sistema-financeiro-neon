# Guia de Migração: Supabase → Neon Postgres + Neon Auth

## Visão Geral

```
┌─────────────────────────────────────────────────────┐
│                  ANTES (Supabase)                   │
├─────────────────────────────────────────────────────┤
│  Supabase Auth + Supabase PostgreSQL               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               DEPOIS (Neon Auth + Neon)             │
├─────────────────────────────────────────────────────┤
│  Neon Auth (Better Auth) + Neon PostgreSQL          │
└─────────────────────────────────────────────────────┘
```

---

## Passo 1: Criar Conta no Neon

1. Acesse https://neon.tech
2. Clique em **"Sign Up"** (canto superior direito)
3. Crie conta com Google, GitHub ou Email

---

## Passo 2: Criar Projeto

1. Clique em **"Create Project"**
2. Preencha:
   - **Project name**: `sistema-financeiro`
   - **Database name**: `neondb`
   - **Region**: Escolha a mais próxima
3. Clique em **"Create Project"**
4. Aguarde ~30 segundos

---

## Passo 3: Habilitar Neon Auth

1. No painel do projeto, vá em **"Auth"** no menu lateral
2. Clique em **"Enable Neon Auth"**
3. Siga as instruções na tela
4. Habilite **Email/Password** como método de login

---

## Passo 4: Copiar Credenciais

### 4.1. Auth URL
1. Vá em **"Auth"** → **"Configuration"**
2. Copie a **Auth URL** (ex: `https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth`)

### 4.2. Database Connection String
1. Volte ao **Dashboard**
2. Clique em **"Connect"**
3. Copie a **Connection string** (selecione "Pooled connection")

### 4.3. Gerar Cookie Secret
Execute no terminal:
```bash
openssl rand -base64 32
```
Copie o resultado.

---

## Passo 5: Criar Tabelas no Neon

1. Vá em **"SQL Editor"** no menu lateral
2. Clique em **"New Query"**
3. Cole o conteúdo do arquivo `migration/setup-neon-complete.sql`
4. Clique em **"Run"**

---

## Passo 6: Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
# Neon Postgres
DATABASE_URL=postgresql://user:pass@host/neondb?sslmode=require

# Neon Auth
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=cole_o_secret_gerado_aqui
```

---

## Passo 7: Migrar Dados do Supabase

### Opção A: Script Python (Automático)
```bash
# 1. Edite migration/migrate_data.py com suas credenciais
# 2. Execute:
python3 migration/migrate_data.py
```

### Opção B: Manual (SQL Editor)
1. No Supabase, vá em **SQL Editor**
2. Execute cada query do `migration/export_supabase.sql`
3. Baixe os resultados como CSV
4. No Neon, importe cada CSV

---

## Passo 8: Criar Usuários no Neon Auth

Como o Neon Auth é independente, você precisa criar os usuários:

### Opção 1: Pela Interface do Neon
1. Vá em **"Auth"** → **"Users"**
2. Clique em **"Add User"**
3. Adicione email e senha

### Opção 2: Pelo Código (quando fizer login)
O Neon Auth cria usuários automaticamente no primeiro login.
Apenas garantimos que o registro existe na tabela `users`.

---

## Passo 9: Testar

1. Instale dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor:
   ```bash
   npm run dev
   ```

3. Acesse http://localhost:3000

4. Será redirecionado para `/auth/sign-in`

5. Faça login com o usuário criado no Neon Auth

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── auth/
│   │   ├── server.ts    # Configuração server-side do Neon Auth
│   │   └── client.ts    # Configuração client-side do Neon Auth
│   ├── db-helpers.ts    # Helpers para queries SQL
│   └── api-helpers.ts   # Helpers para API routes
├── middleware.ts        # Middleware do Neon Auth
├── app/
│   ├── auth/
│   │   └── [path]/
│   │       └── page.tsx # Páginas de login/cadastro
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...path]/
│   │   │       └── route.ts # API de autenticação
│   │   └── ...
│   └── layout.tsx       # Layout com NeonAuthUIProvider
├── contexts/
│   └── FinanceContext.tsx # Context com Neon Auth + Neon
```

---

## Checklist

- [ ] Conta criada no Neon
- [ ] Projeto criado
- [ ] Neon Auth habilitado
- [ ] Auth URL copiada
- [ ] Connection string copiada
- [ ] Cookie secret gerado
- [ ] Tabelas criadas no Neon
- [ ] Variáveis de ambiente configuradas
- [ ] Dados migrados do Supabase
- [ ] Usuários criados no Neon Auth
- [ ] Testes realizados

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| "Unauthorized" | Verifique se NEON_AUTH_BASE_URL está correto |
| "Invalid cookie" | Verifique se NEON_AUTH_COOKIE_SECRET tem 32+ caracteres |
| "User not found" | Crie o usuário no Neon Auth primeiro |
| "Table doesn't exist" | Execute o script SQL no Neon |
| Login não funciona | Verifique se Email/Password está habilitado no Neon Auth |

---

## Diferenças do Supabase

| Aspecto | Supabase | Neon Auth |
|---------|----------|-----------|
| Auth | Integrado | Integrado (Better Auth) |
| Database | Supabase PostgreSQL | Neon PostgreSQL |
| RLS | Sim | Não (código) |
| UI Components | Próprios | Better Auth UI |
| SDK | @supabase/supabase-js | @neondatabase/auth |

---

## Links Úteis

- [Neon Auth Docs](https://neon.com/docs/auth/overview)
- [Neon Auth Next.js Guide](https://neon.com/docs/auth/quick-start/nextjs-api-only)
- [Better Auth Docs](https://www.better-auth.com/docs)
