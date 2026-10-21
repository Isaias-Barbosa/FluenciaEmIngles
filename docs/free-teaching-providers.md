# Gerar campos com provedores gratuitos

O botão do banco de reservas gera somente a explicação e a dica da questão atual. Não pesquisa na web, não importa perguntas e não publica automaticamente. A revisão humana continua necessária; uma IA não certifica nível CEFR nem garante a exatidão do gabarito.

## Ativação

1. Aplique `supabase/migrations/20261021200000_free_teaching_provider_router.sql` no Supabase.
2. Configure `SUPABASE_SERVICE_ROLE_KEY`, a autenticação e `ADMIN_EMAILS` existentes.
3. Configure as chaves desejadas de `.env.example` somente no servidor e reinicie/reimplante a aplicação. Funciona com um provedor; o rodízio usa apenas os habilitados.
4. Para Gemini, Groq e Cloudflare, use **contas/projetos gratuitos com cobrança paga desativada** e marque a respectiva variável `*_FREE_TIER_CONFIRMED=true`. A variável é uma confirmação do operador: a aplicação **não verifica o plano de cobrança da chave**. Esses serviços não oferecem aqui um parâmetro de requisição que garanta preço zero numa conta paga. Se ativar cobrança depois, desabilite o provedor antes.

| Provedor | Credenciais | Modelo fixo | Documentação |
| --- | --- | --- | --- |
| Gemini | `GEMINI_API_KEY`, confirmação gratuita | `gemini-3.1-flash-lite` | https://ai.google.dev/gemini-api/docs/pricing |
| Groq | `GROQ_API_KEY`, confirmação gratuita | `openai/gpt-oss-20b` | https://console.groq.com/docs/rate-limits |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter/free` | https://openrouter.ai/docs/guides/routing/routers/free-router |
| Cloudflare Workers AI | `CLOUDFLARE_AI_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (32 caracteres hexadecimais), confirmação gratuita | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | https://developers.cloudflare.com/workers-ai/platform/pricing/ |

No Cloudflare, crie um token com permissão Workers AI para a conta correspondente. O plano Workers Free tem franquia diária de 10.000 neurônios; tokens de texto e neurônios são unidades diferentes. O OpenRouter seleciona modelos gratuitos compatíveis com saída estruturada; disponibilidade e limites variam.

O gerador não usa `OPENAI_API_KEY` nem muda para modelos pagos. A narração de áudio continua com a configuração anterior e pode consumir créditos OpenAI independentemente deste gerador.

## Rodízio e limites

- Escolhe o provedor elegível usado há mais tempo, distribuindo chamadas entre serviços habilitados.
- Mantém contadores, pausas e uma reserva de execução por provedor no banco, compartilhados por administradores e instâncias. Uma reserva expira após 50 segundos se a execução cair.
- Aplica tetos locais conservadores de 100 tentativas/dia (UTC) e 2/minuto por provedor, ajustáveis pelas variáveis `TEACHING_PROVIDER_*_LIMIT`. São tetos da aplicação, não cotas oficiais nem medição de tokens. Tentativas que falham também contam. Uso da mesma chave em outros aplicativos não é contabilizado aqui.
- Em HTTP 429, respeita `Retry-After` (segundos ou data), ou `retryDelay` do Gemini; sem orientação, pausa por 15 minutos. Não insiste no mesmo serviço na mesma solicitação. Tenta outro provedor elegível.
- Erros de autenticação/créditos/modelo pausam por uma hora; falhas de rede, respostas inválidas e erros temporários pausam por um minuto. Chaves corrigidas podem aguardar essa pausa para retornar ao rodízio.
- Cada chamada externa tem até 9,5 segundos; a sequência tem orçamento de 40 segundos e no máximo uma tentativa por provedor. Ao esgotar as opções retorna erro e preserva os campos existentes. Uma nova tentativa deve aguardar a recuperação das cotas.
- Questão sinalizada como inconsistente ou dica revelando o gabarito interrompe a geração para revisão, sem procurar outro modelo que aprove o conteúdo.
- Sem a migração/configuração de coordenação, falha sem chamar as APIs. As tabelas e funções de coordenação são restritas ao serviço do servidor; nenhuma chave é gravada nelas.

Não se cria conta/chave extra para contornar cota nem se considera a assinatura do ChatGPT como crédito de API.

## Verificação

`npm run test:admin-workflow` cobre autenticação, adaptadores com HTTP simulado, troca de provedores, pausas, limites, persistência, permissões SQL e proteção contra reservas antigas. Os testes não consomem créditos reais. Execute também `npm run typecheck` e `npm run build`.

Documentação dos formatos: https://ai.google.dev/gemini-api/docs/generate-content/structured-output, https://console.groq.com/docs/structured-outputs e https://developers.cloudflare.com/workers-ai/features/json-mode/. Consulte preços/limites vigentes antes de habilitar cada conta.
