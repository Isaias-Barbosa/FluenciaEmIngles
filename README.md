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

“Não posso ouvir áudio agora” seleciona uma questão aprovada do banco de reservas do nível atual, substituindo somente o exercício clicado. A alternativa é salva por usuário no mesmo ID e posição do exercício original; seu acerto conta no conjunto, na lição, no progresso e na elegibilidade da prova de avanço. A alternativa reaparece ao reabrir a lição ou atualizar a página. “Pedir à IA” continua bloqueado, identificado como recurso futuro.

### Feedback dos exercícios

O card mostra a questão atual, o total de acertos da lição (incluindo o progresso salvo), uma barra de conclusão e indicadores das questões acertadas/pendentes. Um acerto conta uma única vez, mesmo após várias tentativas. O resultado aparece assim que a correção é confirmada pelo servidor.

Os sons de acerto e erro são sintetizados localmente com Web Audio, em volume baixo e com duração inferior a meio segundo. O botão “Sons ligados/desligados” salva a preferência neste navegador; escolher “Não posso ouvir áudio agora” também desliga esses sons. Navegadores sem áudio continuam recebendo o feedback visual. Nenhuma chave ou serviço pago é necessário para esses efeitos.

Validação adicional: `node scripts/test-feedback-audio.cjs` e `node scripts/test-lesson-progress.cjs`.


### Substituição persistente pelo banco de reservas

Antes do deploy, aplique as migrations em ordem, incluindo `supabase/migrations/20261020140000_persistent_web_question_replacements.sql` e a nova **`supabase/migrations/20261020180000_question_reserve.sql`**. Configure as variáveis Supabase/admin existentes (`SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_EMAILS` somente no servidor). A substituição de áudio **não precisa de OPENAI_API_KEY**, não consulta APIs de trivia no clique do aluno e não usa fallback pago. A chave OpenAI permanece opcional apenas para a voz de IA.

O menu admin **Banco de reservas** mostra totais por nível/estado, filtros, paginação e editor. As importações de Open Trivia DB/The Trivia API são persistidas como **Aguardando revisão**, com nível inicialmente sugerido pela heurística (ou sem nível, se não houver evidência suficiente). Reimportar um enunciado já existente não sobrescreve a edição ou aprovação anterior. Questões manuais também podem ser salvas pela tela Verifique a Questão. A deduplicação ignora caixa e espaços repetidos do enunciado.

Para disponibilizar uma questão, o administrador revisa o nível, as quatro alternativas e o gabarito, preenche explicação e dica e muda o estado para **Disponível**. **Arquivada** interrompe novas atribuições. A API exige uma sessão válida de um e-mail em `ADMIN_EMAILS`; alterações simultâneas são detectadas pelo timestamp do registro. Gabaritos, explicações e a reserva completa não são acessíveis aos alunos por tabela.

Ao clicar em “Não posso ouvir áudio agora”, uma transação no PostgreSQL deriva usuário e nível da sessão, valida a questão de áudio pendente/publicada e sorteia uma reserva disponível do mesmo nível. Não repete uma reserva já atribuída àquela pessoa, nem um enunciado regular que ela já respondeu, inclusive em tentativa incorreta. A reserva pode atender outros estudantes. Se não houver candidata, o exercício original permanece e a interface informa o estudante, sem cobrança ou acerto automático.

A cópia atribuída mantém **o ID e a posição do exercício original**. O gabarito fica privado; a correção grava o acerto naquele mesmo ID, preservando as cinco questões, missões e elegibilidade da prova de avanço. Reabrir ou atualizar a lição restaura a cópia salva. Edições/arquivamentos posteriores da reserva não alteram cópias já atribuídas. As alternativas antigas criadas pela busca OpenAI continuam válidas com sua origem identificada; os antigos procedimentos de busca permanecem apenas para compatibilidade histórica, sem uso pela aplicação.

Validação: `npm run test:reserve`, `node scripts/test-replacement-flow.cjs` e `node scripts/test-lesson-progress.cjs`. O teste de banco usa PostgreSQL embarcado (PGlite) para validar permissões, aprovação, seleção por nível, esgotamento, não repetição, snapshots, correção, restauração e cinco espaços de progresso estáveis.

### Verifique a Questão · curadoria CEFR no admin

No menu administrativo, **Verifique a Questão** permite colar um enunciado em inglês, informar alternativas/gabarito ou buscar 1 ou 5 perguntas do Open Trivia DB / The Trivia API. A fila mantém até 30 perguntas durante a sessão da página e permite revisar uma por vez. Buscas novas preservam o texto que está sendo editado; selecione a pergunta importada na fila. Alterações no enunciado/alternativas invalidam o resultado anterior. A fila de trabalho da tela não é persistida ao recarregar o navegador; as questões importadas ficam salvas no Banco de reservas.

A análise é **local e gratuita, sem OpenAI ou outra IA generativa**: combina um índice lexical CEFR-J (A1–B2) / Octanove (C1–C2), regras gramaticais e estrutura de frases. A dificuldade de trivia (`easy/medium/hard`) não entra no cálculo. O painel mostra nível sugerido A1–C2, faixa aproximada, confiança heurística, evidências e palavras para revisar. Textos curtos ou com pouca cobertura podem não receber nível. Nomes e termos desconhecidos não viram C2 automaticamente.

O método é uma **heurística editorial não calibrada**, não um classificador oficial CEFR ou teste de proficiência. Sentidos de palavras, contexto e a tarefa exigida podem alterar o nível real. Um resultado com confiança moderada não tem precisão estatística conhecida; revise o nível e o gabarito antes de cadastrar. Fontes, licenças e regeneração dos dados: `lib/cefr/data/README.md`.

Depois da revisão, **Enviar para cadastro** prepara o formulário existente no nível escolhido, com alternativas, resposta e atribuição da fonte. Escolha a lição, acrescente a explicação e salve; a questão começa como **rascunho**. Também é possível salvar a pergunta para revisão no **Banco de reservas**. Não há aprovação/publicação automática. As importações persistentes e a substituição pelo banco de reservas dependem da nova migration descrita acima.

As importações usam endpoints fixos no servidor, sem chave para os planos gratuitos. Open Trivia DB: **CC BY-SA 4.0**, intervalo mínimo de 5 segundos por IP (o servidor também aplica um limite por processo). The Trivia API: **CC BY-NC 4.0** no acesso gratuito, para uso não comercial; confira os planos/licenças do fornecedor se o produto for comercial. A atribuição acompanha o enunciado enviado ao cadastro, inclusive quando editado. As APIs fornecem trivia em inglês, não exercícios pedagógicos já classificados por CEFR.

O endpoint `POST /api/admin/question-review` exige sessão Supabase válida e e-mail em `ADMIN_EMAILS`, assim como o painel existente. Usa as variáveis Supabase/admin já configuradas; não precisa de uma chave de IA. Só administradores recebem os gabaritos das importações. Erros de fonte e limite de requisições mantêm a questão atual para uma nova tentativa.

Validação: `npm run test:question-review`, `npm run typecheck` e `npm run build`. Os testes cobrem regras A1–C2, entradas insuficientes, importação/codificação/licenças, erros e limites, autorização admin, revisão manual, invalidação de análise e envio do conteúdo. Esses testes verificam o comportamento do software e não medem a precisão pedagógica.

### Quiz de Inglês · vocabulário

O menu do estudante inclui **Quiz de Inglês**, com **610 questões de vocabulário**, frases de contexto em inglês e traduções em português. O banco reúne as 210 entradas originais e mais 400 questões baseadas em frases do Tatoeba, preservando todos os IDs anteriores. A distribuição atual é de 102 questões em A1, A2, B1 e B2 e 101 em C1 e C2. Os níveis do conteúdo são sugestões pedagógicas editoriais, sem certificação oficial CEFR. Cada rodada sorteia 10 perguntas distintas do nível escolhido e embaralha as quatro alternativas, sem serviços externos nem consumo de créditos de IA. O nível inicial acompanha o perfil, mas é possível escolher qualquer um dos seis para praticar.

O sorteio prioriza entradas ainda não sorteadas no ciclo atual. Depois de esgotar as entradas do nível, inicia outro ciclo aleatório. Quando o ciclo termina no meio de uma rodada, completa as dez perguntas com um novo sorteio, sem repetir uma entrada dentro dessa rodada. A sequência é salva ao iniciar a rodada em `fluencia-vocabulary-draws-v1:<userId>`, separada dos resultados e por nível. Assim, reinícios, rodadas abandonadas e recarregamentos não fazem o sorteio esquecer as questões já selecionadas, mas não concedem progresso. O sorteio não acompanha quais perguntas de uma rodada abandonada chegaram a ser abertas. Se o armazenamento falhar, mantém a rotação durante a sessão e mostra um aviso.

A resposta é conferida uma única vez, com feedback, significado e tradução. A tela mostra progresso, acertos, resultado final e revisão das respostas; permite jogar novamente ou trocar de nível. Os sons respeitam a mesma preferência dos exercícios, inclusive quando o aluno desliga áudio em outra seção. Encerrar uma rodada incompleta não registra resultado.

Melhor resultado e número de rodadas concluídas continuam salvos **neste navegador, separados por usuário e nível**, na chave de resultados existente. Não há sincronização de histórico do quiz entre dispositivos, alteração de missões ou efeito no nivelamento/provas. Navegação entre seções mantém a rodada em andamento; recarregar a página encerra a rodada, preservando os resultados concluídos e o histórico de sorteio.

Teste: `npm run test:quiz`. Verifica as 610 entradas, distribuição por nível, preservação integral das 210 originais, IDs/frases únicos, quatro alternativas distintas com uma correta, ciclos de sorteio, recuperação após recarregar, separação entre níveis/contas, expansão do banco, armazenamento bloqueado/cheio, prevenção de dupla pontuação e preservação dos resultados. `npm run test:journey` verifica a compatibilidade com os cards de Meu Progresso e Meu Perfil.

Para ampliar o conteúdo original, acrescente entradas ao final de cada nível em `lib/quiz/vocabulary.ts`, mantendo a ordem e os IDs das entradas existentes. Para lotes do Tatoeba, siga [o processo de importação e atribuição](lib/quiz/data/README.md). O histórico descarta IDs removidos e considera IDs novos como ainda não sorteados; não é necessário apagar o progresso ou executar uma migration. Atualize os totais esperados nos testes e revise os significados, distratores, exemplos, traduções e níveis pedagógicos.

O lote original de 210 questões não copia o PDF de conversação fornecido, que contém perguntas abertas sem gabarito único. O novo lote usa a API oficial do [Tatoeba](https://api.tatoeba.org/) para obter frases e, quando adequadas, traduções diretas em português sob CC BY 2.0 FR ou CC0 1.0. Significados e faixas pedagógicas são editoriais. Traduções preparadas para o projeto são identificadas como editoriais; as traduções da comunidade mantêm autor, ID e licença próprios. Os créditos acompanham a frase, o feedback e a revisão de respostas. O [Open Trivia DB](https://opentdb.com/api_config.php) oferece trivia em JSON sob CC BY-SA 4.0; conteúdo de conhecimentos gerais precisa ser avaliado antes de entrar em um quiz de aprendizagem de inglês. Nenhuma dessas fontes é consultada durante as rodadas: o lote revisado fica incorporado ao projeto. Não é necessário alterar banco, variáveis de ambiente ou resultados existentes.

### Meu Progresso e Meu Perfil

**Meu Progresso** reúne nível atual, questões acertadas, lições concluídas, quizzes concluídos e perguntas praticadas no Quiz. Os cards A1–C2 do Quiz mostram rodadas, perguntas, melhor nota e última nota. Os totais aproveitam o histórico local já existente (chave v1 por usuário), sem exigir que o estudante refaça quizzes. Uma rodada concluída equivale a dez perguntas praticadas; isso não representa dez palavras inéditas ou o total de acertos. Rodadas incompletas não entram na contagem.

Ao terminar um quiz, os resultados são disponibilizados imediatamente para os cards. A leitura também acompanha alterações de armazenamento em outras abas e o retorno do foco. O histórico do Quiz continua restrito a este navegador e a cada conta, sem sincronização entre dispositivos. Armazenamento bloqueado mostra um aviso/indicador de indisponibilidade em vez de um zero artificial.

O caminho A1–C2 e as barras do nível atual mostram a proporção real de questões publicadas acertadas, com IDs únicos. O nível escolhido no nivelamento não marca automaticamente níveis anteriores como concluídos. A chamada para a prova de avanço segue a regra existente de metade das questões do nível; não há nova regra de aprovação ou contabilização de missões.

**Meu Perfil** organiza identidade, nível, dados pessoais, objetivo e tempo diário em painéis responsivos, com resumo de estudo e quantidade de quizzes. O formulário mantém a gravação Supabase existente, com nome validado após remover espaços, e-mail somente para leitura, prevenção de envios duplicados, feedback de salvamento/erro e opção de desfazer alterações ainda não salvas. A meta em minutos é apresentada como objetivo de estudo, não como tempo medido.

Não há migration ou variável de ambiente nova para estas páginas. Testes: `npm run test:journey`, `npm run test:quiz`, `npm run typecheck` e `npm run build`.

### Feedbacks e progresso dos Cards

Aplique `supabase/migrations/20261021000000_feedback_and_flashcard_progress.sql` no projeto Supabase antes de usar estas funcionalidades.

- **Meu Perfil → Seu feedback:** envia mensagens de 10 a 3000 caracteres. A autoria vem da sessão autenticada; tentativas repetidas do mesmo envio não duplicam a mensagem.
- **Admin → Feedbacks:** lista autor, e-mail, mensagem e data, com paginação. O endpoint usa a configuração de administradores existente; estudantes não podem consultar os feedbacks de outras pessoas.
- **Cards:** as marcações Acertei/Para revisar são salvas na conta por ID do card. Embaralhar e reiniciar a navegação mantêm os totais. “Questões de revisão” mostra os cards para revisar e suas respostas; “Já aprendi” atualiza a marcação salva.
- A prova inicial mantém as respostas ao receber eventos de autenticação da mesma conta, como ao voltar para a janela. Sair ou trocar de conta limpa a prova em memória. Recarregar a página continua iniciando uma nova sessão da prova.

Validação: `npm run test:feedback`, `npm run test:journey`, `npm run typecheck` e `npm run build`.

### Lições por tentativa: mínimo de 3 em 5

Aplique `supabase/migrations/20261021120000_lesson_rounds.sql` antes de publicar esta atualização.

Cada questão tem um número de chances conforme o tipo, conforme a atualização de tentativas por questão abaixo. O estudante avança ao acertar ou esgotar essas chances. O resultado aparece após todas as questões e mostra acertos, erros e uma revisão das respostas. Nas lições de cinco questões, três acertos concluem a lição; dois ou menos exigem refazer as cinco com um placar novo. Para conjuntos de outro tamanho, o mínimo é 60%, arredondado para cima.

A tentativa é salva no Supabase e retomada ao reabrir a lição. A correção e a aprovação são calculadas no servidor, com isolamento por usuário e proteção contra respostas fora de ordem ou duplicadas. A troca de áudio por uma questão de texto mantém a mesma posição e conta normalmente na tentativa. Lições já concluídas pela regra anterior são preservadas. Os acertos individuais continuam registrados no histórico geral, mas somente uma tentativa aprovada conclui uma nova lição.

Execute `npm run test:lessons` para verificar a migration, as regras de aprovação, o progresso da tentativa, a retomada e o fluxo de substituição de áudio.

### Admin: biblioteca de questões e Gerar campos

Aplique `supabase/migrations/20261021180000_admin_question_batch_publication.sql` antes de usar a publicação em lote. A função é restrita ao servidor administrativo e atualiza o lote em uma transação: uma questão inválida impede a publicação de toda a seleção. A lição precisa estar publicada e o enunciado, alternativas, gabarito e áudio devem estar consistentes.

Em **Admin → Questões**, escolha um nível, busque por enunciado/lição e filtre por lição, status ou tipo. A tabela mostra 10 questões por página; os detalhes exibem enunciado completo, alternativas, gabarito e explicação. Selecione até 50 questões para publicar ou retornar a rascunho. Ao filtrar uma lição, é possível publicar a própria lição. **Adicionar conteúdo** abre os formulários existentes de criação de questão e lição. Publicar mantém os filtros e a paginação atuais.

Em **Banco de reservas → Revisar/editar → Gerar campos**, o servidor sugere explicação e dica em português com os dados atuais do editor. Agora usa rodízio entre **Gemini, Groq, OpenRouter e Cloudflare Workers AI**, conforme as chaves gratuitas habilitadas. Cotas, pausas e reservas de execução ficam no Supabase e são compartilhadas entre instâncias. Ao atingir um limite, respeita a pausa informada e tenta outro serviço; sem opções disponíveis, mantém os campos e pede para tentar mais tarde. Não usa OpenAI nem fallback para modelos pagos.

A geração não consulta a internet, não salva nem publica a questão. O resultado mostra o provedor utilizado e precisa de revisão e salvamento explícitos. Questões inconsistentes e dicas que revelam literalmente o gabarito interrompem a geração para revisão humana.

Antes de ativar, aplique `supabase/migrations/20261021200000_free_teaching_provider_router.sql` e configure as variáveis em `.env.example`. Gemini, Groq e Cloudflare exigem confirmação de conta/projeto gratuito com cobrança paga desativada: a aplicação não consegue verificar o plano da chave. Consulte [configuração, modelos e limites do gerador](docs/free-teaching-providers.md). A narração de áudio OpenAI permanece independente.

Validação: `npm run test:admin-workflow`, `npm run test:reserve`, `npm run typecheck` e `npm run build`. Os testes simulam respostas dos provedores sem consumir créditos reais.

### Pedir à IA nas lições

O botão antes de Conferir resposta oferece uma dica usando o rodízio gratuito já configurado. Cada aluno pode gerar uma dica a cada **40 minutos**, com controle no servidor para toda a conta. O contador indica quando poderá pedir outra; a última dica é restaurada na mesma questão sem nova chamada. Falhas de geração não consomem o intervalo e não alteram o progresso.

**Antes do deploy, aplique `supabase/migrations/20261021210000_student_question_ai_help.sql`**, além das migrações anteriores de lições e provedores. Não são necessárias novas chaves ou variáveis. A ajuda funciona nas lições, sem incluir provas/avaliação inicial. O servidor retorna somente a dica, mantendo o gabarito privado. Detalhes em [configuração do gerador](docs/free-teaching-providers.md). Testes: `npm run test:student-ai`.

### Tentativas por questão nas lições

Aplique `supabase/migrations/20261021220000_lesson_question_attempts.sql` antes do deploy desta versão. Múltipla escolha permite 2 tentativas, mostrando a dica após o primeiro erro e desabilitando a alternativa errada. Completar a frase permite 3 tentativas e mostra a dica após o segundo erro. Áudio e ordenar palavras continuam com uma tentativa; questões de texto que substituíram áudio seguem a regra de múltipla escolha.

O aluno avança ao acertar ou esgotar as chances. Um acerto dentro das chances vale um acerto na questão; esgotá-las vale um erro. Cada lição continua sendo avaliada pelo número de questões, exigindo no mínimo 3 de 5 acertos. As dicas automáticas são editoriais, sem chamada à IA nem consumo do uso de 40 minutos.

O banco salva cada tentativa e a dica liberada, mantendo as chances ao recarregar. Reenvios de rede são idempotentes; requisições concorrentes de abas desatualizadas não gastam tentativas extras. Uma nova rodada começa com as chances zeradas, preservando resultados antigos. O protocolo de envio mudou: após aplicar a migração e o deploy, atualize abas antigas. Validação: `npm run test:lessons` inclui os testes específicos de tentativas.
