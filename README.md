# Fluência

Uma plataforma para aprender inglês no seu ritmo. Faça seu cadastro, descubra seu nível com uma avaliação de proficiência e pratique com lições, exercícios interativos, áudios e cards de vocabulário.

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
   - `20261014197000_allow_placement_level_updates.sql`
   - `20261014198000_import_english_workbook_questions.sql`
   - `20261014199000_import_advanced_english_workbook_questions.sql`
   - `20261014200000_import_b2_english_workbook_questions.sql`
2. Em **Authentication → Providers**, habilite o cadastro por e-mail e senha.
3. Em **Authentication → URL Configuration**, adicione `http://localhost:3000` como endereço permitido. Adicione também o endereço de produção quando publicar o app.
4. Copie `.env.example` para `.env.local` e preencha os valores do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_SUPABASE_PUBLISHABLE_KEY
```

Use a **publishable key** (ou a chave `anon` legada). **Nunca coloque a `service_role` key em variáveis `NEXT_PUBLIC_*` nem no código do navegador.** O arquivo `.env.local` é ignorado pelo Git.

> Se as migrations já foram aplicadas, execute somente as que ainda não estão no projeto. Por exemplo, se você já aplicou até `20261014196000_fix_answer_attempt_column_ambiguity.sql`, execute `20261014197000_allow_placement_level_updates.sql`.

Para habilitar o painel administrativo em `/admin`, configure `SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_EMAILS` no `.env.local`. Informe os e-mails autorizados separados por vírgula em `ADMIN_EMAILS`. A service-role key é usada somente no servidor: nunca a coloque em uma variável `NEXT_PUBLIC_*`, no código do navegador ou no Git.

### 3. Inicie a aplicação

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para acessar a página inicial. Clique em **Começar Agora** para criar sua conta ou em **Entrar** para fazer login. Depois do cadastro, novos estudantes respondem a uma avaliação de 18 questões que define automaticamente o nível inicial antes de liberar as lições.

## O que você encontra na plataforma

- **Conta e perfil:** cadastro e login com Supabase Auth, avaliação obrigatória de proficiência para novos estudantes e configuração de objetivo e tempo de estudo.
- **Trilha de inglês:** conteúdo organizado nos níveis CEFR A1 a C2.
- **Exercícios:** múltipla escolha, respostas digitadas e questões de compreensão oral.
- **Listening:** áudios WAV no diretório `public/audio/`.
- **Cards:** vocabulário carregado de acordo com o nível atual.
- **Progresso:** tentativas e lições concluídas associadas à conta do estudante.
- **Perfil:** consulte e atualize seu nome, objetivo e tempo diário de estudo; veja também seu nível e progresso.
- **Teste de nível:** novos estudantes respondem a uma avaliação de 18 questões corrigida pelo Supabase; o nível recomendado é aplicado antes de liberar a trilha. Estudantes já cadastrados podem refazer a avaliação pelo perfil e escolher se querem aplicar o resultado.
- **Administração:** dashboard com usuários ativos (atividade nos últimos 30 dias), questões por nível, lista de estudantes e criação/publicação de lições e questões em `/admin`. O acesso é restrito aos e-mails configurados em `ADMIN_EMAILS`.
- **Banco de questões:** migrations opcionais importam 95 questões do caderno geral, 120 do caderno B2 Upper-Intermediate e 150 do caderno avançado, classificadas por nível CEFR e dificuldade fácil, intermediária ou difícil. As lições importadas começam como rascunho para revisão antes da publicação.
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
| `20261014197000_allow_placement_level_updates.sql` | Corrige o teste de nivelamento com segurança e permite aplicar o nível recomendado ao perfil |
| `20261014198000_import_english_workbook_questions.sql` | Adiciona dificuldade às questões e importa 95 enunciados do caderno como rascunhos A1–B1 |
| `20261014199000_import_advanced_english_workbook_questions.sql` | Importa 150 questões avançadas como rascunhos: 75 para C1 e 75 para C2, incluindo respostas abertas e níveis de dificuldade |
| `20261014200000_import_b2_english_workbook_questions.sql` | Importa 120 questões do caderno B2 Upper-Intermediate como rascunhos, incluindo 90 de múltipla escolha e 30 de completar frases |

O PDF fornecido não contém os enunciados 19, 20 e 98–100. As questões abertas 86, 96 e 97 também ficam como rascunhos, pois o próprio gabarito as identifica como exemplos/respostas pessoais.
O caderno avançado contém as 150 questões e seus gabaritos. A migration divide o conteúdo igualmente entre C1 e C2; revise as lições em rascunho no painel administrativo antes de publicá-las.
O caderno B2 contém 120 questões com gabarito. A migration as organiza em quatro lições de nível B2, todas como rascunho para revisão antes da publicação.

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

O conteúdo e o visual da página inicial em `aprender-ingles.html` são exibidos na rota `/`; a plataforma de estudos e autenticação fica em `/learn`.
