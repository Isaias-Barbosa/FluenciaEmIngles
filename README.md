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

“Não posso ouvir áudio agora” busca na internet uma nova questão de texto do nível atual, substituindo somente o exercício clicado. A alternativa é salva por usuário no mesmo ID e posição do exercício original; seu acerto conta no conjunto, na lição, no progresso e na elegibilidade da prova de avanço. A alternativa reaparece ao reabrir a lição ou atualizar a página. “Pedir à IA” continua bloqueado, identificado como recurso futuro.

### Feedback dos exercícios

O card mostra a questão atual, o total de acertos da lição (incluindo o progresso salvo), uma barra de conclusão e indicadores das questões acertadas/pendentes. Um acerto conta uma única vez, mesmo após várias tentativas. O resultado aparece assim que a correção é confirmada pelo servidor.

Os sons de acerto e erro são sintetizados localmente com Web Audio, em volume baixo e com duração inferior a meio segundo. O botão “Sons ligados/desligados” salva a preferência neste navegador; escolher “Não posso ouvir áudio agora” também desliga esses sons. Navegadores sem áudio continuam recebendo o feedback visual. Nenhuma chave ou serviço pago é necessário para esses efeitos.

Validação adicional: `node scripts/test-feedback-audio.cjs` e `node scripts/test-lesson-progress.cjs`.


### Substituição persistente com busca na internet

Antes do deploy, aplique `supabase/migrations/20261020140000_persistent_web_question_replacements.sql` no Supabase. Configure `OPENAI_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` somente no servidor/Vercel, junto das variáveis públicas Supabase já existentes. Nunca use prefixo `NEXT_PUBLIC_` nas chaves secretas. A busca usa Responses API com `web_search` obrigatório, modelo padrão `gpt-5.4-mini`; `OPENAI_WEB_QUESTION_MODEL` permite configurar outro modelo compatível com busca e saída estruturada.

O servidor sorteia um tema apropriado ao CEFR do perfil e pesquisa British Council/Cambridge English. A IA cria uma questão original a partir do material pesquisado; não copia exercícios completos. O card identifica a adaptação e mostra o link da fonte. A resposta só é aceita após uma chamada de busca concluída, validação do nível, quatro alternativas distintas e confirmação de que a URL consta nas fontes retornadas pela ferramenta. Isso não substitui revisão pedagógica humana. Busca e geração têm cobrança na API OpenAI.

A migration mantém as alternativas privadas por usuário e o gabarito inacessível ao navegador. A correção grava `question_attempts.question_id` no ID original, preservando os cinco espaços e o total de questões do nível. Há limite persistente de 20 buscas por hora/usuário, bloqueio de buscas simultâneas para o mesmo exercício e gravação idempotente. Reabrir uma alternativa já salva não gera outra cobrança. Se busca, validação ou gravação falharem, o exercício original permanece e o aluno pode tentar novamente; não há substituição silenciosa por outra lição. Trocar uma questão não concede acerto: o aluno precisa responder corretamente.

Testes: `node scripts/test-web-question.cjs`, `node scripts/test-question-replacement-api.cjs` e `node scripts/test-question-replacements-db.cjs` e `node scripts/test-replacement-flow.cjs`. O teste do banco usa PostgreSQL embarcado (PGlite, dependência de desenvolvimento) para verificar persistência, correção, permissões e conclusão do conjunto original.

### Verifique a Questão · curadoria CEFR no admin

No menu administrativo, **Verifique a Questão** permite colar um enunciado em inglês, informar alternativas/gabarito ou buscar 1 ou 5 perguntas do Open Trivia DB / The Trivia API. A fila mantém até 30 perguntas durante a sessão da página e permite revisar uma por vez. Buscas novas preservam o texto que está sendo editado; selecione a pergunta importada na fila. Alterações no enunciado/alternativas invalidam o resultado anterior. A fila não é persistida ao recarregar o navegador.

A análise é **local e gratuita, sem OpenAI ou outra IA generativa**: combina um índice lexical CEFR-J (A1–B2) / Octanove (C1–C2), regras gramaticais e estrutura de frases. A dificuldade de trivia (`easy/medium/hard`) não entra no cálculo. O painel mostra nível sugerido A1–C2, faixa aproximada, confiança heurística, evidências e palavras para revisar. Textos curtos ou com pouca cobertura podem não receber nível. Nomes e termos desconhecidos não viram C2 automaticamente.

O método é uma **heurística editorial não calibrada**, não um classificador oficial CEFR ou teste de proficiência. Sentidos de palavras, contexto e a tarefa exigida podem alterar o nível real. Um resultado com confiança moderada não tem precisão estatística conhecida; revise o nível e o gabarito antes de cadastrar. Fontes, licenças e regeneração dos dados: `lib/cefr/data/README.md`.

Depois da revisão, **Enviar para cadastro** prepara o formulário existente no nível escolhido, com alternativas, resposta e atribuição da fonte. Escolha a lição, acrescente a explicação e salve; a questão começa como **rascunho**. Não há publicação automática ou migração nova. A análise não altera o progresso dos alunos nem a busca OpenAI já existente no botão de substituir áudio.

As importações usam endpoints fixos no servidor, sem chave para os planos gratuitos. Open Trivia DB: **CC BY-SA 4.0**, intervalo mínimo de 5 segundos por IP (o servidor também aplica um limite por processo). The Trivia API: **CC BY-NC 4.0** no acesso gratuito, para uso não comercial; confira os planos/licenças do fornecedor se o produto for comercial. A atribuição acompanha o enunciado enviado ao cadastro, inclusive quando editado. As APIs fornecem trivia em inglês, não exercícios pedagógicos já classificados por CEFR.

O endpoint `POST /api/admin/question-review` exige sessão Supabase válida e e-mail em `ADMIN_EMAILS`, assim como o painel existente. Usa as variáveis Supabase/admin já configuradas; não precisa de uma chave de IA. Só administradores recebem os gabaritos das importações. Erros de fonte e limite de requisições mantêm a questão atual para uma nova tentativa.

Validação: `npm run test:question-review`, `npm run typecheck` e `npm run build`. Os testes cobrem regras A1–C2, entradas insuficientes, importação/codificação/licenças, erros e limites, autorização admin, revisão manual, invalidação de análise e envio do conteúdo. Esses testes verificam o comportamento do software e não medem a precisão pedagógica.
