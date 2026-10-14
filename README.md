# Fluência

Uma plataforma para aprender inglês no seu ritmo. Faça seu cadastro, escolha seu nível e pratique com lições, exercícios interativos, áudios e cards de vocabulário.

## Começar em 3 passos

### 1. Instale as dependências

Você precisa do **Node.js 20.9 ou superior** e de um projeto no [Supabase](https://supabase.com/).

```bash
npm install
```

### 2. Configure o Supabase

1. No painel do Supabase, abra **SQL Editor** e execute os arquivos em `supabase/migrations/`, na ordem do nome:
   - `20261014180000_initial_learning_schema.sql`
   - `20261014185500_publish_learning_content_and_progress.sql`
   - `20261014192000_expand_beginner_elementary_questions.sql`
   - `20261014195000_hints_and_flexible_answer_matching.sql`
   - `20261014196000_fix_answer_attempt_column_ambiguity.sql`
2. Em **Authentication → Providers**, habilite o cadastro por e-mail e senha.
3. Em **Authentication → URL Configuration**, adicione `http://localhost:3000` como endereço permitido. Adicione também o endereço de produção quando publicar o app.
4. Copie `.env.example` para `.env.local` e preencha os valores do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_SUPABASE_PUBLISHABLE_KEY
```

Use a **publishable key** (ou a chave `anon` legada). **Nunca coloque a `service_role` key em variáveis `NEXT_PUBLIC_*` nem no código do navegador.** O arquivo `.env.local` é ignorado pelo Git.

> Se as migrations já foram aplicadas, execute somente as que ainda não estão no projeto. Por exemplo, se você já aplicou até a migration de dicas, execute apenas `20261014196000_fix_answer_attempt_column_ambiguity.sql`.

### 3. Inicie a aplicação

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## O que você encontra na plataforma

- **Conta e perfil:** cadastro e login com Supabase Auth, além de uma configuração inicial de nível, objetivo e tempo de estudo.
- **Trilha de inglês:** conteúdo organizado nos níveis CEFR A1 a C2.
- **Exercícios:** múltipla escolha, respostas digitadas e questões de compreensão oral.
- **Listening:** áudios WAV no diretório `public/audio/`.
- **Cards:** vocabulário carregado de acordo com o nível atual.
- **Progresso:** tentativas e lições concluídas associadas à conta do estudante.
- **Dicas:** após cinco respostas incorretas na mesma questão, o estudante recebe uma pista.
- **Correção flexível:** diferenças de maiúsculas, pontuação e espaços não invalidam uma resposta equivalente.

O banco inclui **50 questões no Beginner (A1)** e **75 no Elementary (A2)**, além de questões iniciais para os níveis B1 a C2. A estrutura permite adicionar conteúdo e idiomas.

## Como funcionam as migrations

As migrations criam e preenchem o banco. Elas devem ser executadas **uma única vez, em ordem**, no SQL Editor do Supabase. Se uma execução falhar, confira a mensagem no painel antes de tentar novamente.

| Arquivo | O que prepara |
| --- | --- |
| `20261014180000_initial_learning_schema.sql` | Idiomas, níveis, perfis, lições, questões, tentativas e acesso seguro ao conteúdo |
| `20261014185500_publish_learning_content_and_progress.sql` | Funções de onboarding e correção, além das primeiras lições e cards |
| `20261014192000_expand_beginner_elementary_questions.sql` | Questões A1/A2 e questões com áudio |
| `20261014195000_hints_and_flexible_answer_matching.sql` | Dicas após cinco erros e correção tolerante a pontuação e espaços |
| `20261014196000_fix_answer_attempt_column_ambiguity.sql` | Correção da função de resposta para evitar ambiguidade entre nomes de colunas |

As respostas corretas não são disponibilizadas diretamente ao navegador. O Supabase corrige as respostas e registra as tentativas; políticas RLS protegem os perfis e o progresso de cada estudante.

## Comandos úteis

```bash
npm run dev        # Inicia o servidor de desenvolvimento
npm run typecheck  # Verifica os tipos TypeScript
npm run build      # Gera a versão de produção
npm run start      # Inicia a versão de produção
```

## Tecnologias

- Next.js com App Router
- React e TypeScript
- Supabase Auth, PostgreSQL e Storage
- CSS responsivo

O arquivo `aprender-ingles.html` permanece no repositório como a versão original do guia estático.
