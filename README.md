# Fluência em Inglês

Aprenda inglês com uma trilha feita para o seu nível — um passo de cada vez. Faça uma avaliação inicial, pratique com lições e áudios, acompanhe seu progresso e avance de A1 a C2.

## O que você encontra

- **Trilha por nível:** conteúdo organizado do iniciante (A1) ao proficiente (C2).
- **Lições interativas:** exercícios de múltipla escolha, respostas digitadas e compreensão oral.
- **Áudios e transcrições:** pratique listening; depois de cinco reproduções, você pode trocar o áudio pelo texto.
- **Vídeos curtos:** assista a vídeos do VoiceTube em um player integrado, conforme os níveis liberados na sua trilha.
- **Avaliações de proficiência:** uma prova inicial define seu ponto de partida; ao concluir um nível, faça uma prova de 10 questões e acerte pelo menos 7 para avançar.
- **Cards de vocabulário:** revise, embaralhe e acompanhe os cards do seu nível.
- **Seu progresso salvo:** lições concluídas e tentativas ficam associadas à sua conta.
- **Painel administrativo:** gerencie estudantes, lições, questões e vídeos sem expor operações administrativas no navegador.

## Comece a usar

### Pré-requisitos

- Node.js **20.9 ou superior**
- npm
- Um projeto no [Supabase](https://supabase.com/)

### 1. Baixe o projeto e instale as dependências

```bash
git clone https://github.com/Isaias-Barbosa/FluenciaEmIngles.git
cd FluenciaEmIngles
npm install
```

### 2. Configure o Supabase

No painel do Supabase:

1. Abra **Authentication → Providers** e habilite o cadastro por e-mail e senha.
2. Em **Authentication → URL Configuration**, defina **Site URL** como `https://fluencia-em-ingles.vercel.app/learn`. Em **Redirect URLs**, adicione `https://fluencia-em-ingles.vercel.app/learn`. Para desenvolvimento local, adicione separadamente `http://localhost:3000/learn`; não deixe localhost como Site URL de produção. O cadastro envia a origem atual com `/learn` em `emailRedirectTo`, que precisa estar nesta lista.
3. Abra o **SQL Editor** e execute, em ordem, as migrations que ainda não foram aplicadas. A lista e o objetivo de cada arquivo estão em [Migrations do banco](#migrations-do-banco).

Se a confirmação de e-mail redirecionar para localhost, confira essas configurações e o template **Confirm signup** em **Authentication → Email Templates**: o link de confirmação padrão deve usar `{{ .ConfirmationURL }}`, sem localhost fixo. Após salvar, solicite um novo e-mail de confirmação; mensagens já enviadas podem conter o destino antigo. Se o e-mail já estiver confirmado, basta entrar na plataforma pelo domínio de produção.

Crie o arquivo `.env.local` a partir de `.env.example` e preencha as chaves do seu projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_SUPABASE_PUBLISHABLE_KEY
```

Para habilitar o painel em `/admin`, acrescente também:

```env
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
ADMIN_EMAILS=seu-email@exemplo.com,outro-admin@exemplo.com
```

`ADMIN_EMAILS` aceita uma lista de e-mails separados por vírgula. A chave `SUPABASE_SERVICE_ROLE_KEY` é usada exclusivamente no servidor: **nunca** a coloque em uma variável `NEXT_PUBLIC_*`, no código do navegador ou no Git. O arquivo `.env.local` é ignorado pelo Git.

> Não execute novamente uma migration que já foi aplicada. Se o projeto já está configurado, rode apenas os arquivos que ainda faltam, na ordem indicada abaixo.

### 3. Inicie a aplicação

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), crie sua conta e faça a avaliação inicial.

| Página | Para que serve |
| --- | --- |
| `/` | Página inicial |
| `/learn` | Lições, vídeos, cards, avaliações e perfil do estudante |
| `/admin` | Gerenciamento administrativo; requer um e-mail autorizado em `ADMIN_EMAILS` |

## Gerencie vídeos no painel

1. Entre com uma conta cujo e-mail esteja em `ADMIN_EMAILS` e abra `/admin`.
2. Selecione **Vídeos** no menu e escolha o nível.
3. Cole a URL pública de um vídeo do VoiceTube, como `https://www.voicetube.com/videos/198652`.
4. O painel verifica a página e preenche o título e a duração. Para ser aceito, o vídeo precisa ter entre **1 e 20 minutos**.
5. Revise o rascunho e publique-o quando estiver pronto.

Vídeos publicados aparecem aos estudantes quando o respectivo nível está liberado. Ao selecionar **Assistir vídeo**, o player abre em um modal; se o VoiceTube impedir a reprodução incorporada ou o player não carregar, o modal oferece um link para abrir o vídeo no próprio VoiceTube.

## Migrations do banco

Execute os arquivos SQL abaixo pelo **SQL Editor do Supabase**, do mais antigo para o mais recente. Cada migration deve ser aplicada uma única vez.

| Arquivo | O que prepara |
| --- | --- |
| `20261014180000_initial_learning_schema.sql` | Estrutura inicial: idiomas, níveis, perfis, lições, questões, respostas e tentativas; também configura permissões e dados-base. |
| `20261014185500_publish_learning_content_and_progress.sql` | Publicação de conteúdo, progresso, onboarding e funções de correção. |
| `20261014192000_expand_beginner_elementary_questions.sql` | Expande as questões dos níveis A1 e A2. |
| `20261014195000_hints_and_flexible_answer_matching.sql` | Adiciona dicas após tentativas incorretas e correção flexível de respostas. |
| `20261014196000_fix_answer_attempt_column_ambiguity.sql` | Corrige a função de resposta para evitar ambiguidade de nomes de colunas. |
| `20261014197000_allow_placement_level_updates.sql` | Protege as atualizações de nível recomendadas pela avaliação de proficiência. |
| `20261014198000_import_english_workbook_questions.sql` | Importa questões do material de inglês para revisão antes da publicação. |
| `20261014199000_import_advanced_english_workbook_questions.sql` | Importa questões avançadas para C1 e C2 como rascunhos. |
| `20261014200000_import_b2_english_workbook_questions.sql` | Importa questões de nível B2 como rascunhos. |
| `20261014201000_import_listening_practice_all_levels.sql` | Importa 120 exercícios de compreensão oral, 20 por nível, com áudios em `public/audio/listening/`. |
| `20261014202000_admin_user_management.sql` | Adiciona funções administrativas seguras para gerenciar contas e progresso. |
| `20261014203000_import_flashcards_1200.sql` | Importa 1.200 cards de vocabulário, 200 para cada nível A1–C2. |
| `20261014210000_proficiency_exams.sql` | Cria o banco de questões e as sessões das avaliações inicial e de avanço. |
| `20261014213000_allow_placement_review.sql` | Permite refazer a avaliação de proficiência pelo perfil. |
| `20261014215000_learning_videos.sql` | Cria a biblioteca de vídeos por nível e cadastra os vídeos iniciais. |
| `20261014220000_get_listening_transcript.sql` | Adiciona o acesso autenticado à transcrição de uma questão de áudio. |

As questões importadas das migrations de materiais didáticos começam como rascunhos. Revise-as no painel e publique apenas o conteúdo que deseja disponibilizar. Os 120 áudios de listening ficam em `public/audio/listening/`; inclua os arquivos locais no deploy.

## Comandos úteis

Para aceitar vídeos de até 20 minutos, aplique [20261016000000_learning_videos_ten_minutes.sql](supabase/migrations/20261016000000_learning_videos_ten_minutes.sql) e depois [20261016010000_learning_videos_twenty_minutes.sql](supabase/migrations/20261016010000_learning_videos_twenty_minutes.sql). O intervalo permitido é de 60 a 1200 segundos, inclusive. O vídeo continua hospedado no VoiceTube; o banco armazena apenas a URL e os metadados.

A migration [20261015010000_promotion_half_questions.sql](supabase/migrations/20261015010000_promotion_half_questions.sql) deve ser aplicada no Supabase para liberar a prova após concluir corretamente metade das questões publicadas do nível (arredondando para cima). Novas questões publicadas recalculam esse limite; tentativas repetidas não aumentam a contagem. A prova continua exigindo 7 acertos em 10 para avançar. C2 permanece como último nível, sem prova de avanço.

Execute `node scripts/test-promotion.cjs` para verificar os limites de desbloqueio usados pela interface.

As migrations [20261015020000_placement_only_onboarding.sql](supabase/migrations/20261015020000_placement_only_onboarding.sql) e [20261015021000_reading_comprehension.sql](supabase/migrations/20261015021000_reading_comprehension.sql) restringem a prova inicial ao cadastro e publicam 100 questões de interpretação (20 em cada nível de A1 a C1). Aplique ambas antes de publicar esta versão. Cada texto tem cinco questões e aparece em um bloco destacado; o perfil não oferece mais a avaliação inicial. O progresso de cada exercício conta questões distintas respondidas corretamente.

O conteúdo original fica em [reading-content.cjs](scripts/reading-content.cjs). `node scripts/generate-reading-migration.cjs` valida sua distribuição e gera a migration. `node scripts/test-study-pagination.cjs` verifica o carregamento completo de listas acima de mil registros.

```bash
npm run dev        # Inicia o servidor de desenvolvimento
npm run typecheck  # Verifica os tipos TypeScript
npm run build      # Gera a versão de produção
npm run start      # Inicia a versão de produção
```

## Tecnologias

- [Next.js](https://nextjs.org/) com App Router
- React e TypeScript
- Supabase Auth, PostgreSQL e Storage
- CSS responsivo

O conteúdo da página inicial também está em `aprender-ingles.html`; a aplicação Next.js usa esse conteúdo na rota `/`.

### Player de escuta e voz de IA

Configure `OPENAI_API_KEY` no ambiente do servidor (na Vercel, Settings → Environment Variables) e faça um novo deploy para habilitar a narração `gpt-4o-mini-tts`, voz `marin`. A integração usa a função existente `get_listening_transcript`; não é necessária uma nova migration. A API só aceita IDs de questões de escuta publicadas e exige uma sessão Supabase válida. A chave nunca é enviada ao navegador. A geração usa a API paga da OpenAI.

O player prepara a voz no primeiro clique, permite pausar, repetir, navegar e selecionar 0,75×, 1×, 1,25× ou 1,5×. Se a voz de IA estiver indisponível, reproduz o arquivo original e informa o estudante. O cache é limitado à instância do servidor, com deduplicação de pedidos simultâneos; limites de geração também são por instância, não uma cota global de cobrança.

“Não posso ouvir áudio agora” substitui as questões de áudio pendentes na sessão por questões de texto do mesmo nível, priorizando as ainda não concluídas e evitando duplicatas. Preserva quantidade e progresso; questões de áudio removidas continuam pendentes na trilha original. A alteração vale até fechar a sessão. “Pedir à IA” fica bloqueado, identificado como recurso futuro.

### Feedback dos exercícios

O card mostra a questão atual, o total de acertos da lição (incluindo o progresso salvo), uma barra de conclusão e indicadores das questões acertadas/pendentes. Um acerto conta uma única vez, mesmo após várias tentativas. O resultado aparece assim que a correção é confirmada pelo servidor.

Os sons de acerto e erro são sintetizados localmente com Web Audio, em volume baixo e com duração inferior a meio segundo. O botão “Sons ligados/desligados” salva a preferência neste navegador; escolher “Não posso ouvir áudio agora” também desliga esses sons. Navegadores sem áudio continuam recebendo o feedback visual. Nenhuma chave ou serviço pago é necessário para esses efeitos.

Validação adicional: `node scripts/test-feedback-audio.cjs` e `node scripts/test-lesson-progress.cjs`.
