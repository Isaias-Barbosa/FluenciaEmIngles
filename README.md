# Fluência

Uma plataforma de estudos de idiomas que transforma o guia de inglês em uma experiência personalizada: a pessoa cria seu perfil, indica seu nível e objetivo e recebe uma trilha de aprendizagem com lições, exercícios, cards de vocabulário e acompanhamento de progresso.

## Executar localmente

Requisitos: Node.js 20.9 ou superior e um projeto Supabase.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Configure `.env.local` a partir de `.env.example` com o Project URL e a publishable key do projeto Supabase. Não use a `service_role` key no navegador.

## O que já funciona

- Cadastro e login por e-mail e senha com Supabase Auth.
- Área de estudos com trilha organizada nos níveis CEFR A1 a C2.
- Lições e cards carregados do banco Supabase.
- Exercícios com múltipla escolha, resposta digitada e áudio; o banco corrige respostas sem revelar o gabarito ao navegador.
- Tentativas e progresso sincronizados por usuário; a conclusão do nível libera o próximo.
- Perfis e progresso persistidos no Supabase.

## Preparar o Supabase

A estrutura do banco está em `supabase/migrations/`, organizada em migrations numeradas. A primeira cria idiomas e níveis CEFR, perfis ligados a `auth.users`, lições, questões, tentativas e o bucket público `lesson-audio`. A segunda publica as lições iniciais, adiciona os cards e as funções seguras de onboarding e correção.

Para preparar o projeto Supabase:

1. No painel, abra **SQL Editor** e execute as migrations em ordem. Se as duas primeiras já foram executadas, execute apenas `20261014192000_expand_beginner_elementary_questions.sql` para carregar o lote ampliado.
2. Em **Authentication → URL Configuration**, permita o endereço local `http://localhost:3000` e os endereços de produção que você usar.
3. Em **Authentication → Providers**, habilite e configure o provedor de e-mail/senha.
4. Configure `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, usando a publishable key do projeto.
5. Reinicie `npm run dev`.

As respostas corretas ficam em uma tabela sem acesso direto para os clientes; `submit_question_answer` valida a resposta e salva a tentativa do usuário autenticado. Questões publicadas são expostas sem gabarito. As políticas RLS isolam os perfis e tentativas por usuário. O bucket de áudio é público para reprodução dos arquivos das lições; mantenha uploads restritos à administração do conteúdo.

A migration `20261014192000_expand_beginner_elementary_questions.sql` amplia as trilhas para 50 questões Beginner/A1 e 75 Elementary/A2, distribuídas em lições curtas com múltipla escolha, respostas digitadas e escuta. As 25 questões de listening usam arquivos WAV incluídos em `public/audio/`; os arquivos novos são reproduzidos pelo próprio domínio da aplicação.

## Tecnologias

- Next.js com App Router
- React e TypeScript
- CSS responsivo sem biblioteca de componentes
- Supabase Auth, PostgreSQL e Storage

O arquivo `aprender-ingles.html` permanece no repositório como a versão original do guia estático.
