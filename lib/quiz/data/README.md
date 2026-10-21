# Questões baseadas no Tatoeba

Este lote acrescenta **400 questões** às 210 originais. A1, A2, B1 e B2 recebem 67 questões cada; C1 e C2 recebem 66. As rodadas continuam com dez questões, com rotação por conta e nível no navegador.

## Origem e autoria

- API oficial: https://api.tatoeba.org/ — endpoints públicos `/v1/sentences`.
- Orientações de reutilização: https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus
- Recortes das respostas, incluindo texto original, idioma, proprietário registrado, licença, situação de aprovação, traduções e URL da consulta: `scripts/data/tatoeba-source-snapshot.json`.
- Seleção editorial, nível, palavra/expressão-alvo, significado no contexto e tradução escolhida ou preparada para o projeto: `scripts/data/tatoeba-quiz-selection.json`.
- Saída usada pela aplicação: `tatoeba.json`. A aplicação não consulta a API durante os jogos.

Cada frase em inglês é reproduzida do snapshot, sem reescrita. Traduções da comunidade são vinculadas diretamente à frase em inglês e mantêm texto, ID, autor/proprietário registrado e licença. Quando a tradução foi preparada para este projeto, a interface diz explicitamente **Tradução editorial da Fluência em Inglês**, em vez de atribuí-la a um colaborador do Tatoeba. O conteúdo editorial não é apresentado como tradução oficial do Tatoeba.

Os links na interface levam a `https://tatoeba.org/en/sentences/show/<ID>`, permitindo conferir o original e os créditos. Frases e traduções da comunidade usam a licença indicada em cada registro:

- **CC BY 2.0 FR**: https://creativecommons.org/licenses/by/2.0/fr/ — texto jurídico: https://creativecommons.org/licenses/by/2.0/fr/legalcode
- **CC0 1.0**: https://creativecommons.org/publicdomain/zero/1.0/

As traduções editoriais/adaptações deste lote são disponibilizadas sob **CC BY 2.0 FR**, com o crédito da frase original e atribuição adicional à Fluência em Inglês. Essas licenças se aplicam ao respectivo conteúdo, sem relicenciar o código independente da aplicação. Não há indicação de endosso do Tatoeba ou de seus colaboradores.

## Revisão e níveis

Tatoeba fornece frases e metadados, não questões prontas com gabarito nem classificação CEFR. Os significados e níveis foram selecionados editorialmente, usando como ponto de partida o vocabulário de referência já presente no projeto e considerando o sentido no exemplo. As faixas são aproximadas, destinadas à prática lexical, sem validação psicométrica ou certificação oficial. Uma frase pode ter gramática mais simples ou mais complexa do que a palavra-alvo.

A seleção exclui frases marcadas como não aprovadas, registros sem autoria/licença, traduções indiretas e exemplos com sentido incompatível com o significado proposto. Algumas palavras avançadas aparecem em mais de um contexto; o banco conta **questões distintas**, não promete 610 palavras diferentes. As alternativas são embaralhadas entre significados do nível, sem duplicar o significado correto.

## Reprodução e manutenção

```bash
node scripts/build-tatoeba-quiz.cjs          # gera a saída a partir dos arquivos revisados
node scripts/build-tatoeba-quiz.cjs --check  # verifica a saída sem alterá-la
npm run test:quiz
npm run test:journey
```

O gerador opera offline e valida as 400 questões, a distribuição, os textos, as licenças, os autores, as traduções diretas quando usadas, a presença exata da expressão-alvo e a ausência de exemplos duplicados. O hash do snapshot fica no arquivo gerado. Os testes também verificam a preservação das 210 questões antigas e a rotação por nível/conta.

Em um novo lote, obtenha exemplos e metadados pela API ou pelos exports oficiais, revise cada sentido e tradução, acrescente a seleção e os registros de origem e atualize as contagens esperadas no gerador/testes. Preserve os IDs existentes; eles identificam questões no histórico de sorteio. Nenhum gerador deve publicar automaticamente material sem essa revisão.
